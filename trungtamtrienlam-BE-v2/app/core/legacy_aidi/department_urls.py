from django.urls import path

from core.legacy_aidi.department_api import DepartmentListDropdownApi


urlpatterns = [
    path('getlistdropdown', DepartmentListDropdownApi.as_view()),
]
