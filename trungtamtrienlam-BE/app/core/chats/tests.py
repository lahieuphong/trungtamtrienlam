import json
import uuid

from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.chats.api import ChatCreateApi
from core.chats.api import ChatListApi
from core.chats.api import ChatSendApi
from core.chats.models import ManagedChat
from core.chats.models import ManagedChatMessage


class PrivateChatIdentityTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_a = str(uuid.uuid4())
        self.user_b = str(uuid.uuid4())

    def _send(self, sender_id, peer_id, content):
        request = self.factory.post(
            '/api/Chat/SendChat',
            {
                'SenderID': sender_id,
                'ChatType': 1,
                'ChatUsers': json.dumps([{'UserID': peer_id}]),
                'MessageType': 1,
                'Content': content,
                'ChatID': '',
            },
            format='multipart',
        )
        return ChatSendApi.as_view()(request)

    def _create(self, sender_id, peer_id, chat_type=1):
        request = self.factory.post(
            '/api/Chat/CreateChat',
            {
                'SenderID': sender_id,
                'Type': chat_type,
                'ChatUsers': json.dumps([{'UserID': peer_id}]),
                'Name': '',
            },
            format='multipart',
        )
        return ChatCreateApi.as_view()(request)

    @staticmethod
    def _payload(response):
        return response.data['data']['data']

    def test_send_without_chat_id_reuses_chat_in_both_directions(self):
        first = self._send(self.user_a, self.user_b, 'first')
        second = self._send(self.user_b, self.user_a, 'second')

        first_chat_id = self._payload(first)['chatID']
        second_chat_id = self._payload(second)['chatID']

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first_chat_id, second_chat_id)
        self.assertEqual(
            ManagedChat.objects.filter(type=1, is_deleted=False).count(),
            1,
        )
        self.assertEqual(
            ManagedChatMessage.objects.filter(chat_id=first_chat_id).count(),
            2,
        )

    def test_create_chat_reuses_private_chat_but_not_group_chat(self):
        first_private = self._create(self.user_a, self.user_b)
        second_private = self._create(self.user_b, self.user_a)
        self.assertEqual(
            self._payload(first_private),
            self._payload(second_private),
        )

        first_group = self._create(self.user_a, self.user_b, chat_type=2)
        second_group = self._create(self.user_a, self.user_b, chat_type=2)
        self.assertNotEqual(
            self._payload(first_group),
            self._payload(second_group),
        )

    def test_chat_list_returns_peer_user_id(self):
        sent = self._send(self.user_a, self.user_b, 'hello')
        chat_id = self._payload(sent)['chatID']

        request_a = self.factory.get(
            '/api/Chat/GetList',
            {'type': 1, 'currentUserID': self.user_a},
        )
        request_b = self.factory.get(
            '/api/Chat/GetList',
            {'type': 1, 'currentUserID': self.user_b},
        )
        chats_a = self._payload(ChatListApi.as_view()(request_a))
        chats_b = self._payload(ChatListApi.as_view()(request_b))

        self.assertEqual(len(chats_a), 1)
        self.assertEqual(len(chats_b), 1)
        self.assertEqual(chats_a[0]['id'], chat_id)
        self.assertEqual(chats_b[0]['id'], chat_id)
        self.assertEqual(chats_a[0]['userID'], self.user_b)
        self.assertEqual(chats_b[0]['userID'], self.user_a)
