from django.urls import path

from core.chat_reminds.api import ChatRemindCreateApi
from core.chat_reminds.api import ChatRemindDetailApi
from core.chat_reminds.api import ChatRemindListApi
from core.chat_reminds.api import ChatRemindUpdateApi
from core.chat_reminds.api import ChatRemindUserJoinApi


urlpatterns = [
    path('GetList', ChatRemindListApi.as_view()),
    path('GetDetail', ChatRemindDetailApi.as_view()),
    path('CreateRemind', ChatRemindCreateApi.as_view()),
    path('UpdateRemind', ChatRemindUpdateApi.as_view()),
    path('UserJoinChatRemind', ChatRemindUserJoinApi.as_view()),
]

