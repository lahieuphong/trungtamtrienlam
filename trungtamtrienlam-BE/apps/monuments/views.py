import json
import os
import unicodedata

from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authentication.models import Role, UserRole
from core.response import ResponseServer

from .models import Monument, MonumentFile, MonumentHistory, MonumentSection
from .serializers import (
    PENDING_LEVEL_NAMES,
    serialize_monument,
    serialize_monument_file,
    serialize_monument_history,
    serialize_monument_section,
)


IMAGE_EXTENSIONS = {'.png', '.jpeg', '.jpg', '.bmp', '.gif', '.webp', '.svg', '.arw', '.dng'}
VIDEO_EXTENSIONS = {'.m4a', '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'}
DOCUMENT_EXTENSIONS = {'.docx', '.pdf', '.xls', '.xlsx', '.doc'}
MODEL_3D_EXTENSIONS = {'.stl', '.obj', '.fbx', '.gltf', '.glb'}
SOUND_EXTENSIONS = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.aiff', '.opus'}
ALL_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | DOCUMENT_EXTENSIONS | MODEL_3D_EXTENSIONS | SOUND_EXTENSIONS

FILE_BUCKETS = {
    'fileAvatars': MonumentFile.Mode.IMAGE_AVATAR,
    'fileAvatar2s': MonumentFile.Mode.IMAGE_AVATAR_2,
    'fileImageObjects': MonumentFile.Mode.IMAGE_OBJECT,
    'fileImageDetails': MonumentFile.Mode.IMAGE_DETAIL,
    'fileVideos': MonumentFile.Mode.FILE_VIDEO,
    'fileModel3Ds': MonumentFile.Mode.FILE_MODEL_3D,
    'fileStructures': MonumentFile.Mode.FILE_STRUCTURE,
    'fileImageTechs': MonumentFile.Mode.IMAGE_TECH,
    'fileMaps': MonumentFile.Mode.FILE_MAP,
    'fileRecognitionDecisions': MonumentFile.Mode.FILE_RECOGNITION_DECISION,
    'fileRatings': MonumentFile.Mode.FILE_RATING,
}

PRIVATE_REQUIRED_FILE_BUCKETS = {
    'fileAvatar2s': (MonumentFile.Mode.IMAGE_AVATAR_2, 'Vui lòng chọn hình đại diện'),
    'fileStructures': (MonumentFile.Mode.FILE_STRUCTURE, 'Vui lòng chọn tệp kiến trúc'),
    'fileImageTechs': (MonumentFile.Mode.IMAGE_TECH, 'Vui lòng chọn hình ảnh bản vẽ kỹ thuật'),
    'fileMaps': (MonumentFile.Mode.FILE_MAP, 'Vui lòng chọn bản đồ khoanh vùng'),
}

SECTION_TYPES_WITH_IMAGE = {
    MonumentSection.SectionType.IMAGE,
    MonumentSection.SectionType.IMAGE_CONTENT,
    MonumentSection.SectionType.CONTENT_IMAGE,
}

REQUIRED_COMMON_FIELDS = {
    'name': 'Vui lòng nhập tên di tích',
    'recognitionDecision': 'Vui lòng nhập quyết định công nhận',
    'address': 'Vui lòng nhập địa chỉ',
    'yearOfConstruction': 'Vui lòng nhập năm xây dựng',
    'rating': 'Vui lòng chọn xếp hạng',
    'location': 'Vui lòng nhập vị trí',
}


def _as_int(value, default=None):
    if value in (None, ''):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _get_data_value(data, *names, default=''):
    for name in names:
        value = data.get(name)
        if value not in (None, ''):
            return value
    return default


def _parse_id_set(data, *names):
    for name in names:
        raw_value = data.get(name)
        if raw_value in (None, ''):
            continue

        if isinstance(raw_value, str):
            try:
                value = json.loads(raw_value)
            except json.JSONDecodeError:
                value = [raw_value]
        elif isinstance(raw_value, (list, tuple, set)):
            value = raw_value
        else:
            value = [raw_value]

        return {str(item).strip() for item in value if str(item or '').strip()}
    return set()


def _delete_file_field(file_field):
    if not file_field:
        return

    try:
        file_name = file_field.name
        storage = file_field.storage
    except (AttributeError, ValueError):
        return

    if not file_name:
        return

    try:
        storage.delete(file_name)
    except Exception:
        pass


def _delete_monument_file_records(files):
    for item in list(files):
        _delete_file_field(item.file)
        item.delete()


def _delete_monument_files(monument, file_ids, user):
    if not file_ids:
        return

    _delete_monument_file_records(monument.files.filter(id__in=file_ids))


def _delete_replaced_bucket_files(monument, request, deleted_file_ids=None):
    deleted_file_ids = set(deleted_file_ids or [])
    for bucket, mode in FILE_BUCKETS.items():
        if not request.FILES.getlist(bucket):
            continue

        files = monument.files.filter(mode=mode)
        if deleted_file_ids:
            files = files.exclude(id__in=deleted_file_ids)
        _delete_monument_file_records(files)


def _extension(filename):
    return os.path.splitext(filename or '')[1].lower()


def _file_type(filename):
    ext = _extension(filename)
    if ext in IMAGE_EXTENSIONS:
        return MonumentFile.FileType.IMAGE
    if ext in SOUND_EXTENSIONS:
        return MonumentFile.FileType.SOUND
    if ext in VIDEO_EXTENSIONS:
        return MonumentFile.FileType.VIDEO
    if ext in DOCUMENT_EXTENSIONS:
        return MonumentFile.FileType.DOCUMENT
    if ext in MODEL_3D_EXTENSIONS:
        return MonumentFile.FileType.THREE_D
    return MonumentFile.FileType.OTHER


def _validate_file(file_obj, bucket_name=None):
    ext = _extension(getattr(file_obj, 'name', ''))
    if ext not in ALL_EXTENSIONS:
        return f'Đuôi tệp {ext or "(không xác định)"} chưa được hỗ trợ'
    if bucket_name == 'fileModel3Ds' and ext not in MODEL_3D_EXTENSIONS:
        return 'Định dạng 3D chỉ hỗ trợ .stl, .obj, .fbx, .gltf, .glb'
    return None


def _normalize_role_text(value):
    text = unicodedata.normalize('NFD', str(value or ''))
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
    return text.replace('đ', 'd').replace('Đ', 'D').lower()


def _role_level_aliases(user, roles):
    levels = set()
    role_text = ' '.join([getattr(user, 'position', '') or '', *[role.name or '' for role in roles]])
    normalized = _normalize_role_text(role_text)

    if any(role.is_vice_director for role in roles) or 'pho giam doc' in normalized:
        levels.add(2)
    if any(role.is_director for role in roles) or ('giam doc' in normalized and 'pho giam doc' not in normalized):
        levels.add(1)
    if 'truong phong' in normalized:
        levels.add(3)
    if 'nhan vien' in normalized:
        levels.add(4)

    return levels


def _user_roles(user):
    if not user or not user.is_authenticated:
        return Role.objects.none()
    return Role.objects.filter(
        role_users__user=user,
        is_deleted=False,
        is_disabled=False,
    ).distinct()


def _role_flags(user):
    roles = list(_user_roles(user))
    levels = {role.level for role in roles} | _role_level_aliases(user, roles)
    return {
        'roles': roles,
        'levels': levels,
        'is_admin': bool(getattr(user, 'is_superuser', False) or any(role.is_admin for role in roles)),
        'is_director': any(role.is_director for role in roles) or 1 in levels,
        'is_vice_director': any(role.is_vice_director for role in roles) or 2 in levels,
    }


def _can_act_at_level(user, level):
    flags = _role_flags(user)
    return flags['is_admin'] or (level is not None and level in flags['levels'])


def _can_view(user, monument):
    flags = _role_flags(user)
    if flags['is_admin']:
        return True
    if monument.user_id == user.id:
        return True
    if monument.status in (Monument.Status.APPROVED, Monument.Status.PUBLISHED):
        return True
    return _can_act_at_level(user, monument.pending_level)


def _permission_for(user, monument):
    flags = _role_flags(user)
    is_owner = monument.user_id == user.id
    is_admin = flags['is_admin']
    can_current_level = _can_act_at_level(user, monument.pending_level)
    can_request_from_owner = is_owner and monument.status in (
        Monument.Status.DRAFT,
        Monument.Status.REDO,
        Monument.Status.NOT_APPROVED,
    )
    can_forward = (
        monument.status == Monument.Status.PENDING_APPROVAL
        and monument.pending_level in (3, 2)
        and can_current_level
    )
    can_final_approve = (
        monument.status == Monument.Status.PENDING_APPROVAL
        and monument.pending_level == 1
        and can_current_level
    )
    is_pending_approval = monument.status == Monument.Status.PENDING_APPROVAL
    can_admin_request = is_admin and (
        monument.status in (Monument.Status.DRAFT, Monument.Status.REDO, Monument.Status.NOT_APPROVED)
        or (is_pending_approval and monument.pending_level in (3, 2))
    )
    can_review_current_step = is_pending_approval and (can_current_level or is_admin)
    can_manage_after_approval = monument.status == Monument.Status.APPROVED and (flags['is_director'] or is_admin)

    return {
        'isView': _can_view(user, monument),
        'isDelete': is_admin or (is_owner and monument.status in (Monument.Status.DRAFT, Monument.Status.NOT_APPROVED)),
        'isUpdate': is_admin or (is_owner and monument.status in (Monument.Status.DRAFT, Monument.Status.REDO, Monument.Status.NOT_APPROVED)),
        'isApprove': can_final_approve or (is_admin and is_pending_approval and monument.pending_level == 1),
        'isNotApprove': can_review_current_step or can_manage_after_approval,
        'isRedo': can_review_current_step or can_manage_after_approval,
        'isPublic': can_manage_after_approval,
        'isDirector': flags['is_director'] or is_admin,
        'isRequestApproval': can_request_from_owner or can_forward or can_admin_request,
    }

def _avatar_for(monument):
    avatar_mode = MonumentFile.Mode.IMAGE_AVATAR_2 if monument.type == Monument.ProfileType.PRIVATE else MonumentFile.Mode.IMAGE_AVATAR
    avatar = monument.files.filter(mode=avatar_mode, is_deleted=False).first()
    return avatar.file.name if avatar and avatar.file else None


def _serialize_detail(monument, user):
    files = list(monument.files.filter(is_deleted=False).order_by('created_at'))
    sections = list(monument.sections.filter(is_deleted=False).order_by('order', 'created_at'))
    histories = list(monument.histories.filter(is_deleted=False).order_by('-created_at'))
    pending_history = next((item for item in histories if item.confirmed_date is None and item.level == monument.pending_level), None)

    return {
        'monument': serialize_monument(monument, avatar=_avatar_for(monument)),
        'monumentFiles': [serialize_monument_file(item) for item in files],
        'monumentSections': [serialize_monument_section(item) for item in sections],
        'monumentHistories': [serialize_monument_history(item) for item in histories],
        'monumentHistoryLevel': serialize_monument_history(pending_history) if pending_history else None,
        'monumentHistoryLast': serialize_monument_history(histories[0]) if histories else None,
        'permission': _permission_for(user, monument),
    }


def _parse_sections(request):
    raw_sections = request.data.get('sections')
    if raw_sections:
        if isinstance(raw_sections, str):
            try:
                sections = json.loads(raw_sections)
            except json.JSONDecodeError:
                sections = []
        else:
            sections = raw_sections
        if isinstance(sections, list):
            return sections

    sections = []
    index = 0
    while f'sections[{index}][type]' in request.data or f'sections[{index}][content]' in request.data:
        sections.append({
            'id': request.data.get(f'sections[{index}][id]') or request.data.get(f'sections[{index}][ID]'),
            'type': request.data.get(f'sections[{index}][type]'),
            'content': request.data.get(f'sections[{index}][content]'),
            'order': request.data.get(f'sections[{index}][order]'),
            'fileKey': f'sections[{index}][file]',
        })
        index += 1
    return sections


def _section_file(request, section, index):
    for key in (
        section.get('fileKey'),
        f'sections[{index}][file]',
        f'sectionInserts[{index}][file]',
    ):
        if key:
            file_obj = request.FILES.get(key)
            if file_obj:
                return file_obj
    return None


def _validate_create_payload(request, sections, monument=None, existing_sections=None, deleted_file_ids=None, deleted_section_file_ids=None):
    errors = {}
    data = request.data
    existing_sections = existing_sections or {}
    deleted_file_ids = set(deleted_file_ids or [])
    deleted_section_file_ids = set(deleted_section_file_ids or [])

    def has_existing_file(mode):
        if not monument:
            return False
        queryset = monument.files.filter(mode=mode, is_deleted=False)
        if deleted_file_ids:
            queryset = queryset.exclude(id__in=deleted_file_ids)
        return queryset.exists()

    for field, message in REQUIRED_COMMON_FIELDS.items():
        if not _get_data_value(data, field):
            errors[field] = message

    if _as_int(_get_data_value(data, 'typeOfMonument'), None) not in {0, 1, 2}:
        errors['typeOfMonument'] = 'Vui lòng chọn loại di tích'
    if _as_int(_get_data_value(data, 'priorityMode'), None) not in {0, 1, 2}:
        errors['priorityMode'] = 'Vui lòng chọn chế độ ưu tiên'

    profile_type = _as_int(_get_data_value(data, 'type'), Monument.ProfileType.PUBLIC)
    if profile_type == Monument.ProfileType.PUBLIC:
        if not sections:
            errors['sections'] = 'Vui lòng thêm nội dung'
        for index, section in enumerate(sections):
            section_type = _as_int(section.get('type'), MonumentSection.SectionType.IMAGE)
            has_content = bool(str(section.get('content') or '').strip())
            file_obj = _section_file(request, section, index)
            existing_section_id = str(section.get('id') or '')
            existing_section = existing_sections.get(existing_section_id)
            has_existing_section_file = bool(existing_section and existing_section.file and existing_section_id not in deleted_section_file_ids)
            has_section_file = bool(file_obj or has_existing_section_file)
            if section_type in (MonumentSection.SectionType.CONTENT, MonumentSection.SectionType.IMAGE_CONTENT, MonumentSection.SectionType.CONTENT_IMAGE) and not has_content:
                errors[f'sections_{section.get("id") or index}_content'] = 'Vui lòng nhập nội dung section'
            if section_type in (MonumentSection.SectionType.IMAGE, MonumentSection.SectionType.IMAGE_CONTENT, MonumentSection.SectionType.CONTENT_IMAGE) and not has_section_file:
                errors[f'sections_{section.get("id") or index}_image'] = 'Vui lòng chọn hình ảnh section'

        if not request.FILES.getlist('fileAvatars') and not has_existing_file(MonumentFile.Mode.IMAGE_AVATAR):
            errors['fileAvatars'] = 'Vui lòng chọn hình đại diện'
        if not request.FILES.getlist('fileModel3Ds') and not has_existing_file(MonumentFile.Mode.FILE_MODEL_3D):
            errors['fileModel3Ds'] = 'Vui lòng chọn tệp 3D'
        if not request.FILES.getlist('fileImageDetails') and not has_existing_file(MonumentFile.Mode.IMAGE_DETAIL):
            errors['fileImageDetails'] = 'Vui lòng chọn hình ảnh chi tiết'
    else:
        if not _get_data_value(data, 'description'):
            errors['description'] = 'Vui lòng nhập nội dung'
        for bucket, (mode, message) in PRIVATE_REQUIRED_FILE_BUCKETS.items():
            if not request.FILES.getlist(bucket) and not has_existing_file(mode):
                errors[bucket] = message

    for bucket in FILE_BUCKETS:
        for file_obj in request.FILES.getlist(bucket):
            message = _validate_file(file_obj, bucket)
            if message:
                errors[bucket] = message
                break

    for index, section in enumerate(sections):
        file_obj = _section_file(request, section, index)
        if file_obj:
            message = _validate_file(file_obj)
            if message:
                errors[f'sections_{section.get("id") or index}_image'] = message

    return errors


def _create_history(monument, user, status, level=None, reason=None, confirmed_by=None):
    now = timezone.now()
    return MonumentHistory.objects.create(
        monument=monument,
        requested_by=user,
        requested_date=now,
        confirmed_by=confirmed_by,
        confirmed_date=now if confirmed_by else None,
        status=status,
        level=level,
        reason=reason,
        created_by=str(user.id),
    )


def _confirm_pending_history(monument, user):
    pending = monument.histories.filter(
        is_deleted=False,
        confirmed_date__isnull=True,
        level=monument.pending_level,
        status=MonumentHistory.Status.REQUESTED,
    ).order_by('-created_at').first()
    if pending:
        pending.confirmed_by = user
        pending.confirmed_date = timezone.now()
        pending.updated_by = str(user.id)
        pending.save(update_fields=['confirmed_by', 'confirmed_date', 'updated_by', 'updated_at'])


def _next_level_for_request(monument, user):
    if monument.status in (Monument.Status.DRAFT, Monument.Status.REDO, Monument.Status.NOT_APPROVED):
        return 3
    if monument.status == Monument.Status.PENDING_APPROVAL and monument.pending_level == 3:
        return 2
    if monument.status == Monument.Status.PENDING_APPROVAL and monument.pending_level == 2:
        return 1
    return None


class MonumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = max(_as_int(request.query_params.get('page'), 1), 1)
        page_size = max(_as_int(request.query_params.get('pageSize'), 20), 1)
        view = _as_int(request.query_params.get('view'), 0)
        sort = _as_int(request.query_params.get('sort'), None)
        level_type = _as_int(request.query_params.get('type'), None)

        queryset = Monument.objects.filter(is_deleted=False).prefetch_related('files')
        flags = _role_flags(request.user)

        if view == 1:
            queryset = queryset.filter(type=Monument.ProfileType.PUBLIC)
            if not flags['is_admin']:
                owner_workflow_statuses = [
                    Monument.Status.DRAFT,
                    Monument.Status.REDO,
                    Monument.Status.NOT_APPROVED,
                ]
                queryset = queryset.filter(
                    Q(status=Monument.Status.PENDING_APPROVAL, pending_level__in=flags['levels'])
                    | Q(user=request.user, status__in=owner_workflow_statuses)
                )
            else:
                owner_workflow_statuses = [
                    Monument.Status.DRAFT,
                    Monument.Status.REDO,
                    Monument.Status.NOT_APPROVED,
                ]
                queryset = queryset.filter(
                    Q(status=Monument.Status.PENDING_APPROVAL)
                    | Q(user=request.user, status__in=owner_workflow_statuses)
                )
        elif view == 2:
            queryset = queryset.filter(type=Monument.ProfileType.PRIVATE)
        else:
            queryset = queryset.filter(type=Monument.ProfileType.PUBLIC)

        if level_type in (0, 1, 2):
            queryset = queryset.filter(type_of_monument=level_type)

        if sort == 1:
            queryset = queryset.order_by('created_at')
        elif sort == 2:
            queryset = queryset.order_by(Lower('name').asc())
        elif sort == 3:
            queryset = queryset.order_by(Lower('name').desc())
        else:
            queryset = queryset.order_by('-created_at')

        total = queryset.count()
        start = (page - 1) * page_size
        monuments = queryset[start:start + page_size]

        monument_items = []
        for item in monuments:
            serialized = serialize_monument(item, avatar=_avatar_for(item))
            serialized['permission'] = _permission_for(request.user, item)
            monument_items.append(serialized)

        data = {
            'monuments': monument_items,
            'total': total,
        }
        return ResponseServer.success(data=data, message='Lấy danh sách di tích thành công')


class MonumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        monument_id = request.query_params.get('id')
        monument = Monument.objects.filter(id=monument_id, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        if not _can_view(request.user, monument):
            return ResponseServer.forbidden('Bạn không có quyền xem hồ sơ này')
        return ResponseServer.success(data=_serialize_detail(monument, request.user), message='Lấy chi tiết di tích thành công')


class MonumentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @transaction.atomic
    def post(self, request):
        sections = _parse_sections(request)
        errors = _validate_create_payload(request, sections)
        if errors:
            return ResponseServer.failure(message='Dữ liệu chưa hợp lệ', errors=errors)

        data = request.data
        monument = Monument.objects.create(
            name=_get_data_value(data, 'name'),
            recognition_decision=_get_data_value(data, 'recognitionDecision', 'recognition_decision'),
            address=_get_data_value(data, 'address'),
            description=_get_data_value(data, 'description'),
            year_of_construction=_get_data_value(data, 'yearOfConstruction', 'year_of_construction'),
            rating=str(_get_data_value(data, 'rating')),
            location=_get_data_value(data, 'location'),
            type_of_monument=_as_int(_get_data_value(data, 'typeOfMonument', 'type_of_monument'), 0),
            priority_mode=_as_int(_get_data_value(data, 'priorityMode', 'priority_mode'), 0),
            type=_as_int(_get_data_value(data, 'type'), Monument.ProfileType.PUBLIC),
            status=Monument.Status.DRAFT,
            user=request.user,
            created_by=str(request.user.id),
        )

        _save_sections(request, monument, sections, request.user)
        _save_files(request, monument, request.user)

        if _as_bool(_get_data_value(data, 'submitForApproval')):
            _request_next(monument, request.user)

        return ResponseServer.success(
            data={'monument': serialize_monument(monument, avatar=_avatar_for(monument))},
            message='Tạo hồ sơ di tích thành công',
        )


class MonumentUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @transaction.atomic
    def put(self, request):
        monument_id = _get_data_value(request.data, 'id', 'ID')
        monument = Monument.objects.filter(id=monument_id, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')

        permission = _permission_for(request.user, monument)
        if not permission['isUpdate']:
            return ResponseServer.forbidden('Bạn không có quyền chỉnh sửa hồ sơ này')

        sections = _parse_sections(request)
        deleted_file_ids = _parse_id_set(request.data, 'deletedFileIds', 'deleted_file_ids')
        deleted_section_file_ids = _parse_id_set(request.data, 'deletedSectionFileIds', 'deleted_section_file_ids')
        existing_sections = {str(section.id): section for section in monument.sections.filter(is_deleted=False)}
        errors = _validate_create_payload(
            request,
            sections,
            monument=monument,
            existing_sections=existing_sections,
            deleted_file_ids=deleted_file_ids,
            deleted_section_file_ids=deleted_section_file_ids,
        )
        if errors:
            return ResponseServer.failure(message='Dữ liệu chưa hợp lệ', errors=errors)

        data = request.data
        monument.name = _get_data_value(data, 'name')
        monument.recognition_decision = _get_data_value(data, 'recognitionDecision', 'recognition_decision')
        monument.address = _get_data_value(data, 'address')
        monument.description = _get_data_value(data, 'description')
        monument.year_of_construction = _get_data_value(data, 'yearOfConstruction', 'year_of_construction')
        monument.rating = str(_get_data_value(data, 'rating'))
        monument.location = _get_data_value(data, 'location')
        monument.type_of_monument = _as_int(_get_data_value(data, 'typeOfMonument', 'type_of_monument'), 0)
        monument.priority_mode = _as_int(_get_data_value(data, 'priorityMode', 'priority_mode'), 0)
        monument.status = Monument.Status.DRAFT
        monument.pending_level = None
        monument.reason = None
        monument.updated_by = str(request.user.id)
        monument.save()

        _delete_monument_files(monument, deleted_file_ids, request.user)
        _delete_replaced_bucket_files(monument, request, deleted_file_ids)
        _delete_removed_section_files(request, sections, existing_sections, deleted_section_file_ids)
        monument.sections.all().delete()
        monument.histories.all().delete()
        _save_sections(request, monument, sections, request.user, existing_sections=existing_sections, deleted_section_file_ids=deleted_section_file_ids)
        _save_files(request, monument, request.user)

        return ResponseServer.success(
            data={'monument': serialize_monument(monument, avatar=_avatar_for(monument))},
            message='Cập nhật hồ sơ di tích thành công',
        )


class MonumentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        monument_id = request.query_params.get('id')
        monument = Monument.objects.filter(id=monument_id, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        if not _permission_for(request.user, monument)['isDelete']:
            return ResponseServer.forbidden('Bạn không có quyền xóa hồ sơ này')
        monument.soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa hồ sơ di tích thành công')


class MonumentRequestView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def put(self, request, pk):
        monument = Monument.objects.select_for_update().filter(id=pk, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        return _request_next(monument, request.user)


class MonumentVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def put(self, request, pk):
        monument = Monument.objects.select_for_update().filter(id=pk, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        if not _permission_for(request.user, monument)['isApprove']:
            return ResponseServer.forbidden('Bạn không có quyền duyệt hồ sơ này')

        _confirm_pending_history(monument, request.user)
        _create_history(monument, request.user, MonumentHistory.Status.VERIFIED, confirmed_by=request.user)

        monument.status = Monument.Status.APPROVED
        monument.pending_level = None
        monument.approved_at = timezone.now()
        monument.reason = None
        monument.updated_by = str(request.user.id)
        monument.save(update_fields=['status', 'pending_level', 'approved_at', 'reason', 'updated_by', 'updated_at'])

        return ResponseServer.success(data=_serialize_detail(monument, request.user), message='Duyệt hồ sơ di tích thành công')


class MonumentRedoView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def put(self, request):
        monument_id = _get_data_value(request.data, 'id', 'ID')
        reason = _get_data_value(request.data, 'reason')
        if not reason:
            return ResponseServer.failure('Vui lòng nhập lý do trả lại')
        monument = Monument.objects.select_for_update().filter(id=monument_id, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        if not _permission_for(request.user, monument)['isRedo']:
            return ResponseServer.forbidden('Bạn không có quyền trả lại hồ sơ này')

        _confirm_pending_history(monument, request.user)
        _create_history(monument, request.user, MonumentHistory.Status.REDO, reason=reason, confirmed_by=monument.user)

        monument.status = Monument.Status.REDO
        monument.pending_level = None
        monument.reason = reason
        monument.updated_by = str(request.user.id)
        monument.save(update_fields=['status', 'pending_level', 'reason', 'updated_by', 'updated_at'])

        return ResponseServer.success(data=_serialize_detail(monument, request.user), message='Trả lại hồ sơ di tích thành công')


class MonumentRefuseView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def put(self, request):
        monument_id = _get_data_value(request.data, 'id', 'ID')
        reason = _get_data_value(request.data, 'reason')
        if not reason:
            return ResponseServer.failure('Vui lòng nhập lý do không duyệt')
        monument = Monument.objects.select_for_update().filter(id=monument_id, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        if not _permission_for(request.user, monument)['isNotApprove']:
            return ResponseServer.forbidden('Bạn không có quyền không duyệt hồ sơ này')

        _confirm_pending_history(monument, request.user)
        _create_history(monument, request.user, MonumentHistory.Status.REFUSED, reason=reason, confirmed_by=monument.user)

        monument.status = Monument.Status.NOT_APPROVED
        monument.pending_level = None
        monument.reason = reason
        monument.updated_by = str(request.user.id)
        monument.save(update_fields=['status', 'pending_level', 'reason', 'updated_by', 'updated_at'])

        return ResponseServer.success(data=_serialize_detail(monument, request.user), message='Không duyệt hồ sơ di tích thành công')


class MonumentPublishView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def put(self, request, pk):
        monument = Monument.objects.select_for_update().filter(id=pk, is_deleted=False).first()
        if not monument:
            return ResponseServer.not_found('Không tìm thấy hồ sơ di tích')
        if not _permission_for(request.user, monument)['isPublic']:
            return ResponseServer.forbidden('Bạn không có quyền đẩy hồ sơ lên website')

        _create_history(monument, request.user, MonumentHistory.Status.PUBLISHED, confirmed_by=request.user)
        monument.status = Monument.Status.PUBLISHED
        monument.published_at = timezone.now()
        monument.updated_by = str(request.user.id)
        monument.save(update_fields=['status', 'published_at', 'updated_by', 'updated_at'])

        return ResponseServer.success(data=_serialize_detail(monument, request.user), message='Đẩy hồ sơ lên website thành công')


def _request_next(monument, user):
    permission = _permission_for(user, monument)
    if not permission['isRequestApproval']:
        return ResponseServer.forbidden('Bạn không có quyền trình duyệt hồ sơ này')
    flags = _role_flags(user)
    if (
        flags['is_admin']
        and monument.user_id == user.id
        and monument.status in (Monument.Status.DRAFT, Monument.Status.REDO, Monument.Status.NOT_APPROVED)
    ):
        _create_history(monument, user, MonumentHistory.Status.VERIFIED, confirmed_by=user)
        monument.status = Monument.Status.APPROVED
        monument.pending_level = None
        monument.submitted_at = monument.submitted_at or timezone.now()
        monument.approved_at = timezone.now()
        monument.reason = None
        monument.updated_by = str(user.id)
        monument.save(update_fields=['status', 'pending_level', 'submitted_at', 'approved_at', 'reason', 'updated_by', 'updated_at'])
        return ResponseServer.success(data=_serialize_detail(monument, user), message='Duyệt hồ sơ di tích thành công')

    next_level = _next_level_for_request(monument, user)
    if not next_level:
        return ResponseServer.failure('Hồ sơ không còn cấp trình duyệt tiếp theo')

    if monument.status == Monument.Status.PENDING_APPROVAL:
        _confirm_pending_history(monument, user)

    _create_history(monument, user, MonumentHistory.Status.REQUESTED, level=next_level)
    monument.status = Monument.Status.PENDING_APPROVAL
    monument.pending_level = next_level
    monument.submitted_at = monument.submitted_at or timezone.now()
    monument.reason = None
    monument.updated_by = str(user.id)
    monument.save(update_fields=['status', 'pending_level', 'submitted_at', 'reason', 'updated_by', 'updated_at'])

    message = f'Hồ sơ đã được trình đến {PENDING_LEVEL_NAMES.get(next_level, "cấp tiếp theo")}'
    return ResponseServer.success(data=_serialize_detail(monument, user), message=message)


def _section_needs_image(section_type):
    return section_type in SECTION_TYPES_WITH_IMAGE


def _delete_removed_section_files(request, sections, existing_sections, deleted_section_file_ids):
    deleted_section_file_ids = set(deleted_section_file_ids or [])
    incoming_section_ids = {str(section.get('id')) for section in sections if section.get('id')}

    for index, section in enumerate(sections):
        section_id = str(section.get('id') or '')
        existing_section = existing_sections.get(section_id)
        if not existing_section or not existing_section.file:
            continue

        section_type = _as_int(section.get('type'), MonumentSection.SectionType.IMAGE)
        has_new_file = bool(_section_file(request, section, index))
        should_delete_file = section_id in deleted_section_file_ids or has_new_file or not _section_needs_image(section_type)
        if should_delete_file:
            _delete_file_field(existing_section.file)

    for section_id, existing_section in existing_sections.items():
        if section_id not in incoming_section_ids and existing_section.file:
            _delete_file_field(existing_section.file)


def _save_sections(request, monument, sections, user, existing_sections=None, deleted_section_file_ids=None):
    existing_sections = existing_sections or {}
    deleted_section_file_ids = set(deleted_section_file_ids or [])
    for index, section in enumerate(sections):
        file_obj = _section_file(request, section, index)
        section_id = str(section.get('id') or '')
        section_type = _as_int(section.get('type'), MonumentSection.SectionType.IMAGE)
        existing_section = existing_sections.get(section_id)
        can_reuse_existing_file = bool(
            existing_section
            and existing_section.file
            and section_id not in deleted_section_file_ids
            and _section_needs_image(section_type)
        )
        section_file = file_obj or (existing_section.file if can_reuse_existing_file else None)
        section_file_type = _file_type(getattr(file_obj, 'name', '')) if file_obj else (existing_section.file_type if can_reuse_existing_file else None)
        MonumentSection.objects.create(
            monument=monument,
            content=section.get('content') or '',
            type=section_type,
            order=_as_int(section.get('order'), index + 1),
            file=section_file,
            file_name=getattr(file_obj, 'name', None) if file_obj else (existing_section.file_name if can_reuse_existing_file else None),
            file_size=(getattr(file_obj, 'size', 0) or 0) if file_obj else (existing_section.file_size if can_reuse_existing_file else 0),
            file_extension=_extension(getattr(file_obj, 'name', '')) if file_obj else (existing_section.file_extension if can_reuse_existing_file else None),
            file_type=section_file_type,
            created_by=str(user.id),
        )


def _save_files(request, monument, user):
    for bucket, mode in FILE_BUCKETS.items():
        for file_obj in request.FILES.getlist(bucket):
            MonumentFile.objects.create(
                monument=monument,
                file=file_obj,
                file_name=file_obj.name,
                size=file_obj.size or 0,
                extension=_extension(file_obj.name),
                type=_file_type(file_obj.name),
                mode=mode,
                created_by=str(user.id),
            )
