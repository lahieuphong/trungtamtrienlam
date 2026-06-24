from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.BackupLogViewSet, basename='backup-log')
router.register(r'restore-logs', views.RestoreLogViewSet, basename='restore-log')

urlpatterns = [path('', include(router.urls))]
