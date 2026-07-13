from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'folders', views.FolderViewSet, basename='folder')
router.register(r'files', views.MediaFileViewSet, basename='media-file')

urlpatterns = [path('', include(router.urls))]
