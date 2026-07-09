from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.chats.models import ManagedChat
from apps.chats.models import ManagedChatUser
from apps.chats.realtime import chat_group_name
from apps.chats.realtime import user_group_name
from apps.notifications.realtime import notification_user_group_name


HERITAGE_ASSISTANT_CHAT_ID = 'heritage-assistant'


def _scope_user_id(scope):
    user = scope.get('user')
    if user and getattr(user, 'is_authenticated', False):
        return str(user.id)
    return str(scope.get('legacy_user_id') or '').strip()


def _query_value(scope, *names):
    query = parse_qs(scope.get('query_string', b'').decode(errors='ignore'))
    for name in names:
        values = query.get(name)
        if values:
            return values[0]
    return ''


@database_sync_to_async
def _can_join_chat(chat_id, user_id):
    if not chat_id:
        return False
    if chat_id == HERITAGE_ASSISTANT_CHAT_ID:
        return True
    if not ManagedChat.objects.filter(id=chat_id).exists():
        return False
    if not user_id:
        return False
    return ManagedChatUser.objects.filter(chat_id=chat_id, user_id=user_id).exists()


@database_sync_to_async
def _chat_user_ids(chat_id):
    return list(
        ManagedChatUser.objects
        .filter(chat_id=chat_id)
        .values_list('user_id', flat=True)
    )


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user_id = _scope_user_id(self.scope)
        self.joined_chat_groups = set()

        await self.accept()

        if self.user_id:
            await self.channel_layer.group_add(user_group_name(self.user_id), self.channel_name)
            await self.channel_layer.group_add(notification_user_group_name(self.user_id), self.channel_name)

        chat_id = _query_value(self.scope, 'chatID', 'chatId')
        if chat_id:
            await self._subscribe_chat(chat_id)

        await self.send_json({
            'event': 'Connected',
            'data': {
                'userID': self.user_id,
            },
        })

    async def disconnect(self, close_code):
        if self.user_id:
            await self.channel_layer.group_discard(user_group_name(self.user_id), self.channel_name)
            await self.channel_layer.group_discard(notification_user_group_name(self.user_id), self.channel_name)

        for group_name in self.joined_chat_groups:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        action = str(content.get('action') or content.get('type') or '').lower()

        if action in {'subscribe', 'join'}:
            await self._subscribe_chat(content.get('chatID') or content.get('chatId'))
            return

        if action in {'unsubscribe', 'leave'}:
            await self._unsubscribe_chat(content.get('chatID') or content.get('chatId'))
            return

        if action == 'typing':
            await self._send_typing(content)
            return

        if action == 'ping':
            await self.send_json({'event': 'Pong', 'data': None})

    async def _subscribe_chat(self, chat_id):
        chat_id = str(chat_id or '').strip()
        if not await _can_join_chat(chat_id, self.user_id):
            await self.send_json({
                'event': 'SubscribeRejected',
                'data': {
                    'chatID': chat_id,
                },
            })
            return

        group_name = chat_group_name(chat_id)
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.joined_chat_groups.add(group_name)
        await self.send_json({
            'event': 'Subscribed',
            'data': {
                'chatID': chat_id,
            },
        })

    async def _unsubscribe_chat(self, chat_id):
        group_name = chat_group_name(chat_id)
        await self.channel_layer.group_discard(group_name, self.channel_name)
        self.joined_chat_groups.discard(group_name)
        await self.send_json({
            'event': 'Unsubscribed',
            'data': {
                'chatID': chat_id,
            },
        })

    async def _send_typing(self, content):
        chat_id = str(content.get('chatID') or content.get('chatId') or '').strip()
        user_ids = await _chat_user_ids(chat_id)
        event = {
            'type': 'chat.typing',
            'event': 'Typing',
            'data': {
                'chatId': chat_id,
                'chatID': chat_id,
                'userId': self.user_id,
                'userID': self.user_id,
                'isTyping': bool(content.get('isTyping')),
            },
        }

        for user_id in user_ids:
            await self.channel_layer.group_send(user_group_name(user_id), event)

    async def chat_message(self, event):
        await self.send_json({
            'event': event.get('event', 'Chat'),
            'data': event.get('data'),
        })

    async def chat_typing(self, event):
        await self.send_json({
            'event': event.get('event', 'Typing'),
            'data': event.get('data'),
        })

    async def notification_notify(self, event):
        await self.send_json({
            'event': event.get('event', 'Notify'),
            'data': event.get('data'),
        })

    async def notification_reload(self, event):
        await self.send_json({
            'event': event.get('event', 'ReloadNotification'),
            'data': event.get('data'),
        })

    async def notification_push(self, event):
        await self.send_json({
            'event': event.get('event', 'PushNotification'),
            'data': event.get('data'),
        })

    async def notification_maintenance(self, event):
        await self.send_json({
            'event': event.get('event', 'Maintenance'),
            'data': event.get('data'),
        })

    async def notification_finish(self, event):
        await self.send_json({
            'event': event.get('event', 'Finish'),
            'data': event.get('data'),
        })

