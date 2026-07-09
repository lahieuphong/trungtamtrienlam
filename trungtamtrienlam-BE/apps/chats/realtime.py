import re
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


logger = logging.getLogger(__name__)


def chat_group_name(chat_id):
    return _group_name('chat', chat_id)


def user_group_name(user_id):
    return _group_name('user', user_id)


def _group_name(prefix, value):
    cleaned = re.sub(r'[^a-zA-Z0-9_.-]', '_', str(value or 'unknown'))
    return f'{prefix}.{cleaned}'[:100]


def broadcast_chat_message(chat_id, user_ids, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    event = {
        'type': 'chat.message',
        'event': 'Chat',
        'data': payload,
    }

    target_user_ids = sorted({str(user_id) for user_id in user_ids if user_id})
    if not target_user_ids:
        _safe_group_send(channel_layer, chat_group_name(chat_id), event)
        return

    for user_id in target_user_ids:
        _safe_group_send(channel_layer, user_group_name(user_id), event)


def broadcast_typing(chat_id, user_ids, user_id, is_typing):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    event = {
        'type': 'chat.typing',
        'event': 'Typing',
        'data': {
            'chatId': chat_id,
            'chatID': chat_id,
            'userId': user_id,
            'userID': user_id,
            'isTyping': bool(is_typing),
        },
    }

    for target_user_id in sorted({str(item) for item in user_ids if item}):
        _safe_group_send(channel_layer, user_group_name(target_user_id), event)


def _safe_group_send(channel_layer, group_name, event):
    try:
        async_to_sync(channel_layer.group_send)(group_name, event)
    except Exception as exc:
        logger.warning('Cannot broadcast chat event to %s: %s', group_name, exc)

