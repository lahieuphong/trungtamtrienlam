import os
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.authentication.models import Role, UserRole, RoleDepartment
from apps.departments.models import Department, Staff
from .models import District, Organization, Province, StaffFile, UserConcurrently, Ward

TYPE_FILE_AVATAR = 0
TYPE_FILE_SIGN = 1
TYPE_FILE_STAMP = 2

ALLOWED_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}


def is_truthy_status(value):
    return str(value).lower() in {'1', 'true', 'yes', 'on'}


def get_optional(model, value):
    if not value:
        return None
    try:
        return model.objects.filter(id=value).first()
    except (TypeError, ValueError, ValidationError):
        return None


def get_optional_location(model, value):
    obj = get_optional(model, value)
    if obj:
        return obj
    if value and hasattr(model, 'code'):
        return model.objects.filter(code=str(value).strip()).first()
    return None


def ensure_staff_for_user(user):
    staff = Staff.objects.filter(user=user, is_deleted=False).first()
    if staff:
        changed = False
        if not staff.first_name and user.first_name:
            staff.first_name = user.first_name
            changed = True
        if not staff.last_name and user.last_name:
            staff.last_name = user.last_name
            changed = True
        if not staff.email and user.email:
            staff.email = user.email
            changed = True
        if not staff.phone_number and user.phone:
            staff.phone_number = user.phone
            changed = True
        if not staff.address and user.address:
            staff.address = user.address
            changed = True
        if changed:
            staff.save()
        return staff

    return Staff.objects.create(
        user=user,
        first_name=user.first_name or '',
        last_name=user.last_name or '',
        email=user.email or '',
        phone_number=user.phone or '',
        address=user.address or '',
    )


def ensure_staff_profiles_for_users(users):
    for user in users:
        ensure_staff_for_user(user)


def get_staff_by_identifier(identifier, user=None):
    if user is not None:
        return ensure_staff_for_user(user)
    if not identifier:
        return None

    staff = Staff.objects.select_related('user', 'province', 'district', 'ward').filter(
        id=identifier,
        is_deleted=False,
    ).first()
    if staff:
        return staff

    staff = Staff.objects.select_related('user', 'province', 'district', 'ward').filter(
        user_id=identifier,
        is_deleted=False,
    ).first()
    if staff:
        return staff

    from apps.authentication.models import User
    fallback_user = User.objects.filter(id=identifier, is_deleted=False).first()
    return ensure_staff_for_user(fallback_user) if fallback_user else None


def validate_positions(positions):
    roles_by_id = {str(r.id): r for r in Role.objects.filter(is_deleted=False)}
    check_is_director = False
    check_is_admin = False

    for pos in positions:
        role_id = str(pos.get('roleID') or '').strip()
        organization_id = str(pos.get('organizationID') or '').strip()
        department_id = str(pos.get('departmentID') or '').strip()

        if not role_id:
            return False, 'Vui lòng chọn chức vụ', False, False
        role = roles_by_id.get(role_id)
        if not role:
            return False, 'Chức vụ không tồn tại', False, False

        if not organization_id:
            return False, 'Vui lòng chọn tổ chức', False, False
        if not Organization.objects.filter(id=organization_id, is_deleted=False).exists():
            return False, 'Tổ chức không tồn tại', False, False

        check_is_director = check_is_director or role.is_director
        check_is_admin = check_is_admin or role.is_admin
        can_skip_department = role.is_director or role.is_admin or role.is_vice_director
        if not can_skip_department:
            if not department_id:
                return False, 'Vui lòng chọn bộ phận', False, False
            if not Department.objects.filter(id=department_id, is_deleted=False).exists():
                return False, 'Bộ phận không tồn tại', False, False

    return True, '', check_is_director, check_is_admin


def sync_user_assignments(user, positions, created_by=None):
    UserConcurrently.objects.filter(user=user, is_deleted=False).update(is_deleted=True, updated_by=created_by)
    UserRole.objects.filter(user=user).delete()

    concurrentlies = []
    role_ids = set()
    first_department_id = None
    first_role_name = ''

    for pos in positions:
        role = get_optional(Role, pos.get('roleID'))
        department = get_optional(Department, pos.get('departmentID'))
        organization = get_optional(Organization, pos.get('organizationID'))

        if role:
            role_ids.add(role.id)
            if not first_role_name:
                first_role_name = role.name
        if department and not first_department_id:
            first_department_id = department.id

        concurrentlies.append(UserConcurrently(
            user=user,
            role=role,
            department=department,
            organization=organization,
            created_by=created_by,
        ))
        if role and department:
            RoleDepartment.objects.get_or_create(role=role, department=department)

    UserConcurrently.objects.bulk_create(concurrentlies)
    UserRole.objects.bulk_create([UserRole(user=user, role_id=role_id) for role_id in role_ids], ignore_conflicts=True)

    user.department_id = first_department_id
    user.position = first_role_name
    user.save(update_fields=['department_id', 'position', 'updated_at'])


def role_flags_for_user(user):
    roles = Role.objects.filter(user_concurrentlies__user=user, user_concurrentlies__is_deleted=False).distinct()
    return {
        'IsDirector': roles.filter(is_director=True).exists(),
        'IsAdmin': roles.filter(is_admin=True).exists(),
    }


def clean_staff_files_for_type(staff, type_files):
    StaffFile.objects.filter(staff=staff, type_file__in=type_files, is_deleted=False).update(is_deleted=True)


def save_staff_file(uploaded_file, staff, type_file, subfolder, created_by=None):
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    filename = f'{uuid.uuid4()}{ext}'
    rel_path = f'staff/{subfolder}/{staff.id}/{filename}'
    full_path = os.path.join(settings.MEDIA_ROOT, 'staff', subfolder, str(staff.id), filename)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'wb+') as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    staff_file = StaffFile.objects.create(
        staff=staff,
        user_id=str(staff.user_id) if staff.user_id else None,
        file=rel_path,
        file_name=uploaded_file.name,
        size=round(uploaded_file.size / (1024 * 1024), 4),
        extension=ext.lstrip('.'),
        type_file=type_file,
        created_by=created_by,
    )

    if type_file == TYPE_FILE_AVATAR:
        staff.avatar = rel_path
        if staff.user:
            staff.user.avatar = rel_path
            staff.user.save(update_fields=['avatar', 'updated_at'])
    elif type_file == TYPE_FILE_SIGN:
        staff.sign = rel_path
    elif type_file == TYPE_FILE_STAMP:
        staff.stamp = rel_path
    staff.save()
    return staff_file


def validate_image(uploaded_file):
    if not uploaded_file:
        return False, 'Vui lòng chọn hình đại diện'
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        return False, 'Định dạng ảnh không hợp lệ'
    return True, ''


def active_location_or_failure(province_id, ward_id=None, district_id=None):
    province = get_optional_location(Province, province_id)
    if not province or province.is_deleted or province.is_disabled:
        return None, None, None, 'Tỉnh/Thành phố trực thuộc TW không tồn tại'

    if not ward_id:
        return None, None, None, 'Vui lòng chọn Phường/Xã/Đặc khu'

    ward = get_optional_location(Ward, ward_id)
    if not ward or ward.is_deleted or ward.is_disabled:
        return None, None, None, 'Phường/Xã/Đặc khu không tồn tại'
    if ward.province_id != province.id:
        return None, None, None, 'Phường/Xã/Đặc khu không thuộc tỉnh/thành phố đã chọn'

    # District is kept only for legacy reads. Active address flows do not use it.
    return province, None, ward, ''
