import uuid

from django.db.models import Q
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class HasModulePermission(BasePermission):
    """Check RBAC permissions by function and action when a view opts in."""

    method_action_map = {
        'GET': 'view',
        'HEAD': 'view',
        'OPTIONS': 'view',
        'POST': 'add',
        'PUT': 'edit',
        'PATCH': 'edit',
        'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        function_key = getattr(view, 'permission_function', None) or getattr(view, 'function_key', None)
        if not function_key:
            return True

        action_code = getattr(view, 'permission_action', None) or self.method_action_map.get(request.method, 'view')
        return user_has_permission(request.user, function_key, action_code)


def user_has_permission(user, function_key, action_code):
    from core.accounts.models import UserConcurrently
    from core.authentication.models import Function, Permission, Role

    role_ids = set(user.user_roles.values_list('role_id', flat=True))
    scoped_permission_q = Q(pk__isnull=True)
    has_scoped_permissions = False

    assignments = UserConcurrently.objects.filter(
        user=user,
        is_deleted=False,
        role_id__isnull=False,
    ).values_list('role_id', 'department_id')
    for role_id, department_id in assignments:
        role_ids.add(role_id)
        if department_id:
            scoped_permission_q |= Q(role_id=role_id, department_id=department_id)
            has_scoped_permissions = True

    role_ids.discard(None)
    if not role_ids:
        return False

    function_q = Q(icon=function_key) | Q(url=function_key)
    try:
        function_q |= Q(id=uuid.UUID(str(function_key)))
    except (TypeError, ValueError):
        pass
    function_ids = Function.objects.filter(function_q, is_deleted=False).values_list('id', flat=True)

    global_role_ids = set(Role.objects.filter(
        id__in=list(role_ids),
        is_deleted=False,
    ).filter(Q(is_admin=True) | Q(is_director=True)).values_list('id', flat=True))
    permission_q = Q(role_id__in=list(global_role_ids), department__isnull=True)
    if has_scoped_permissions:
        permission_q |= scoped_permission_q

    return Permission.objects.filter(
        permission_q,
        function_id__in=function_ids,
        action__code=action_code,
    ).exists()
