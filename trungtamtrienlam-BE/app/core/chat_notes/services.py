"""Services for managed chat notes."""

import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

from core.chat_notes.models import ManagedChatNote
from core.chats.models import ManagedChat
from core.chats.models import ManagedChatMessage
from core.chats.models import ManagedChatUser
from core.chats.realtime import broadcast_chat_message


MESSAGE_TYPE_EVENT = 5
EVENT_TYPE_NOTE = 1

CREATE_NOTE_TEMPLATE = '{name} \u0111\u00e3 t\u1ea1o ghi ch\u00fa m\u1edbi'
UPDATE_NOTE_TEMPLATE = '{name} \u0111\u00e3 c\u1eadp nh\u1eadt ghi ch\u00fa'
DELETE_NOTE_TEMPLATE = '{name} \u0111\u00e3 xo\u00e1 ghi ch\u00fa'


def new_id():
    return str(uuid.uuid4())


def string(value):
    if value is None:
        return ''
    return str(value).strip()


def bool_value(value):
    if isinstance(value, bool):
        return value
    return string(value).lower() in {'1', 'true', 'yes', 'on'}


def request_data(request):
    return getattr(request, 'data', {}) or {}


def data_value(data, *fields):
    for field in fields:
        if field in data:
            return data[field]
    return None


def user_display(user_id):
    lookup = string(user_id)
    if not lookup:
        return {'id': '', 'full_name': '', 'avatar': ''}

    User = get_user_model()
    user = User.objects.filter(id=lookup).first()
    if not user:
        user = User.objects.filter(Q(username=lookup) | Q(email=lookup)).first()

    if not user:
        return {'id': lookup, 'full_name': lookup, 'avatar': ''}

    staff = None
    try:
        from core.departments.models import Staff
        staff = (
            Staff.objects
            .filter(user_id=getattr(user, 'id', None), is_deleted=False)
            .order_by('-is_manager', '-updated_at', '-created_at')
            .first()
        )
    except Exception:
        staff = None

    staff_name = string(getattr(staff, 'full_name', '') if staff else '')
    full_name = staff_name or string(user.get_full_name()) or string(getattr(user, 'username', '')) or lookup
    avatar = string(getattr(staff, 'avatar', '') if staff else '') or string(getattr(user, 'avatar', ''))
    return {
        'id': string(getattr(user, 'id', lookup)),
        'full_name': full_name,
        'avatar': avatar,
    }


def actor_from_request(request):
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        user_id = string(getattr(user, 'id', None))
        name = string(
            user.get_full_name()
            or getattr(user, 'username', None)
        )
        return {'id': user_id, 'name': name or user_id}

    data = request_data(request)
    user_id = string(
        data.get('SenderID')
        or data.get('UserID')
        or data.get('userID')
        or data.get('CreatedBy')
        or data.get('createdBy')
        or data.get('currentUserID')
        or request.query_params.get('SenderID')
        or request.query_params.get('UserID')
        or request.query_params.get('userID')
        or request.query_params.get('CreatedBy')
        or request.query_params.get('createdBy')
        or request.query_params.get('currentUserID')
    )
    display = user_display(user_id)
    return {'id': user_id, 'name': display['full_name'] or user_id}


def chat_user_ids(chat_id, extra_user_ids=None):
    user_ids = list(
        ManagedChatUser.objects
        .filter(chat_id=chat_id)
        .values_list('user_id', flat=True)
    )

    for user_id in extra_user_ids or []:
        user_id = string(user_id)
        if user_id and user_id not in user_ids:
            user_ids.append(user_id)

    return [user_id for user_id in user_ids if user_id]


def serialize_message(message):
    sender = user_display(message.sender_id)
    created_date = message.created_date.isoformat() if message.created_date else None
    return {
        'id': message.id,
        'senderID': message.sender_id,
        'chatID': message.chat_id,
        'content': message.content,
        'replyToID': message.reply_to_id or None,
        'messageType': message.message_type,
        'createdDate': created_date,
        'chatFiles': '',
        'chatLinks': '',
        'senderName': sender['full_name'],
        'senderAvatar': sender['avatar'],
        'avatar': sender['avatar'],
        'eventID': message.event_id or None,
        'eventType': message.event_type,
        'isDeleted': message.is_deleted,
        'isUnsend': message.is_unsend,
        'isPin': message.is_pin,
        'seenBy': '[]',
        'notePin': False,
        'listUserJoinRemind': message.list_user_join_remind or '',
    }


def serialize_note(note):
    creator = user_display(note.created_by)
    created_date = note.created_date.isoformat() if note.created_date else None
    pin_date = note.pin_date.isoformat() if note.pin_date else None
    return {
        'id': note.id,
        'chatID': note.chat_id,
        'note': note.note,
        'createdDate': created_date,
        'createdBy': note.created_by,
        'isDeleted': bool(note.is_deleted),
        'isPinned': bool(note.is_pinned),
        'isPin': bool(note.is_pinned),
        'createdName': creator['full_name'],
        'pinDate': pin_date,
        'avatar': creator['avatar'],
    }


def note_queryset(chat_id):
    return (
        ManagedChatNote.objects
        .filter(chat_id=chat_id)
        .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        .order_by('-is_pinned', '-pin_date', '-created_date', 'id')
    )


def get_note_detail(note_id):
    return (
        ManagedChatNote.objects
        .filter(id=note_id)
        .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        .first()
    )


def create_note_event(chat_id, actor_id, content, note_id):
    chat = ManagedChat.objects.filter(id=chat_id).first()
    if chat:
        chat.updated_by = actor_id
        chat.message_type = MESSAGE_TYPE_EVENT
        chat.event_type = EVENT_TYPE_NOTE
        chat.save(update_fields=['updated_by', 'message_type', 'event_type', 'updated_date'])

    return ManagedChatMessage.objects.create(
        sender_id=actor_id,
        message_type=MESSAGE_TYPE_EVENT,
        content=content,
        chat_id=chat_id,
        event_id=note_id,
        event_type=EVENT_TYPE_NOTE,
    )


def broadcast_note_event(chat_id, actor_id, message):
    user_ids = chat_user_ids(chat_id, [actor_id])
    payload = serialize_message(message)
    transaction.on_commit(
        lambda chat_id=chat_id, target_user_ids=user_ids, data=payload:
        broadcast_chat_message(chat_id, target_user_ids, data)
    )


def unpin_notes(event_ids):
    if not event_ids:
        return 0
    return ManagedChatNote.objects.filter(id__in=event_ids).update(is_pinned=False)


