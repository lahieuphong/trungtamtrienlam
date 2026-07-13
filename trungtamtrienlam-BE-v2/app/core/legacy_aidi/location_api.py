from django.db import DatabaseError
from django.db import connection
from django.db.models import Q
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.legacy_aidi.models import LegacyDistrict
from core.legacy_aidi.models import LegacyProvince
from core.legacy_aidi.models import LegacyWard
from core.legacy_aidi.location_fallback import FALLBACK_PROVINCES
from core.legacy_aidi.location_fallback import get_fallback_districts
from core.legacy_aidi.location_fallback import get_fallback_wards


def _is_enabled_filter():
    return Q(IsDisabled=False) | Q(IsDisabled__isnull=True)


def _clean_param(value):
    value = (value or '').strip()
    return value or None


def _success(payload):
    return Response({
        'status': 200,
        'data': {
            'data': payload,
        },
    })


def _table_exists(model):
    try:
        table_names = connection.introspection.table_names()
    except DatabaseError:
        return False

    return model._meta.db_table in table_names


class ProvinceListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        if not _table_exists(LegacyProvince):
            return _success({'provinces': FALLBACK_PROVINCES})

        provinces = (
            LegacyProvince.objects
            .filter(_is_enabled_filter())
            .order_by('Name')
        )

        return _success({
            'provinces': [self._serialize(province) for province in provinces],
        })

    def _serialize(self, province):
        return {
            'id': province.ID,
            'name': province.Name,
            'ID': province.ID,
            'Name': province.Name,
            'isDisabled': province.IsDisabled,
        }


class DistrictListByProvinceApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        province_id = _clean_param(
            request.query_params.get('provinceId')
            or request.query_params.get('provinceID')
            or request.query_params.get('ProvinceID')
        )

        if not _table_exists(LegacyDistrict):
            return _success({'districts': get_fallback_districts(province_id)})

        districts = LegacyDistrict.objects.filter(_is_enabled_filter())
        if province_id:
            districts = districts.filter(ProvinceID=province_id)

        districts = districts.order_by('Name')

        return _success({
            'districts': [self._serialize(district) for district in districts],
        })

    def _serialize(self, district):
        return {
            'id': district.ID,
            'name': district.Name,
            'ID': district.ID,
            'Name': district.Name,
            'provinceID': district.ProvinceID,
            'provinceId': district.ProvinceID,
            'ProvinceID': district.ProvinceID,
            'isDisabled': district.IsDisabled,
        }


class WardListByDistrictApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        district_id = _clean_param(
            request.query_params.get('districtId')
            or request.query_params.get('districtID')
            or request.query_params.get('DistrictID')
        )

        if not _table_exists(LegacyWard):
            return _success({'wards': get_fallback_wards(district_id)})

        wards = LegacyWard.objects.filter(_is_enabled_filter())
        if district_id:
            wards = wards.filter(DistrictID=district_id)

        wards = wards.order_by('Name')

        return _success({
            'wards': [self._serialize(ward) for ward in wards],
        })

    def _serialize(self, ward):
        return {
            'id': ward.ID,
            'name': ward.Name,
            'ID': ward.ID,
            'Name': ward.Name,
            'districtID': ward.DistrictID,
            'districtId': ward.DistrictID,
            'DistrictID': ward.DistrictID,
            'isDisabled': ward.IsDisabled,
        }
