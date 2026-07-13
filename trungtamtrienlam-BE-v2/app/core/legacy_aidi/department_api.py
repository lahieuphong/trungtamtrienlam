from django.db import DatabaseError
from django.db import connection
from django.db.models import Q
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.legacy_aidi.models import ManagedDepartment


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


class DepartmentListDropdownApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return _success({'departments': self._get_departments()})

    def _get_departments(self):
        if not _table_exists(ManagedDepartment):
            return []

        try:
            departments = list(
                ManagedDepartment.objects
                .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
                .order_by('name')
            )
        except DatabaseError:
            return []

        return [self._serialize(department) for department in departments]

    def _serialize(self, department):
        return {
            'id': department.id,
            'name': department.name,
            'ID': department.id,
            'Name': department.name,
            'isDeleted': department.is_deleted,
            'createdDate': department.created_date.isoformat() if department.created_date else None,
            'createdBy': department.created_by,
            'modifiedDate': department.modified_date.isoformat() if department.modified_date else None,
            'modifiedBy': department.modified_by,
            'isPOAD': bool(department.is_poad),
        }
