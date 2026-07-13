from django.db import DatabaseError
from django.db import connection
from django.db.models import Q
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.legacy_aidi.models import LegacyOrganization


FALLBACK_ORGANIZATIONS = [
    {
        'id': 'org-trung-tam-bao-ton',
        'name': 'TT B\u1ea2O T\u1ed2N & PH\u00c1T HUY GI\u00c1 TR\u1eca DI T\u00cdCH L\u1ecaCH S\u1eec V\u0102N H\u00d3A TP HCM',
        'ID': 'org-trung-tam-bao-ton',
        'Name': 'TT B\u1ea2O T\u1ed2N & PH\u00c1T HUY GI\u00c1 TR\u1eca DI T\u00cdCH L\u1ecaCH S\u1eec V\u0102N H\u00d3A TP HCM',
        'isDeleted': False,
    },
]


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


def _is_active_filter():
    return Q(IsDeleted=False) | Q(IsDeleted__isnull=True)


class OrganizationListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return _success({'organizations': self._get_organizations()})

    def _get_organizations(self):
        if not _table_exists(LegacyOrganization):
            return FALLBACK_ORGANIZATIONS

        try:
            organizations = list(
                LegacyOrganization.objects
                .filter(_is_active_filter())
                .order_by('Name')
            )
        except DatabaseError:
            return FALLBACK_ORGANIZATIONS

        if not organizations:
            return FALLBACK_ORGANIZATIONS

        return [self._serialize(organization) for organization in organizations]

    def _serialize(self, organization):
        return {
            'id': organization.ID,
            'name': organization.Name,
            'ID': organization.ID,
            'Name': organization.Name,
            'isDeleted': organization.IsDeleted,
            'createdDate': organization.CreatedDate.isoformat() if organization.CreatedDate else None,
            'createdBy': organization.CreatedBy,
            'modifiedDate': organization.ModifiedDate.isoformat() if organization.ModifiedDate else None,
            'modifiedBy': organization.ModifiedBy,
        }
