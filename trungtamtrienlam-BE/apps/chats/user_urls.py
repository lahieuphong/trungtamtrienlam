from django.urls import path

from apps.chats.user_api import UserListDropdownForChatsApi


urlpatterns = [
    path('getlistdropdownForChats', UserListDropdownForChatsApi.as_view()),
]

