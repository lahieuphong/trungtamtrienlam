from django.urls import path

from core.legacy_aidi.api import PermissionByUserApi
from core.legacy_aidi.permission_management_api import PermissionCloneApi
from core.legacy_aidi.permission_management_api import PermissionListApi
from core.legacy_aidi.permission_management_api import PermissionUpdateApi


urlpatterns = [
    path('get', PermissionListApi.as_view()),
    path('update', PermissionUpdateApi.as_view()),
    path('Clone', PermissionCloneApi.as_view()),
    path('GetByUserID', PermissionByUserApi.as_view()),
]
