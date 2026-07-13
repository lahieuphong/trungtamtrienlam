from django.db import DatabaseError
from django.db import connection
from django.db.models import Q
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.legacy_aidi.models import ManagedRole


def _success(payload):
    return Response({
        'status': 200,
        'message': 'L\u1ea5y d\u1eef li\u1ec7u th\u00e0nh c\u00f4ng',
        'data': {
            'status': 200,
            'message': None,
            'data': payload,
        },
        'errors': None,
    })


def _table_exists(model):
    try:
        table_names = connection.introspection.table_names()
    except DatabaseError:
        return False

    return model._meta.db_table in table_names


def _to_bool(value, default=False):
    return default if value is None else bool(value)


class RoleListForAccountApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return _success({'roles': self._get_roles()})

    def _get_roles(self):
        if not _table_exists(ManagedRole):
            return []

        try:
            roles = list(
                ManagedRole.objects
                .filter(
                    (Q(is_deleted=False) | Q(is_deleted__isnull=True))
                    & (Q(is_disabled=False) | Q(is_disabled__isnull=True))
                    & (Q(is_admin=False) | Q(is_admin__isnull=True))
                )
                .order_by('level', 'name')
            )
        except DatabaseError:
            return []

        return [self._serialize_managed(role) for role in roles]

    def _serialize_managed(self, role):
        return {
            'id': role.id,
            'name': role.name,
            'isAdmin': _to_bool(role.is_admin, default=False),
            'isDirector': role.is_director,
            'isDisabled': role.is_disabled,
            'isDeleted': role.is_deleted,
            'createdDate': role.created_date.isoformat() if role.created_date else None,
            'createdBy': role.created_by,
            'modifiedDate': role.modified_date.isoformat() if role.modified_date else None,
            'modifiedBy': role.modified_by,
            'level': role.level,
            'canReceiveTask': _to_bool(role.can_receive_task, default=False),
            'canAssignTask': _to_bool(role.can_assign_task, default=False),
            'canSeeDepartmentTasks': _to_bool(role.can_see_department_tasks, default=False),
            'isViceDirector': _to_bool(role.is_vice_director, default=False),
        }


class RoleListDropdownApi(RoleListForAccountApi):
    def _get_roles(self):
        if not _table_exists(ManagedRole):
            return []

        try:
            roles = list(
                ManagedRole.objects
                .filter(
                    (Q(is_deleted=False) | Q(is_deleted__isnull=True))
                    & (Q(is_disabled=False) | Q(is_disabled__isnull=True))
                )
                .order_by('level', 'name')
            )
        except DatabaseError:
            return []

        return [self._serialize_managed(role) for role in roles]
