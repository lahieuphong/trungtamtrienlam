from django.urls import path

from core.legacy_aidi.role_api import RoleListDropdownApi
from core.legacy_aidi.role_api import RoleListForAccountApi


urlpatterns = [
    path('GetListForAccount', RoleListForAccountApi.as_view()),
    path('getlist', RoleListDropdownApi.as_view()),
]
