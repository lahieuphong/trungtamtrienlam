import json
from collections import defaultdict

from django.db import DatabaseError
from django.db import connection
from django.db.models import Q

from core.legacy_aidi.models import LegacyAction
from core.legacy_aidi.models import LegacyFunction
from core.legacy_aidi.models import LegacyPermission
from core.legacy_aidi.models import LegacyPermision
from core.legacy_aidi.models import LegacyRole
from core.legacy_aidi.models import LegacyStaff
from core.legacy_aidi.models import LegacyStaffFile
from core.legacy_aidi.models import LegacyUser
from core.legacy_aidi.models import LegacyUserConcurrently
from core.legacy_aidi.models import ManagedMenuItem
from core.legacy_aidi.models import ManagedPermission
from core.legacy_aidi.models import ManagedRole
from core.legacy_aidi.models import ManagedStaffPosition


ACTION_FLAG_FIELDS = (
    ('View', 'IsView'),
    ('Add', 'IsAdd'),
    ('Edit', 'IsEdit'),
    ('Delete', 'IsDelete'),
    ('Confirm', 'IsConfirm'),
    ('Verify', 'IsVerify'),
)

ADMIN_ACTIONS = tuple(action for action, _field in ACTION_FLAG_FIELDS)

MANAGED_PERMISSION_ACTION_FIELDS = (
    ('View', 'can_view'),
    ('Add', 'can_add'),
    ('Edit', 'can_edit'),
    ('Delete', 'can_delete'),
    ('Verify', 'can_verify'),
    ('Refuse', 'can_refuse'),
    ('Download', 'can_download'),
    ('IsPublic', 'is_public'),
)

DEFAULT_ADMIN_FUNCTIONS = (
    {
        'functionID': 'dashboard',
        'functionName': 'Tổng quan',
        'uniqueKey': 'dashboard',
        'path': '/dashboard',
        'parrentID': None,
        'sortOrder': 1,
    },
    {
        'functionID': 'Calendar',
        'functionName': 'Quản lý lịch',
        'uniqueKey': 'Calendar',
        'path': '/calendar',
        'parrentID': None,
        'sortOrder': 2,
    },
    {
        'functionID': 'Media',
        'functionName': 'Quản lý kho lưu trữ',
        'uniqueKey': 'Media',
        'path': '/media',
        'parrentID': None,
        'sortOrder': 3,
    },
    {
        'functionID': 'MediaFolders',
        'functionName': 'Thư mục',
        'uniqueKey': 'MediaFolders',
        'path': '/media/folders',
        'parrentID': 'Media',
        'sortOrder': 31,
    },
    {
        'functionID': 'MediaDocuments',
        'functionName': 'Tài liệu',
        'uniqueKey': 'MediaDocuments',
        'path': '/media/documents',
        'parrentID': 'Media',
        'sortOrder': 32,
    },
    {
        'functionID': 'MediaImages',
        'functionName': 'Hình ảnh',
        'uniqueKey': 'MediaImages',
        'path': '/media/images',
        'parrentID': 'Media',
        'sortOrder': 33,
    },
    {
        'functionID': 'MediaVideos',
        'functionName': 'Video',
        'uniqueKey': 'MediaVideos',
        'path': '/media/videos',
        'parrentID': 'Media',
        'sortOrder': 34,
    },
    {
        'functionID': 'Tasks',
        'functionName': 'Quản lý nhiệm vụ',
        'uniqueKey': 'Tasks',
        'path': '/tasks/tasks',
        'parrentID': None,
        'sortOrder': 4,
    },
    {
        'functionID': 'TasksAssigned',
        'functionName': 'Nhiệm vụ',
        'uniqueKey': 'TasksAssigned',
        'path': '/tasks/tasks',
        'parrentID': 'Tasks',
        'sortOrder': 41,
    },
    {
        'functionID': 'TasksInternal',
        'functionName': 'Nội bộ',
        'uniqueKey': 'TasksInternal',
        'path': '/tasks/internal',
        'parrentID': 'Tasks',
        'sortOrder': 42,
    },
    {
        'functionID': 'TasksDigital',
        'functionName': 'Số hóa',
        'uniqueKey': 'TasksDigital',
        'path': '/tasks/degital',
        'parrentID': 'Tasks',
        'sortOrder': 43,
    },
    {
        'functionID': 'TasksPendingIssuance',
        'functionName': 'Chờ ban hành',
        'uniqueKey': 'TasksPendingIssuance',
        'path': '/tasks/pendingIssuance',
        'parrentID': 'Tasks',
        'sortOrder': 44,
    },
    {
        'functionID': 'Ratings',
        'functionName': 'Đánh giá xếp hạng',
        'uniqueKey': 'Ratings',
        'path': '/ratings',
        'parrentID': None,
        'sortOrder': 5,
    },
    {
        'functionID': 'RatingsAwards',
        'functionName': 'Danh hiệu',
        'uniqueKey': 'RatingsAwards',
        'path': '/ratings/awards',
        'parrentID': 'Ratings',
        'sortOrder': 51,
    },
    {
        'functionID': 'RatingsRankings',
        'functionName': 'Xếp hạng',
        'uniqueKey': 'RatingsRankings',
        'path': '/ratings/rankings',
        'parrentID': 'Ratings',
        'sortOrder': 52,
    },
    {
        'functionID': 'RatingsCriterias',
        'functionName': 'Tiêu chí',
        'uniqueKey': 'RatingsCriterias',
        'path': '/ratings/criterias',
        'parrentID': 'Ratings',
        'sortOrder': 53,
    },
    {
        'functionID': 'Permission',
        'functionName': 'Phân quyền chức năng',
        'uniqueKey': 'Permission',
        'path': '/permissions',
        'parrentID': None,
        'sortOrder': 6,
    },
    {
        'functionID': 'Staff',
        'functionName': 'Quản lý tài khoản',
        'uniqueKey': 'Staff',
        'path': '/accounts',
        'parrentID': None,
        'sortOrder': 7,
    },
    {
        'functionID': 'documents',
        'functionName': 'Văn bản hành chính cá nhân',
        'uniqueKey': 'documents',
        'path': '/documents',
        'parrentID': None,
        'sortOrder': 8,
    },
    {
        'functionID': 'Settings',
        'functionName': 'Cài đặt hệ thống',
        'uniqueKey': 'Settings',
        'path': '/settings',
        'parrentID': None,
        'sortOrder': 9,
    },
    {
        'functionID': 'SettingsSystem',
        'functionName': 'Hệ thống',
        'uniqueKey': 'SettingsSystem',
        'path': '/settings/system',
        'parrentID': 'Settings',
        'sortOrder': 91,
    },
    {
        'functionID': 'SettingsMaintenance',
        'functionName': 'Bảo trì',
        'uniqueKey': 'SettingsMaintenance',
        'path': '/settings/maintenance',
        'parrentID': 'Settings',
        'sortOrder': 92,
    },
    {
        'functionID': 'SettingsBackup',
        'functionName': 'Sao lưu',
        'uniqueKey': 'SettingsBackup',
        'path': '/settings/backup',
        'parrentID': 'Settings',
        'sortOrder': 93,
    },
    {
        'functionID': 'templates',
        'functionName': 'Biểu mẫu & Đơn từ',
        'uniqueKey': 'templates',
        'path': '/templates',
        'parrentID': None,
        'sortOrder': 10,
    },
    {
        'functionID': 'TemplateWordProcessing',
        'functionName': 'Văn bản trình ký',
        'uniqueKey': 'TemplateWordProcessing',
        'path': '/templates/wordprocessing',
        'parrentID': 'templates',
        'sortOrder': 101,
    },
    {
        'functionID': 'TemplateFormManagement',
        'functionName': 'Quản lý biểu mẫu',
        'uniqueKey': 'TemplateFormManagement',
        'path': '/templates/formmanagement',
        'parrentID': 'templates',
        'sortOrder': 102,
    },
)


def _safe(default, callback):
    try:
        return callback()
    except DatabaseError:
        return default


def _table_exists(table_name):
    try:
        return table_name in connection.introspection.table_names()
    except DatabaseError:
        return False


def _legacy_model_table_exists(model):
    return _table_exists(model._meta.db_table)


def _is_true(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes'}
    return bool(value)


def _blank_to_none(value):
    return value if value not in ('', None) else None


def _normalize_path(value):
    value = (value or '').strip()
    if not value:
        return ''
    if value.startswith('/') or value.startswith('http://') or value.startswith('https://'):
        return value
    return f'/{value}'


def _normalize_action_name(value):
    value = (value or '').strip()
    lookup = {
        'get': 'View',
        'view': 'View',
        'add': 'Add',
        'create': 'Add',
        'edit': 'Edit',
        'update': 'Edit',
        'delete': 'Delete',
        'confirm': 'Confirm',
        'verify': 'Verify',
    }
    return lookup.get(value.lower(), value)


def _first_value(*values):
    for value in values:
        if value not in ('', None):
            return value
    return None


def resolve_legacy_user(user):
    if not _legacy_model_table_exists(LegacyUser):
        return None

    def query():
        conditions = Q()

        legacy_id = getattr(user, 'legacy_id', None)
        if legacy_id:
            conditions |= Q(ID=str(legacy_id))

        if getattr(user, 'id', None):
            conditions |= Q(ID=str(user.id))

        username = getattr(user, 'username', None)
        if username:
            conditions |= Q(UserName__iexact=username)
            conditions |= Q(NormalizedUserName=username.upper())

        email = getattr(user, 'email', None)
        if email:
            conditions |= Q(Email__iexact=email)
            conditions |= Q(NormalizedEmail=email.upper())

        phone = getattr(user, 'phone_number', None)
        if phone:
            conditions |= Q(PhoneNumber=phone)

        if not conditions:
            return None

        return LegacyUser.objects.filter(conditions).first()

    return _safe(None, query)


def _role_ids_for_user(user, legacy_user):
    user_ids = []
    if legacy_user:
        user_ids.append(legacy_user.ID)
        if legacy_user.RoleID:
            user_ids.append(legacy_user.RoleID)
    if getattr(user, 'id', None):
        user_ids.append(str(user.id))

    role_ids = []
    if user_ids and _legacy_model_table_exists(LegacyUserConcurrently):
        def query_legacy_concurrent_roles():
            role_ids.extend(
                LegacyUserConcurrently.objects
                .filter(UserID__in=user_ids)
                .values_list('RoleID', flat=True)
                .distinct()
            )

        _safe([], query_legacy_concurrent_roles)

    if legacy_user and legacy_user.RoleID:
        role_ids.append(legacy_user.RoleID)

    if getattr(user, 'id', None):
        def query_managed_positions():
            role_ids.extend(
                ManagedStaffPosition.objects
                .filter(user_id=user.id)
                .values_list('role_id', flat=True)
            )

        _safe([], query_managed_positions)

    return [role_id for role_id in dict.fromkeys(role_ids) if role_id]


def _roles_for_ids(role_ids):
    if not role_ids:
        return []
    if not _legacy_model_table_exists(LegacyRole):
        return []

    def query():
        return list(
            LegacyRole.objects
            .filter(ID__in=role_ids)
            .exclude(IsDeleted=True)
            .exclude(IsDisabled=True)
            .order_by('Level', 'Name')
        )

    return _safe([], query)


def _managed_roles_for_ids(role_ids):
    if not role_ids:
        return []

    def query():
        return list(
            ManagedRole.objects
            .filter(id__in=role_ids)
            .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
            .filter(Q(is_disabled=False) | Q(is_disabled__isnull=True))
            .order_by('level', 'name')
        )

    return _safe([], query)


def _has_managed_roles(role_ids):
    if not role_ids:
        return False

    def query():
        return ManagedRole.objects.filter(id__in=role_ids).exists()

    return _safe(False, query)


def _managed_staff_positions_for_user(user):
    if not getattr(user, 'id', None):
        return []

    def query():
        return list(
            ManagedStaffPosition.objects
            .filter(user_id=user.id)
            .order_by('-is_default', 'created_date')
        )

    return _safe([], query)


def _default_admin_role_info(user):
    return {
        'roleID': 'admin',
        'roleName': 'Admin',
        'isAdmin': True,
        'isDirector': False,
        'isViceDirector': False,
        'canReceiveTask': True,
        'canAssignTask': True,
        'canSeeDepartmentTasks': True,
        'isPOAD': False,
        'IsAdmin': True,
    }


def _serialize_role(role, user):
    if not role:
        return _default_admin_role_info(user) if _is_django_admin(user) else {}

    return {
        'roleID': role.ID,
        'roleName': role.Name or role.NormalizedName or '',
        'isAdmin': _is_true(role.IsAdmin),
        'isDirector': _is_true(role.IsDirector),
        'isViceDirector': _is_true(role.IsViceDirector),
        'canReceiveTask': _is_true(role.CanReceiveTask),
        'canAssignTask': _is_true(role.CanAssignTask),
        'canSeeDepartmentTasks': _is_true(role.CanSeeDepartmentTasks),
        'isPOAD': False,
        'IsAdmin': _is_true(role.IsAdmin),
    }


def _serialize_managed_role(role, user):
    if not role:
        return _default_admin_role_info(user) if _is_django_admin(user) else {}

    return {
        'roleID': role.id,
        'roleName': role.name,
        'isAdmin': _is_true(role.is_admin),
        'isDirector': _is_true(role.is_director),
        'isViceDirector': _is_true(role.is_vice_director),
        'canReceiveTask': _is_true(role.can_receive_task),
        'canAssignTask': _is_true(role.can_assign_task),
        'canSeeDepartmentTasks': _is_true(role.can_see_department_tasks),
        'isPOAD': False,
        'IsAdmin': _is_true(role.is_admin),
    }


def _is_django_admin(user):
    return bool(getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False))


def _active_functions():
    if not _legacy_model_table_exists(LegacyFunction):
        return []

    def query():
        return list(
            LegacyFunction.objects
            .exclude(IsDeleted=True)
            .exclude(IsDisabled=True)
            .order_by('SortOrder', 'Name')
        )

    return _safe([], query)


def _actions_by_id():
    if not _legacy_model_table_exists(LegacyAction):
        return {}

    def query():
        actions = {}
        for action in LegacyAction.objects.exclude(IsDeleted=True).exclude(IsDisabled=True):
            actions[action.ID] = _normalize_action_name(
                _first_value(action.Name, action.UniqueKey, action.UniqueCode, action.ID)
            )
        return actions

    return _safe({}, query)


def _serialize_permission(function, action_name, action_id=None, permission_id=None):
    parent_id = _blank_to_none(function.ParentID)
    return {
        'id': f'{function.ID}:{action_name}',
        'permissionID': permission_id,
        'functionID': function.ID,
        'functionName': _first_value(function.Name, function.UniqueKey, function.UniqueCode, function.ID),
        'uniqueKey': _first_value(function.UniqueKey, function.UniqueCode, function.ID),
        'uniqueCode': function.UniqueCode,
        'path': _normalize_path(_first_value(function.Path, function.URL)),
        'url': function.URL,
        'parrentID': parent_id,
        'parentID': parent_id,
        'icon': function.Icon,
        'sortOrder': function.SortOrder or 0,
        'actionID': action_id,
        'actionNames': action_name,
        'actionName': action_name,
    }


def _serialize_default_permission(function_data, action_name):
    return {
        'id': f"{function_data['functionID']}:{action_name}",
        'permissionID': None,
        'functionID': function_data['functionID'],
        'functionName': function_data['functionName'],
        'uniqueKey': function_data['uniqueKey'],
        'uniqueCode': function_data['uniqueKey'],
        'path': function_data['path'],
        'url': function_data['path'],
        'parrentID': function_data['parrentID'],
        'parentID': function_data['parrentID'],
        'icon': None,
        'sortOrder': function_data['sortOrder'],
        'actionID': action_name,
        'actionNames': action_name,
        'actionName': action_name,
    }


def _managed_menu_items():
    def query():
        return list(
            ManagedMenuItem.objects
            .filter(is_disabled=False, is_deleted=False)
            .order_by('sort_order', 'name')
        )

    return _safe(None, query)


def _serialize_managed_menu_permission(menu_item, action_name):
    parent_id = _blank_to_none(menu_item.parent_id)
    path = menu_item.path or menu_item.url
    unique_code = menu_item.unique_code or menu_item.unique_key
    return {
        'id': f'{menu_item.function_id}:{action_name}',
        'permissionID': None,
        'functionID': menu_item.function_id,
        'functionName': menu_item.name,
        'uniqueKey': menu_item.unique_key,
        'uniqueCode': unique_code,
        'path': path,
        'url': menu_item.url or path,
        'parrentID': parent_id,
        'parentID': parent_id,
        'icon': menu_item.normalized_icon() or None,
        'sortOrder': menu_item.sort_order or 0,
        'actionID': action_name,
        'actionNames': action_name,
        'actionName': action_name,
    }


def _managed_menu_permission_info():
    menu_items = _managed_menu_items()
    if menu_items is None:
        return None

    rows = []
    for menu_item in menu_items:
        for action_name in ADMIN_ACTIONS:
            rows.append(_serialize_managed_menu_permission(menu_item, action_name))
    return rows


def _managed_permission_info_for_roles(role_ids, managed_positions=None):
    if not role_ids:
        return []

    menu_items = _managed_menu_items()
    if menu_items is None:
        return None

    role_ids = [role_id for role_id in dict.fromkeys(role_ids) if role_id]
    managed_positions = managed_positions or []
    position_pairs = [
        (position.role_id, position.department_id or '')
        for position in managed_positions
        if position.role_id in role_ids
    ]

    try:
        filters = Q()
        if position_pairs:
            for role_id, department_id in position_pairs:
                filters |= Q(role_id=role_id, department_id=department_id)
                if department_id:
                    filters |= Q(role_id=role_id, department_id='')
        else:
            filters = Q(role_id__in=role_ids, department_id='')

        permissions = ManagedPermission.objects.filter(filters)
        menu_items_by_function_id = {item.function_id: item for item in menu_items}
        rows_by_key = {}

        for permission in permissions:
            menu_item = menu_items_by_function_id.get(permission.function_id)
            if not menu_item:
                continue

            for action_name, field_name in MANAGED_PERMISSION_ACTION_FIELDS:
                if not _is_true(getattr(permission, field_name, None)):
                    continue

                key = (menu_item.function_id, action_name)
                if key not in rows_by_key:
                    rows_by_key[key] = _serialize_managed_menu_permission(menu_item, action_name)

        return sorted(
            rows_by_key.values(),
            key=lambda item: (
                item.get('sortOrder') or 0,
                item.get('functionName') or '',
                item.get('actionNames') or '',
            ),
        )
    except DatabaseError:
        return None


def default_admin_permission_info():
    managed_rows = _managed_menu_permission_info()
    if managed_rows is not None:
        return managed_rows

    rows = []
    for function_data in DEFAULT_ADMIN_FUNCTIONS:
        for action_name in ADMIN_ACTIONS:
            rows.append(_serialize_default_permission(function_data, action_name))
    return rows


def _admin_permission_info():
    managed_rows = _managed_menu_permission_info()
    if managed_rows is not None:
        return managed_rows

    functions = _active_functions()
    if not functions:
        return default_admin_permission_info()

    rows = []
    for function in functions:
        for action_name in ADMIN_ACTIONS:
            rows.append(_serialize_permission(function, action_name, action_name))
    return rows


def _permission_info_for_roles(role_ids, managed_positions=None):
    if not role_ids:
        return []

    if _has_managed_roles(role_ids):
        managed_rows = _managed_permission_info_for_roles(role_ids, managed_positions)
        if managed_rows is not None:
            return managed_rows

    functions = {function.ID: function for function in _active_functions()}
    if not functions:
        return []

    actions_by_id = _actions_by_id()
    rows_by_key = {}

    def add(function_id, action_name, action_id=None, permission_id=None):
        function = functions.get(function_id)
        action_name = _normalize_action_name(action_name)
        if not function or not action_name:
            return

        key = (function.ID, action_name)
        if key not in rows_by_key:
            rows_by_key[key] = _serialize_permission(function, action_name, action_id, permission_id)

    def collect_flag_permissions():
        for permission in LegacyPermission.objects.filter(RoleID__in=role_ids):
            for action_name, field_name in ACTION_FLAG_FIELDS:
                if _is_true(getattr(permission, field_name, None)):
                    add(permission.FunctionID, action_name, action_name, permission.ID)

            if permission.ActionID:
                add(
                    permission.FunctionID,
                    actions_by_id.get(permission.ActionID, permission.ActionID),
                    permission.ActionID,
                    permission.ID,
                )

    def collect_action_row_permissions():
        for permission in LegacyPermision.objects.filter(RoleID__in=role_ids):
            add(
                permission.FunctionID,
                actions_by_id.get(permission.ActionID, permission.ActionID),
                permission.ActionID,
                permission.ID,
            )

    if _legacy_model_table_exists(LegacyPermission):
        _safe(None, collect_flag_permissions)
    if _legacy_model_table_exists(LegacyPermision):
        _safe(None, collect_action_row_permissions)

    return sorted(
        rows_by_key.values(),
        key=lambda item: (item.get('sortOrder') or 0, item.get('functionName') or '', item.get('actionNames') or ''),
    )


def _legacy_staff_for_user(legacy_user):
    if not legacy_user:
        return None
    if not _legacy_model_table_exists(LegacyStaff):
        return None

    def query():
        return LegacyStaff.objects.filter(UserID=legacy_user.ID).first()

    return _safe(None, query)


def _legacy_staff_files(staff):
    if not staff:
        return []
    if not _legacy_model_table_exists(LegacyStaffFile):
        return []

    def query():
        files = []
        for item in LegacyStaffFile.objects.filter(StaffID=staff.ID).exclude(IsDeleted='true'):
            files.append({
                'id': item.ID,
                'ID': item.ID,
                'StaffID': item.StaffID,
                'File': item.File,
                'FileName': item.FileName,
                'Type': item.Type,
                'TypeFile': item.TypeFile,
                'Size': item.Size,
                'Extension': item.Extension,
            })
        return files

    return _safe([], query)


def build_user_info(user, legacy_user, staff, role_info):
    full_name = _first_value(
        getattr(staff, 'FirstName', None) and f'{staff.LastName or ""} {staff.FirstName or ""}'.strip(),
        getattr(legacy_user, 'FullName', None),
        getattr(user, 'name', None),
        getattr(user, 'username', None),
    )
    email = _first_value(
        getattr(staff, 'Email', None),
        getattr(legacy_user, 'Email', None),
        getattr(user, 'email', None),
    )
    phone = _first_value(
        getattr(staff, 'PhoneNumber', None),
        getattr(legacy_user, 'PhoneNumber', None),
        getattr(user, 'phone_number', None),
    )
    legacy_user_id = _first_value(getattr(legacy_user, 'ID', None), getattr(user, 'id', None))
    staff_files = _legacy_staff_files(staff)

    return {
        'id': getattr(user, 'id', None),
        'staffID': getattr(staff, 'ID', None),
        'userID': legacy_user_id,
        'username': getattr(user, 'username', None),
        'userName': _first_value(getattr(legacy_user, 'UserName', None), getattr(user, 'username', None)),
        'fullName': full_name,
        'name': _first_value(getattr(user, 'name', None), full_name),
        'email': email,
        'phoneNumber': phone,
        'phone_number': getattr(user, 'phone_number', None),
        'avatar': _first_value(getattr(staff, 'Avatar', None), None),
        'departmentID': _first_value(getattr(legacy_user, 'DepartmentID', None), getattr(staff, 'DepartmentID', None)),
        'departmentName': getattr(legacy_user, 'DepartmentName', None),
        'roleID': role_info.get('roleID'),
        'roleName': role_info.get('roleName'),
        'staffFiles': json.dumps(staff_files, ensure_ascii=False),
        'isAdmin': role_info.get('isAdmin', False),
    }


def get_legacy_auth_context(user):
    legacy_user = resolve_legacy_user(user)
    role_ids = _role_ids_for_user(user, legacy_user)
    managed_positions = _managed_staff_positions_for_user(user)
    roles = _roles_for_ids(role_ids)
    managed_roles = _managed_roles_for_ids(role_ids)
    admin_role = next((role for role in roles if _is_true(role.IsAdmin)), None)
    managed_admin_role = next((role for role in managed_roles if _is_true(role.is_admin)), None)
    primary_role = admin_role or (roles[0] if roles else None)
    primary_managed_role = managed_admin_role or (managed_roles[0] if managed_roles else None)
    prefer_managed_role = bool(primary_managed_role and (managed_positions or primary_role is None))
    is_admin = _is_django_admin(user) or bool(admin_role or managed_admin_role)

    if prefer_managed_role:
        role_info = _serialize_managed_role(primary_managed_role, user)
    elif primary_role:
        role_info = _serialize_role(primary_role, user)
    elif primary_managed_role:
        role_info = _serialize_managed_role(primary_managed_role, user)
    else:
        role_info = _serialize_role(None, user)

    if is_admin:
        role_info.update({
            'isAdmin': True,
            'IsAdmin': True,
            'canReceiveTask': True if role_info == {} else role_info.get('canReceiveTask', True),
            'canAssignTask': True if role_info == {} else role_info.get('canAssignTask', True),
            'canSeeDepartmentTasks': True if role_info == {} else role_info.get('canSeeDepartmentTasks', True),
        })

    permission_info = _admin_permission_info() if is_admin else _permission_info_for_roles(role_ids, managed_positions)
    staff = _legacy_staff_for_user(legacy_user)
    user_info = build_user_info(user, legacy_user, staff, role_info)

    return {
        'roleInfo': role_info,
        'permissionInfo': permission_info,
        'userInfo': user_info,
        'legacyUserID': getattr(legacy_user, 'ID', None),
    }
