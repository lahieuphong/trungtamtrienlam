from functools import reduce
from operator import or_

from django.core.cache import cache
from django.db.models import Q

from core.legacy_aidi.models import LegacyAction
from core.legacy_aidi.models import LegacyFunction
from core.legacy_aidi.models import LegacyPermission
from core.legacy_aidi.models import LegacyPermision
from core.legacy_aidi.models import LegacyRole
from core.legacy_aidi.models import LegacyUserConcurrently


ACTION_FLAG_FIELDS = {
    'View': 'IsView',
    'Get': 'IsView',
    'Add': 'IsAdd',
    'Create': 'IsAdd',
    'Edit': 'IsEdit',
    'Update': 'IsEdit',
    'Delete': 'IsDelete',
    'Confirm': 'IsConfirm',
    'Verify': 'IsVerify',
}


def _model_has_field(model, field_name):
    return any(field.name == field_name for field in model._meta.fields)


def _or_query(model, **lookups):
    conditions = []
    for field_name, value in lookups.items():
        if value is not None and _model_has_field(model, field_name):
            conditions.append(Q(**{field_name: value}))
    if not conditions:
        return Q(pk__isnull=True)
    return reduce(or_, conditions)


def _legacy_user_id(user_or_id):
    return str(getattr(user_or_id, 'legacy_id', None) or getattr(user_or_id, 'ID', None) or getattr(user_or_id, 'id', user_or_id))


def get_user_role_ids(user_or_id):
    user_id = _legacy_user_id(user_or_id)
    return list(
        LegacyUserConcurrently.objects
        .filter(UserID=user_id)
        .values_list('RoleID', flat=True)
        .distinct()
    )


def get_user_roles(user_or_id):
    role_ids = get_user_role_ids(user_or_id)
    if not role_ids:
        return LegacyRole.objects.none()
    return LegacyRole.objects.filter(ID__in=role_ids)


def is_user_admin(user_or_id):
    cache_key = f'legacy_aidi:is_admin:{_legacy_user_id(user_or_id)}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    result = get_user_roles(user_or_id).filter(IsAdmin=True).exists()
    cache.set(cache_key, result, 300)
    return result


def _function_ids(function_key):
    query = _or_query(
        LegacyFunction,
        ID=function_key,
        UniqueKey=function_key,
        UniqueCode=function_key,
        Name=function_key,
    )
    return list(LegacyFunction.objects.filter(query).values_list('ID', flat=True))


def _action_ids(action_key):
    query = _or_query(
        LegacyAction,
        ID=action_key,
        UniqueKey=action_key,
        UniqueCode=action_key,
        Name=action_key,
    )
    return list(LegacyAction.objects.filter(query).values_list('ID', flat=True))


def has_permission(user_or_id, function_key, action_key):
    """Return True when a legacy user has a function/action permission.

    This mirrors the 185-BE authorization flow: admin roles bypass checks;
    otherwise UserConcurrentlies -> Roles -> Permissions -> Functions/Actions.
    """
    if is_user_admin(user_or_id):
        return True

    role_ids = get_user_role_ids(user_or_id)
    if not role_ids:
        return False

    function_ids = _function_ids(function_key) or [function_key]
    action_ids = _action_ids(action_key) or [action_key]

    action_row_models = [LegacyPermission, LegacyPermision]
    for model in action_row_models:
        if all(_model_has_field(model, field) for field in ('RoleID', 'FunctionID', 'ActionID')):
            if model.objects.filter(
                RoleID__in=role_ids,
                FunctionID__in=function_ids,
                ActionID__in=action_ids,
            ).exists():
                return True

    flag_field = ACTION_FLAG_FIELDS.get(action_key)
    if flag_field and _model_has_field(LegacyPermission, flag_field):
        return LegacyPermission.objects.filter(
            RoleID__in=role_ids,
            FunctionID__in=function_ids,
            **{flag_field: True},
        ).exists()

    return False


def clear_legacy_permission_cache(user_or_id=None):
    if user_or_id is not None:
        cache.delete(f'legacy_aidi:is_admin:{_legacy_user_id(user_or_id)}')
        return
    # Backend cache implementations do not share a portable prefix delete API.
    # Keep this function as the single place to extend when the project chooses one.
