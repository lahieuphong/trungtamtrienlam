from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.TaskViewSet, basename='task')
router.register(r'documents', views.TaskDocumentViewSet, basename='task-document')
router.register(r'chats', views.TaskChatViewSet, basename='task-chat')

urlpatterns = [path('', include(router.urls))]
