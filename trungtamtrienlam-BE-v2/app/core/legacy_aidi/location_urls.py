from django.urls import path

from core.legacy_aidi.location_api import DistrictListByProvinceApi
from core.legacy_aidi.location_api import ProvinceListApi
from core.legacy_aidi.location_api import WardListByDistrictApi


urlpatterns = [
    path('province/getlist', ProvinceListApi.as_view()),
    path('district/getlistbyprovince', DistrictListByProvinceApi.as_view()),
    path('ward/getlistbydistrict', WardListByDistrictApi.as_view()),
]
