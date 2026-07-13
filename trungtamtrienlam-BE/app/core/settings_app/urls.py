from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'system', views.SystemConfigViewSet, basename='system-config')
router.register(r'notification', views.SettingNotificationViewSet, basename='setting-notification')

urlpatterns = [path('', include(router.urls))]
