import json
import logging
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction

from core.chats.models import ManagedChatUser
from core.notifications.models import Notification
from core.notifications.realtime import broadcast_notification

logger = logging.getLogger(__name__)


def _as_uuid(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def _message_value(message, *names):
    if isinstance(message, dict):
        for name in names:
            if name in message and message.get(name) is not None:
                return message.get(name)
        return None

    for name in names:
        value = getattr(message, name, None)
        if value is not None:
            return value
    return None


def _string(value):
    if value is None:
        return ''
    return str(value).strip()


def _sender_full_name(sender_id, fallback_name=''):
    fallback_name = _string(fallback_name)
    if fallback_name:
        return fallback_name

    lookup = _string(sender_id)
    if not lookup:
        return ''

    User = get_user_model()
    lookup_uuid = _as_uuid(lookup)
    user = User.objects.filter(id=lookup_uuid).first() if lookup_uuid else None
    if not user:
        user = User.objects.filter(username=lookup).first() or User.objects.filter(email=lookup).first()
    if not user:
        return ''

    try:
        from core.departments.models import Staff
    except Exception:
        Staff = None

    staff = None
    if Staff:
        staff = (
            Staff.objects
            .filter(user_id=getattr(user, 'id', None), is_deleted=False)
            .order_by('-is_manager', '-updated_at', '-created_at')
            .first()
        )

    return (
        _string(getattr(staff, 'full_name', '') if staff else '')
        or _string(user.get_full_name())
        or _string(getattr(user, 'username', ''))
        or _string(getattr(user, 'email', ''))
        or lookup
    )


def _target_user_ids(chat_id, user_ids, sender_id, exclude_sender):
    if user_ids is None:
        user_ids = (
            ManagedChatUser.objects
            .filter(chat_id=chat_id)
            .values_list('user_id', flat=True)
        )

    return sorted({
        str(user_id)
        for user_id in user_ids
        if user_id and not (exclude_sender and str(user_id) == str(sender_id))
    })


def notify_events(chat_id, sender_id, message, event_kind='', user_ids=None, exclude_sender=False):
    target_user_ids = _target_user_ids(chat_id, user_ids, sender_id, exclude_sender)
    if not target_user_ids:
        return

    message_id = _message_value(message, 'id', 'ID') or ''
    event_id = _message_value(message, 'event_id', 'eventID', 'EventID') or ''
    event_type = _message_value(message, 'event_type', 'eventType', 'EventType')
    content = _message_value(message, 'content', 'Content') or 'Bạn có tin nhắn mới'
    sender_name = _sender_full_name(
        sender_id,
        _message_value(
            message,
            'senderName', 'SenderName',
            'senderFullName', 'SenderFullName',
            'fullName', 'FullName',
            'name', 'Name',
        ) or '',
    )
    notification_title = f'Tin nhắn từ {sender_name}' if sender_name else 'Tin nhắn'
    reference_uuid = _as_uuid(chat_id)
    meta_data = {
        'chatID': chat_id,
        'messageID': message_id,
        'senderID': sender_id,
        'senderName': sender_name,
        'eventID': event_id,
        'eventType': event_type,
        'eventKind': event_kind,
    }

    def publish_notifications():
        created_payloads = []
        for user_id in target_user_ids:
            user_uuid = _as_uuid(user_id)
            if not user_uuid:
                continue
            try:
                notification = Notification.objects.create(
                    user_id=user_uuid,
                    title=notification_title,
                    content=str(content),
                    notification_type=Notification.NotificationType.CHAT,
                    reference_id=reference_uuid,
                    reference_type='chat',
                    created_by=str(sender_id or ''),
                )
                created_payloads.append({
                    'id': str(notification.id),
                    'title': notification.title,
                    'content': notification.content,
                    'notificationType': notification.notification_type,
                    'referenceId': str(reference_uuid) if reference_uuid else str(chat_id or ''),
                    'referenceType': 'chat',
                    'metaData': json.dumps(meta_data, ensure_ascii=False),
                    'createdDate': notification.created_at.isoformat() if notification.created_at else None,
                    'userID': str(user_uuid),
                })
            except Exception:
                logger.exception('Cannot create chat notification for user %s', user_id)

        if created_payloads:
            broadcast_notification(
                [item['userID'] for item in created_payloads],
                created_payloads[0] if len(created_payloads) == 1 else created_payloads,
            )

    transaction.on_commit(publish_notifications)
