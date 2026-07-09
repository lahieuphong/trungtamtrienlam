from django.urls import path

from apps.chats.api import ChatCreateApi
from apps.chats.api import ChatAdminUserIdApi
from apps.chats.api import ChatAttachmentListApi
from apps.chats.api import ChatChooseLeaderApi
from apps.chats.api import ChatChooseSubLeaderApi
from apps.chats.api import ChatConfirmUserJoinGroupApi
from apps.chats.api import ChatDetailApi
from apps.chats.api import ChatInsertMemberApi
from apps.chats.api import ChatLeaveGroupApi
from apps.chats.api import ChatListApi
from apps.chats.api import ChatListUserWaitConfirmApi
from apps.chats.api import ChatPinnedMessageListApi
from apps.chats.api import ChatPinMessageApi
from apps.chats.api import ChatPinOrUnPinApi
from apps.chats.api import ChatRemoveFromGroupApi
from apps.chats.api import ChatRemoveGroupApi
from apps.chats.api import ChatRemoveSubLeaderApi
from apps.chats.api import ChatSeenApi
from apps.chats.api import ChatSendApi
from apps.chats.api import ChatUnpinMessageApi
from apps.chats.api import ChatUnsendMessageApi
from apps.chats.api import ChatUpdateAvatarApi
from apps.chats.api import ChatUpdateNameApi
from apps.chats.api import ChatUserByChatIDApi


urlpatterns = [
    path('CreateChat', ChatCreateApi.as_view()),
    path('GetList', ChatListApi.as_view()),
    path('SendChat', ChatSendApi.as_view()),
    path('GetDetail', ChatDetailApi.as_view()),
    path('SeenChat', ChatSeenApi.as_view()),
    path('PinOrUnPinChat', ChatPinOrUnPinApi.as_view()),
    path('UnSend', ChatUnsendMessageApi.as_view()),
    path('PinMess', ChatPinMessageApi.as_view()),
    path('GetMessPin', ChatPinnedMessageListApi.as_view()),
    path('UnpinMess', ChatUnpinMessageApi.as_view()),
    path('UpdateChatName', ChatUpdateNameApi.as_view()),
    path('UpdateChatAvatar', ChatUpdateAvatarApi.as_view()),
    path('GetUserByChatID', ChatUserByChatIDApi.as_view()),
    path('GetAttack', ChatAttachmentListApi.as_view()),
    path('GetUserIDAdmin', ChatAdminUserIdApi.as_view()),
    path('InsertMember', ChatInsertMemberApi.as_view()),
    path('ListUserWaitConfirm', ChatListUserWaitConfirmApi.as_view()),
    path('ConfirmUserJoinGroup', ChatConfirmUserJoinGroupApi.as_view()),
    path('LeaveGroup', ChatLeaveGroupApi.as_view()),
    path('ChooseSubLeader', ChatChooseSubLeaderApi.as_view()),
    path('RemoveSubLeader', ChatRemoveSubLeaderApi.as_view()),
    path('ChooseLeader', ChatChooseLeaderApi.as_view()),
    path('RemoveFromGroup', ChatRemoveFromGroupApi.as_view()),
    path('RemoveGroup', ChatRemoveGroupApi.as_view()),
]

