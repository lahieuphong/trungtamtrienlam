from django.urls import path

from core.legacy_aidi.organization_api import OrganizationListApi


urlpatterns = [
    path('getlist', OrganizationListApi.as_view()),
]
