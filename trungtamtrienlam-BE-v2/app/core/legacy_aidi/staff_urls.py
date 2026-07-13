from django.urls import path

from core.legacy_aidi.staff_api import LegacyStaffCreateApi
from core.legacy_aidi.staff_api import LegacyStaffDeleteApi
from core.legacy_aidi.staff_api import LegacyStaffDetailApi
from core.legacy_aidi.staff_api import LegacyStaffListApi
from core.legacy_aidi.staff_api import LegacyStaffUpdateApi


urlpatterns = [
    path('create', LegacyStaffCreateApi.as_view()),
    path('update', LegacyStaffUpdateApi.as_view()),
    path('getlist', LegacyStaffListApi.as_view()),
    path('GetDetail', LegacyStaffDetailApi.as_view()),
    path('Delete', LegacyStaffDeleteApi.as_view()),
]
