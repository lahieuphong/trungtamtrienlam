from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.ChatViewSet, basename='chat')
router.register(r'messages', views.ChatMessageViewSet, basename='chat-message')
router.register(r'votes', views.ChatVoteViewSet, basename='chat-vote')

urlpatterns = [path('', include(router.urls))]
