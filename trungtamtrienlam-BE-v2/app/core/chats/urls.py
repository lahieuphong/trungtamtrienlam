from django.urls import path

from core.chats.api import ChatCreateApi
from core.chats.api import ChatAdminUserIdApi
from core.chats.api import ChatAttachmentListApi
from core.chats.api import ChatChooseLeaderApi
from core.chats.api import ChatChooseSubLeaderApi
from core.chats.api import ChatConfirmUserJoinGroupApi
from core.chats.api import ChatDetailApi
from core.chats.api import ChatEventsApi
from core.chats.api import ChatInsertMemberApi
from core.chats.api import ChatLeaveGroupApi
from core.chats.api import ChatListApi
from core.chats.api import ChatListUserWaitConfirmApi
from core.chats.api import ChatPinnedMessageListApi
from core.chats.api import ChatPinMessageApi
from core.chats.api import ChatPinOrUnPinApi
from core.chats.api import ChatRemoveFromGroupApi
from core.chats.api import ChatRemoveGroupApi
from core.chats.api import ChatRemoveSubLeaderApi
from core.chats.api import ChatSeenApi
from core.chats.api import ChatSendApi
from core.chats.api import ChatUnpinMessageApi
from core.chats.api import ChatUnsendMessageApi
from core.chats.api import ChatUpdateAvatarApi
from core.chats.api import ChatUpdateNameApi
from core.chats.api import ChatUserByChatIDApi


urlpatterns = [
    path('CreateChat', ChatCreateApi.as_view()),
    path('GetList', ChatListApi.as_view()),
    path('SendChat', ChatSendApi.as_view()),
    path('Events', ChatEventsApi.as_view()),
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

