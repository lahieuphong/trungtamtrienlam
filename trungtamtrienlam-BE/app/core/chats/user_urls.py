from django.urls import path

from core.chats.user_api import UserListDropdownForChatsApi


urlpatterns = [
    path('getlistdropdownForChats', UserListDropdownForChatsApi.as_view()),
]

