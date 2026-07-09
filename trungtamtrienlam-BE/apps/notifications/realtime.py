import logging
import re

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def notification_user_group_name(user_id):
    cleaned = re.sub(r'[^a-zA-Z0-9_.-]', '_', str(user_id or 'unknown'))
    return f'notification.user.{cleaned}'[:100]


def broadcast_notification(user_ids, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    event = {
        'type': 'notification.notify',
        'event': 'Notify',
        'data': payload,
    }
    for user_id in sorted({str(item) for item in user_ids if item}):
        try:
            async_to_sync(channel_layer.group_send)(notification_user_group_name(user_id), event)
        except Exception as exc:
            logger.warning('Cannot broadcast notification event to %s: %s', user_id, exc)
