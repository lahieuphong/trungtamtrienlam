from django.db import DatabaseError
from django.db import transaction
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.legacy_aidi.models import ManagedMenuItem
from core.legacy_aidi.models import ManagedPermission
from core.legacy_aidi.models import ManagedRole


ACTION_FIELDS = {
    'view': 'can_view',
    'add': 'can_add',
    'edit': 'can_edit',
    'delete': 'can_delete',
    'verify': 'can_verify',
    'refuse': 'can_refuse',
    'download': 'can_download',
    'ispublic': 'is_public',
    'is_public': 'is_public',
}

DEFAULT_NULL_ACTIONS = {
    'can_verify': None,
    'can_refuse': None,
    'can_download': None,
    'is_public': None,
}


def _success(payload=None):
    return Response({
        'status': 200,
        'message': 'Lấy dữ liệu thành công',
        'data': {
            'status': 200,
            'message': None,
            'data': payload,
        },
        'errors': None,
    })


def _failure(message='Thao tác thất bại'):
    return Response({
        'status': 400,
        'message': message,
        'data': None,
        'errors': [message],
    }, status=400)


def _blank_to_none(value):
    return None if value in ('', None) else value


def _normalize_department_id(value):
    return (value or '').strip()


def _user_id(request):
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return str(getattr(user, 'id', '') or getattr(user, 'username', '') or '')
    return ''


def _active_menu_items():
    return list(
        ManagedMenuItem.objects
        .filter(is_disabled=False, is_deleted=False)
        .order_by('sort_order', 'name')
    )


def _role_defaults(role_id):
    role = ManagedRole.objects.filter(id=role_id).first()
    is_admin = bool(role and role.is_admin)
    return {
        'can_view': is_admin,
        'can_add': is_admin,
        'can_edit': is_admin,
        'can_delete': is_admin,
        **DEFAULT_NULL_ACTIONS,
    }


def _ensure_permissions(role_id, department_id, created_by=''):
    menu_items = _active_menu_items()
    if not role_id:
        return menu_items

    existing_function_ids = set(
        ManagedPermission.objects
        .filter(role_id=role_id, department_id=department_id)
        .values_list('function_id', flat=True)
    )
    missing_items = [item for item in menu_items if item.function_id not in existing_function_ids]

    if missing_items:
        defaults = _role_defaults(role_id)
        ManagedPermission.objects.bulk_create([
            ManagedPermission(
                role_id=role_id,
                department_id=department_id,
                function_id=item.function_id,
                created_by=created_by,
                **defaults,
            )
            for item in missing_items
        ], ignore_conflicts=True)

    return menu_items


def _role_exists(role_id):
    return ManagedRole.objects.filter(id=role_id).exists()


def _serialize_row(menu_item, permission):
    return {
        'functionID': menu_item.function_id,
        'functionName': menu_item.name,
        'actionName': None,
        'functionParrentID': _blank_to_none(menu_item.parent_id),
        'view': permission.can_view if permission else False,
        'add': permission.can_add if permission else False,
        'edit': permission.can_edit if permission else False,
        'delete': permission.can_delete if permission else False,
        'verify': permission.can_verify if permission else None,
        'refuse': permission.can_refuse if permission else None,
        'download': permission.can_download if permission else None,
        'isPublic': permission.is_public if permission else None,
        'sortOrder': menu_item.sort_order or 0,
        'uniqueKey': menu_item.unique_key,
        'path': menu_item.path or menu_item.url,
    }


class PermissionListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        role_id = (request.query_params.get('roleID') or '').strip()
        department_id = _normalize_department_id(request.query_params.get('departmentID'))

        if not role_id:
            return _success({'data': []})

        try:
            with transaction.atomic():
                menu_items = _ensure_permissions(role_id, department_id, _user_id(request))

            permissions = {
                item.function_id: item
                for item in ManagedPermission.objects.filter(role_id=role_id, department_id=department_id)
            }
            rows = [
                _serialize_row(menu_item, permissions.get(menu_item.function_id))
                for menu_item in menu_items
            ]
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({'data': rows})


class PermissionUpdateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        role_id = (request.query_params.get('roleID') or '').strip()
        department_id = _normalize_department_id(request.query_params.get('departmentID'))
        function_id = (request.query_params.get('functionID') or '').strip()
        action = (request.query_params.get('action') or '').strip()
        field_name = ACTION_FIELDS.get(action.lower())

        if not role_id or not function_id or not field_name:
            return _failure('Thiếu roleID, functionID hoặc action không hợp lệ')

        try:
            with transaction.atomic():
                _ensure_permissions(role_id, department_id, _user_id(request))
                permission, _created = ManagedPermission.objects.get_or_create(
                    role_id=role_id,
                    department_id=department_id,
                    function_id=function_id,
                    defaults={
                        'created_by': _user_id(request),
                        **_role_defaults(role_id),
                    },
                )

                current_value = getattr(permission, field_name)
                setattr(permission, field_name, not bool(current_value))
                permission.modified_by = _user_id(request)
                permission.save(update_fields=[field_name, 'modified_by', 'modified_date'])
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)


class PermissionCloneApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        old_role_id = (request.query_params.get('oldRoleID') or '').strip()
        new_role_id = (request.query_params.get('newRoleID') or '').strip()
        old_department_id = _normalize_department_id(request.query_params.get('oldDepartmentID'))
        new_department_id = _normalize_department_id(request.query_params.get('newDepartmentID'))

        if not old_role_id or not new_role_id:
            return _failure('Thiếu oldRoleID hoặc newRoleID')

        try:
            if not _role_exists(old_role_id) or not _role_exists(new_role_id):
                return _failure('Chuc vu nguon hoac dich khong ton tai')

            if old_role_id == new_role_id and old_department_id == new_department_id:
                return _success(None)

            with transaction.atomic():
                _ensure_permissions(old_role_id, old_department_id, _user_id(request))
                source_permissions = list(
                    ManagedPermission.objects
                    .filter(role_id=old_role_id, department_id=old_department_id)
                )

                ManagedPermission.objects.filter(
                    role_id=new_role_id,
                    department_id=new_department_id,
                ).delete()

                ManagedPermission.objects.bulk_create([
                    ManagedPermission(
                        role_id=new_role_id,
                        department_id=new_department_id,
                        function_id=source.function_id,
                        can_view=source.can_view,
                        can_add=source.can_add,
                        can_edit=source.can_edit,
                        can_delete=source.can_delete,
                        can_verify=source.can_verify,
                        can_refuse=source.can_refuse,
                        can_download=source.can_download,
                        is_public=source.is_public,
                        created_by=_user_id(request),
                        modified_by=_user_id(request),
                    )
                    for source in source_permissions
                ])
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)
