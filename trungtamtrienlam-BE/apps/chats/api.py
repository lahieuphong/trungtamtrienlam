import asyncio
import json
import logging
import os
from pathlib import Path

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import DatabaseError
from django.db.models import Q
from django.db import transaction
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chats.models import ManagedChat
from apps.chats.models import ManagedChatAwaitConfirm
from apps.chats.models import ManagedChatFile
from apps.chats.models import ManagedChatLink
from apps.chats.models import ManagedChatMessage
from apps.chats.models import ManagedChatPin
from apps.chats.models import ManagedChatSeen
from apps.chats.models import ManagedChatUser
from apps.chats.realtime import broadcast_chat_message
from apps.chats.realtime import user_group_name
from apps.notifications.realtime import notification_user_group_name
from apps.notifications.notify_events import notify_events


logger = logging.getLogger(__name__)


def _sse_payload(event_name, data=None):
    payload = json.dumps({
        'event': event_name,
        'data': data,
    }, ensure_ascii=False)
    return f'data: {payload}\n\n'


async def _receive_channel_event(channel_layer, channel_name, timeout=25):
    try:
        return await asyncio.wait_for(channel_layer.receive(channel_name), timeout=timeout)
    except asyncio.TimeoutError:
        return None


CHAT_TYPE_PRIVATE = 1
CHAT_TYPE_GROUP = 2
CHAT_ROLE_LEADER = 1
CHAT_ROLE_VICE_LEADER = 2
CHAT_ROLE_MEMBER = 3
VALID_CHAT_ROLES = {CHAT_ROLE_LEADER, CHAT_ROLE_VICE_LEADER, CHAT_ROLE_MEMBER}
MESSAGE_TYPE_TEXT = 1
MESSAGE_TYPE_EVENT = 5
MESSAGE_TYPE_UNSEND = 6
MESSAGE_TYPE_PIN = 7
MESSAGE_TYPE_UNPIN = 8
CHAT_AWAIT_STATUS_WAITING = 1
CHAT_AWAIT_STATUS_ACCEPTED = 2
CHAT_AWAIT_STATUS_REJECTED = 3
HERITAGE_ASSISTANT_CHAT_ID = 'heritage-assistant'
HERITAGE_ASSISTANT_USER_ID = 'heritage-1'
HERITAGE_ASSISTANT_NAME = 'Trợ lý trung tâm bảo tồn di tích'
HERITAGE_ASSISTANT_AVATAR = '/TTBT_icon_anim_idle.gif'
PIN_DATE_UNSET = object()
AVATAR_UPDATED_EVENT_TEXT = '\u0111\u00e3 \u0111\u1ed5i \u1ea3nh \u0111\u1ea1i di\u1ec7n nh\u00f3m'
MOJIBAKE_AVATAR_UPDATED_EVENT_TEXT = (
    '\xc4\u2018\xc3\xa3 \xc4\u2018\xe1\xbb\u2022i '
    '\xe1\xba\xa3nh \xc4\u2018\xe1\xba\xa1i di\xe1\xbb\u2021n nh\xc3\xb3m'
)


def _normalize_chat_content(value):
    if not isinstance(value, str) or not value:
        return value

    return value.replace(
        MOJIBAKE_AVATAR_UPDATED_EVENT_TEXT,
        AVATAR_UPDATED_EVENT_TEXT,
    )


def _success(payload=None):
    return Response({
        'status': 200,
        'message': 'Lấy dữ liệu thành công',
        'data': {
            'status': 200,
            'message': None,
            'data': payload,
        },
        'errors': None,
    })


def _failure(message='Thao tác thất bại', status=400):
    return Response({
        'status': status,
        'message': message,
        'data': None,
        'errors': [message],
    }, status=status)


def _string(value):
    if value is None:
        return ''
    return str(value).strip()


def _optional_string(value):
    text = _string(value)
    return '' if text.lower() in {'null', 'undefined', 'none'} else text


def _bool(value):
    if isinstance(value, bool):
        return value
    return _string(value).lower() in {'1', 'true', 'yes', 'on'}


def _int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _chat_role(value):
    role = _int(value, CHAT_ROLE_MEMBER)
    return role if role in VALID_CHAT_ROLES else CHAT_ROLE_MEMBER


def _normalize_chat_member(member):
    if not member:
        return None

    role = _chat_role(member.role)
    if member.role != role:
        member.role = role
        member.save(update_fields=['role'])
    return member


def _current_user_id(request):
    data = getattr(request, 'data', {}) or {}
    explicit_user_id = _string(
        data.get('SenderID')
        or data.get('senderID')
        or data.get('currentUserID')
        or data.get('CurrentUserID')
        or data.get('UserID')
        or data.get('userID')
        or request.query_params.get('currentUserID')
        or request.query_params.get('CurrentUserID')
        or request.query_params.get('SenderID')
        or request.query_params.get('senderID')
        or request.query_params.get('userID')
        or request.query_params.get('UserID')
    )
    if explicit_user_id:
        return explicit_user_id

    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return str(user.id)

    return ''


def _parse_json_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def _normalize_id_list(value):
    if value is None or value == '':
        return []

    values = value if isinstance(value, (list, tuple, set)) else [value]
    normalized = []
    seen = set()
    for item in values:
        if isinstance(item, str) and item.strip().startswith('['):
            for parsed_item in _parse_json_list(item):
                parsed_value = _string(parsed_item)
                if parsed_value and parsed_value not in seen:
                    seen.add(parsed_value)
                    normalized.append(parsed_value)
            continue

        parsed_value = _string(item)
        if parsed_value and parsed_value not in seen:
            seen.add(parsed_value)
            normalized.append(parsed_value)

    return normalized


def _request_chat_user_ids(request):
    user_ids = []
    for item in _parse_json_list(request.data.get('ChatUsers')):
        user_id = _string(item.get('UserID') if isinstance(item, dict) else item)
        if user_id:
            user_ids.append(user_id)
    return user_ids


def _request_insert_member_user_ids(request):
    values = []
    data = getattr(request, 'data', {}) or {}

    if hasattr(data, 'getlist'):
        for key in ('userIDs', 'UserIDs', 'userIds', 'UserIds'):
            values.extend(data.getlist(key))

    for key in ('userIDs', 'UserIDs', 'userIds', 'UserIds'):
        value = data.get(key)
        if value is None:
            continue
        if isinstance(value, (list, tuple)):
            values.extend(value)
        else:
            values.append(value)

    user_ids = []
    seen = set()
    for value in values:
        items = [value]
        if isinstance(value, str) and _string(value).startswith('['):
            parsed = _parse_json_list(value)
            if parsed:
                items = parsed

        for item in items:
            if isinstance(item, dict):
                user_id = _string(
                    item.get('UserID')
                    or item.get('userID')
                    or item.get('id')
                    or item.get('ID')
                )
            else:
                user_id = _string(item)

            if user_id and user_id not in seen:
                seen.add(user_id)
                user_ids.append(user_id)

    return user_ids


def _collect_uploads(request):
    files = []
    for key in request.FILES:
        if key == 'ChatFiles' or key.startswith('ChatFiles['):
            files.extend(request.FILES.getlist(key))
    return files


def _collect_avatar_upload(request):
    return (
        request.FILES.get('Avatar')
        or request.FILES.get('avatar')
        or next(
            (request.FILES.get(key) for key in request.FILES if key.lower() == 'avatar'),
            None,
        )
    )


def _file_size_mb(file_obj):
    size = getattr(file_obj, 'size', 0) or 0
    return round(size / (1024 * 1024), 4)


def _save_chat_file(file_obj, chat_id):
    filename = Path(getattr(file_obj, 'name', '') or 'file').name
    path = default_storage.save(f'legacy_aidi/chats/{chat_id}/{filename}', file_obj)
    return path


def _save_chat_avatar(file_obj, chat_id):
    filename = Path(getattr(file_obj, 'name', '') or 'avatar').name
    path = default_storage.save(f'legacy_aidi/chats/{chat_id}/avatar/{filename}', file_obj)
    return default_storage.url(path)


def _get_user_by_lookup(user_lookup):
    user_lookup = _string(user_lookup)
    if not user_lookup:
        return None

    User = get_user_model()
    user = User.objects.filter(id=user_lookup).first()
    if user:
        return user

    return User.objects.filter(Q(username=user_lookup) | Q(email=user_lookup)).first()


def _user_staff_profile(user):
    if not user:
        return None
    try:
        from apps.departments.models import Staff
    except Exception:
        return None

    return (
        Staff.objects
        .filter(user_id=getattr(user, 'id', None), is_deleted=False)
        .order_by('-is_manager', '-updated_at', '-created_at')
        .first()
    )


def _user_display(user_id):
    user_lookup = _string(user_id)
    if user_lookup == HERITAGE_ASSISTANT_USER_ID:
        return {
            'name': HERITAGE_ASSISTANT_NAME,
            'avatar': HERITAGE_ASSISTANT_AVATAR,
        }

    user = _get_user_by_lookup(user_lookup)
    if not user:
        return {'name': user_lookup, 'avatar': ''}

    staff = _user_staff_profile(user)
    staff_name = _string(getattr(staff, 'full_name', '') if staff else '')
    avatar = _string(
        getattr(staff, 'avatar', '') if staff else ''
    ) or _string(getattr(user, 'avatar', ''))

    name = (
        staff_name
        or _string(user.get_full_name())
        or _string(getattr(user, 'username', ''))
        or _string(getattr(user, 'email', ''))
        or user_lookup
    )
    return {'name': name, 'avatar': avatar}


def _seen_user_payload(user_id, seen_date=None):
    user_id = _string(user_id)
    display = _user_display(user_id)
    seen_date_value = seen_date.isoformat() if seen_date else None
    return {
        'id': user_id,
        'ID': user_id,
        'userID': user_id,
        'UserID': user_id,
        'name': display['name'],
        'Name': display['name'],
        'fullName': display['name'],
        'FullName': display['name'],
        'avatar': display['avatar'],
        'Avatar': display['avatar'],
        'seenDate': seen_date_value,
        'SeenDate': seen_date_value,
    }


def _seen_by_message_map(message_ids):
    clean_message_ids = sorted({_string(message_id) for message_id in message_ids if _string(message_id)})
    if not clean_message_ids:
        return {}

    seen_by_message = {}
    seen_records = (
        ManagedChatSeen.objects
        .filter(chat_message_id__in=clean_message_ids)
        .order_by('seen_date')
    )
    for record in seen_records:
        seen_by_message.setdefault(record.chat_message_id, []).append(
            _seen_user_payload(record.user_id, record.seen_date),
        )

    return seen_by_message


def _chat_member_payload(chat_user, chat):
    user_id = _string(chat_user.user_id)
    display = _user_display(user_id)
    user = _get_user_by_lookup(user_id)
    name = display['name']
    email = getattr(user, 'email', '') if user else ''
    username = getattr(user, 'username', '') if user else user_id
    role = _chat_role(chat_user.role)
    is_creator = user_id == _string(chat.created_by)

    return {
        'id': user_id,
        'userID': user_id,
        'name': name,
        'fullName': name,
        'email': email,
        'userName': username,
        'avatar': display['avatar'],
        'role': role,
        'isCreator': is_creator,
        'createdBy': chat.created_by,
    }


def _chat_await_payload(await_confirm):
    user_id = _string(await_confirm.user_id)
    created_by = _string(await_confirm.created_by)
    user_display = _user_display(user_id)
    creator_display = _user_display(created_by)

    return {
        'id': await_confirm.id,
        'ID': await_confirm.id,
        'chatAwaitConfirmID': await_confirm.id,
        'ChatAwaitConfirmID': await_confirm.id,
        'chatID': await_confirm.chat_id,
        'ChatID': await_confirm.chat_id,
        'userID': user_id,
        'UserID': user_id,
        'status': await_confirm.status,
        'Status': await_confirm.status,
        'createdBy': created_by,
        'CreatedBy': created_by,
        'confirmedBy': await_confirm.confirmed_by,
        'ConfirmedBy': await_confirm.confirmed_by,
        'createdDate': await_confirm.created_date.isoformat() if await_confirm.created_date else None,
        'CreatedDate': await_confirm.created_date.isoformat() if await_confirm.created_date else None,
        'confirmedDate': await_confirm.confirmed_date.isoformat() if await_confirm.confirmed_date else None,
        'ConfirmedDate': await_confirm.confirmed_date.isoformat() if await_confirm.confirmed_date else None,
        'name': user_display['name'],
        'Name': user_display['name'],
        'fullName': user_display['name'],
        'FullName': user_display['name'],
        'avatar': user_display['avatar'],
        'Avatar': user_display['avatar'],
        'senderName': user_display['name'],
        'senderAvatar': user_display['avatar'],
        'addedByName': creator_display['name'],
        'createdByName': creator_display['name'],
    }


def _serialize_file(file):
    return {
        'id': file.id,
        'chatID': file.chat_id,
        'messageID': file.message_id,
        'file': file.file,
        'fileName': file.file_name,
        'size': file.size,
        'extension': file.extension,
        'createdDate': file.created_date.isoformat() if file.created_date else None,
        'createdBy': file.created_by,
    }


def _serialize_link(link):
    return {
        'id': link.id,
        'chatID': link.chat_id,
        'messageID': link.message_id,
        'link': link.link,
        'url': link.link,
        'createdDate': link.created_date.isoformat() if link.created_date else None,
        'createdBy': link.created_by,
    }


def _serialize_message(message, files_by_message, links_by_message=None, seen_by_message=None):
    links_by_message = links_by_message or {}
    seen_by_message = seen_by_message or {}
    sender = _user_display(message.sender_id)
    content = _normalize_chat_content(message.content)
    files = [_serialize_file(file) for file in files_by_message.get(message.id, [])]
    chat_files = json.dumps(files, ensure_ascii=False) if files else ''
    links = [_serialize_link(link) for link in links_by_message.get(message.id, [])]
    chat_links = json.dumps(links, ensure_ascii=False) if links else ''
    seen_by = seen_by_message.get(message.id, [])
    return {
        'id': message.id,
        'senderID': message.sender_id,
        'messageType': message.message_type,
        'replyToID': message.reply_to_id or None,
        'createdDate': message.created_date.isoformat() if message.created_date else None,
        'isDeleted': message.is_deleted,
        'isUnsend': message.is_unsend,
        'content': content,
        'chatID': message.chat_id,
        'chatUsers': '',
        'chatFiles': chat_files,
        'chatLinks': chat_links,
        'senderName': sender['name'],
        'senderAvatar': sender['avatar'],
        'avatar': sender['avatar'],
        'isAI': message.sender_id == HERITAGE_ASSISTANT_USER_ID,
        'eventID': message.event_id or None,
        'eventType': message.event_type,
        'isPin': message.is_pin,
        'seenBy': json.dumps(seen_by, ensure_ascii=False) if seen_by else '[]',
        'notePin': False,
        'listUserJoinRemind': message.list_user_join_remind or '',
    }


def _serialize_chat(chat, pin_date=PIN_DATE_UNSET):
    pin_date_value = chat.pin_date if pin_date is PIN_DATE_UNSET else pin_date

    return {
        'id': chat.id,
        'name': chat.name,
        'type': chat.type,
        'avatar': chat.avatar,
        'createdBy': chat.created_by,
        'updatedBy': chat.updated_by,
        'createdDate': chat.created_date.isoformat() if chat.created_date else None,
        'updatedDate': chat.updated_date.isoformat() if chat.updated_date else None,
        'isAI': chat.is_ai,
        'userID': chat.user_id,
        'eventType': chat.event_type,
        'pinDate': pin_date_value.isoformat() if pin_date_value else None,
        'linkId': chat.link_id,
        'messageType': chat.message_type,
    }


def _chat_display_name(chat, chat_users, current_user_id):
    if chat.name:
        return chat.name

    if chat.is_ai:
        return HERITAGE_ASSISTANT_NAME

    if chat.type == CHAT_TYPE_GROUP:
        return 'Nhóm trò chuyện'

    other_user_id = next(
        (item.user_id for item in chat_users if item.user_id != current_user_id),
        '',
    )
    if other_user_id:
        return _user_display(other_user_id)['name']

    return 'Cuộc trò chuyện'


def _chat_display_avatar(chat, chat_users, current_user_id):
    if chat.avatar:
        return chat.avatar

    if chat.is_ai:
        return HERITAGE_ASSISTANT_AVATAR

    if chat.type == CHAT_TYPE_GROUP:
        return ''

    other_user_id = next(
        (item.user_id for item in chat_users if item.user_id != current_user_id),
        '',
    )
    if other_user_id:
        return _user_display(other_user_id)['avatar']

    return ''


def _serialize_chat_list_item(
    chat,
    chat_users,
    last_message,
    current_user_id,
    unread_count=0,
    pin_date=PIN_DATE_UNSET,
):
    last_sender = _user_display(last_message.sender_id) if last_message else {'name': '', 'avatar': ''}
    pin_date_value = chat.pin_date if pin_date is PIN_DATE_UNSET else pin_date
    last_message_is_unsend = bool(last_message and last_message.is_unsend)
    last_message_content = ''
    last_message_type = chat.message_type
    if last_message:
        last_message_content = (
            'Tin nhắn đã được thu hồi'
            if last_message_is_unsend
            else _normalize_chat_content(last_message.content)
        )
        last_message_type = (
            MESSAGE_TYPE_UNSEND
            if last_message_is_unsend
            else last_message.message_type
        )
    members = [
        {
            'id': item.user_id,
            'userID': item.user_id,
            'name': _user_display(item.user_id)['name'],
            'avatar': _user_display(item.user_id)['avatar'],
            'role': item.role,
        }
        for item in chat_users
    ]
    other_user_id = next(
        (item.user_id for item in chat_users if item.user_id != current_user_id),
        '',
    )

    return {
        'id': chat.id,
        'chatID': chat.id,
        'name': _chat_display_name(chat, chat_users, current_user_id),
        'type': chat.type,
        'avatar': _chat_display_avatar(chat, chat_users, current_user_id),
        'createdBy': chat.created_by,
        'updatedBy': chat.updated_by,
        'createdDate': chat.created_date.isoformat() if chat.created_date else None,
        'updatedDate': chat.updated_date.isoformat() if chat.updated_date else None,
        'countUser': len(chat_users),
        'members': members,
        'lastMessageId': last_message.id if last_message else '',
        'lastMessageID': last_message.id if last_message else '',
        'lastMessage': last_message_content,
        'lastMessageDate': last_message.created_date.isoformat() if last_message and last_message.created_date else None,
        'lastMessageTime': last_message.created_date.isoformat() if last_message and last_message.created_date else None,
        'lastMessageSender': last_sender['name'],
        'lastSenderName': last_sender['name'],
        'senderID': last_message.sender_id if last_message else '',
        'senderAvatar': last_sender['avatar'],
        'isAI': chat.is_ai,
        'userID': chat.user_id or other_user_id,
        'eventType': chat.event_type,
        'pinDate': pin_date_value.isoformat() if pin_date_value else None,
        'linkId': chat.link_id,
        'messageType': last_message_type,
        'isUnsend': last_message_is_unsend,
        'unreadCount': unread_count,
    }


def _notify_chat_message(chat, sender_id, target_user_ids, message_payload):
    notify_events(
        chat.id,
        sender_id,
        message_payload,
        event_kind='message',
        user_ids=target_user_ids,
        exclude_sender=True,
    )


def _create_chat_for_message(request, current_user_id):
    chat_id = _string(request.data.get('ChatID'))
    is_ai = _bool(request.data.get('IsAI'))
    chat_type = _int(request.data.get('ChatType'), CHAT_TYPE_PRIVATE) or CHAT_TYPE_PRIVATE

    if chat_id:
        chat = ManagedChat.objects.filter(id=chat_id, is_deleted=False).first()
        if chat:
            return chat
        return None

    chat = ManagedChat.objects.create(
        type=chat_type,
        is_ai=is_ai,
        created_by=current_user_id,
        updated_by=current_user_id,
        user_id=current_user_id,
        name=HERITAGE_ASSISTANT_NAME if is_ai else '',
        avatar=HERITAGE_ASSISTANT_AVATAR if is_ai else '',
        message_type=_int(request.data.get('MessageType'), MESSAGE_TYPE_TEXT) or MESSAGE_TYPE_TEXT,
    )

    for user_id in _request_chat_user_ids(request):
        ManagedChatUser.objects.get_or_create(
            chat_id=chat.id,
            user_id=user_id,
            defaults={
                'role': CHAT_ROLE_MEMBER,
                'add_by': current_user_id,
            },
        )

    if current_user_id:
        ManagedChatUser.objects.get_or_create(
            chat_id=chat.id,
            user_id=current_user_id,
            defaults={
                'role': CHAT_ROLE_LEADER,
                'add_by': current_user_id,
            },
        )

    return chat


def _actor_user_id(request):
    data = getattr(request, 'data', {}) or {}
    explicit_user_id = _string(
        request.query_params.get('currentUserID')
        or request.query_params.get('CurrentUserID')
        or request.query_params.get('actorUserID')
        or request.query_params.get('ActorUserID')
        or data.get('currentUserID')
        or data.get('CurrentUserID')
        or data.get('actorUserID')
        or data.get('ActorUserID')
    )
    if explicit_user_id:
        return explicit_user_id

    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return str(user.id)

    return ''


def _chat_target_user_id(request):
    return _string(
        request.query_params.get('userID')
        or request.query_params.get('UserID')
        or request.query_params.get('targetUserID')
        or request.query_params.get('TargetUserID')
    )


def _chat_member(chat_id, user_id):
    if not chat_id or not user_id:
        return None

    return _normalize_chat_member(
        ManagedChatUser.objects.filter(chat_id=chat_id, user_id=user_id).first()
    )


def _is_chat_leader(chat, member, user_id):
    return bool(member and _chat_role(member.role) == CHAT_ROLE_LEADER)


def _is_chat_manager(chat, member, user_id):
    return _is_chat_leader(chat, member, user_id) or bool(
        member and _chat_role(member.role) == CHAT_ROLE_VICE_LEADER
    )


def _chat_user_ids(chat_id, extra_user_ids=None):
    user_ids = list(
        ManagedChatUser.objects
        .filter(chat_id=chat_id)
        .values_list('user_id', flat=True)
    )
    for user_id in extra_user_ids or []:
        user_id = _string(user_id)
        if user_id and user_id not in user_ids:
            user_ids.append(user_id)
    return user_ids


def _can_access_chat(chat, user_id):
    if not chat:
        return False

    if _string(chat.id) == HERITAGE_ASSISTANT_CHAT_ID:
        return True

    if not user_id:
        return False

    member = _chat_member(chat.id, user_id)
    if chat.type == CHAT_TYPE_GROUP:
        return bool(member)

    return (
        bool(member)
        or _string(chat.created_by) == _string(user_id)
        or _string(chat.user_id) == _string(user_id)
    )


def _create_group_event(chat, actor_user_id, content):
    chat.updated_by = actor_user_id
    chat.message_type = MESSAGE_TYPE_EVENT
    chat.save(update_fields=['updated_by', 'message_type', 'updated_date'])

    return ManagedChatMessage.objects.create(
        sender_id=actor_user_id,
        message_type=MESSAGE_TYPE_EVENT,
        content=content,
        chat_id=chat.id,
    )


def _broadcast_group_event(chat, user_ids, message, extra_payload=None):
    message_payload = _serialize_message(message, {})
    if extra_payload:
        message_payload.update(extra_payload)

    transaction.on_commit(
        lambda chat_id=chat.id, target_user_ids=user_ids, payload=message_payload:
        broadcast_chat_message(chat_id, target_user_ids, payload)
    )


def _message_related_data(messages):
    message_ids = [message.id for message in messages]
    files_by_message = {}
    links_by_message = {}
    if not message_ids:
        return files_by_message, links_by_message

    files = (
        ManagedChatFile.objects
        .filter(message_id__in=message_ids)
        .order_by('created_date')
    )
    for item in files:
        files_by_message.setdefault(item.message_id, []).append(item)

    links = (
        ManagedChatLink.objects
        .filter(message_id__in=message_ids)
        .order_by('created_date')
    )
    for item in links:
        links_by_message.setdefault(item.message_id, []).append(item)

    return files_by_message, links_by_message


def _broadcast_message_state(chat_id, message_id, message_type, content=''):
    target_user_ids = _chat_user_ids(chat_id)
    payload = {
        'ID': message_id,
        'id': message_id,
        'ChatID': chat_id,
        'chatID': chat_id,
        'MessageType': message_type,
        'messageType': message_type,
        'Content': content,
        'content': content,
    }
    transaction.on_commit(
        lambda: broadcast_chat_message(chat_id, target_user_ids, payload)
    )


class ChatCreateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        current_user_id = _current_user_id(request)
        if not current_user_id:
            return _failure('Thiếu userID')

        chat_user_ids = []
        for user_id in _request_chat_user_ids(request):
            if user_id and user_id not in chat_user_ids:
                chat_user_ids.append(user_id)

        if not chat_user_ids:
            return _failure('Danh sách thành viên không được rỗng')

        chat_name = _string(request.data.get('Name'))
        chat_type = _int(request.data.get('Type'), CHAT_TYPE_PRIVATE) or CHAT_TYPE_PRIVATE
        avatar_upload = _collect_avatar_upload(request)

        try:
            with transaction.atomic():
                chat = ManagedChat.objects.create(
                    name=chat_name,
                    type=chat_type,
                    created_by=current_user_id,
                    updated_by=current_user_id,
                    user_id=current_user_id,
                    message_type=MESSAGE_TYPE_TEXT,
                )

                if avatar_upload:
                    chat.avatar = _save_chat_avatar(avatar_upload, chat.id)
                    chat.save(update_fields=['avatar', 'updated_date'])

                for user_id in chat_user_ids:
                    if user_id == current_user_id:
                        continue

                    ManagedChatUser.objects.get_or_create(
                        chat_id=chat.id,
                        user_id=user_id,
                        defaults={
                            'role': CHAT_ROLE_MEMBER,
                            'add_by': current_user_id,
                        },
                    )

                ManagedChatUser.objects.update_or_create(
                    chat_id=chat.id,
                    user_id=current_user_id,
                    defaults={
                        'role': CHAT_ROLE_LEADER,
                        'add_by': current_user_id,
                    },
                )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(chat.id)


class ChatUpdateNameApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('id'))
        new_name = _string(request.query_params.get('newName'))
        if not chat_id:
            return _failure('Thiếu chatID')
        if not new_name:
            return _failure('Tên nhóm không được rỗng')

        current_user_id = _current_user_id(request)
        if not current_user_id:
            return _failure('Thiếu userID')

        chat = ManagedChat.objects.filter(id=chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        try:
            with transaction.atomic():
                chat.name = new_name
                chat.updated_by = current_user_id
                chat.message_type = MESSAGE_TYPE_EVENT
                chat.save(update_fields=['name', 'updated_by', 'message_type', 'updated_date'])

                current_user = _user_display(current_user_id)
                display_name = current_user.get('fullName') or current_user.get('name') or current_user_id
                message = ManagedChatMessage.objects.create(
                    sender_id=current_user_id,
                    message_type=MESSAGE_TYPE_EVENT,
                    content=f'{display_name} đã đổi tên nhóm thành {new_name}',
                    chat_id=chat_id,
                )

                message_payload = _serialize_message(message, {})
                target_user_ids = list(
                    ManagedChatUser.objects
                    .filter(chat_id=chat_id)
                    .values_list('user_id', flat=True)
                )
                if current_user_id not in target_user_ids:
                    target_user_ids.append(current_user_id)

            transaction.on_commit(
                lambda chat_id=chat_id, user_ids=target_user_ids, payload=message_payload:
                broadcast_chat_message(chat_id, user_ids, payload)
            )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'newName': new_name,
        })


class ChatUpdateAvatarApi(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        chat_id = _string(request.data.get('chatID') or request.data.get('id'))
        avatar_upload = _collect_avatar_upload(request)
        if not chat_id:
            return _failure('Thiếu chatID')
        if not avatar_upload:
            return _failure('Thiếu ảnh đại diện nhóm')

        current_user_id = _current_user_id(request)
        if not current_user_id:
            return _failure('Thiếu userID')

        chat = ManagedChat.objects.filter(id=chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        try:
            with transaction.atomic():
                avatar = _save_chat_avatar(avatar_upload, chat.id)
                chat.avatar = avatar
                chat.updated_by = current_user_id
                chat.message_type = MESSAGE_TYPE_EVENT
                chat.save(update_fields=['avatar', 'updated_by', 'message_type', 'updated_date'])

                current_user = _user_display(current_user_id)
                display_name = current_user.get('fullName') or current_user.get('name') or current_user_id
                message = ManagedChatMessage.objects.create(
                    sender_id=current_user_id,
                    message_type=MESSAGE_TYPE_EVENT,
                    content=f'{display_name} đã đổi ảnh đại diện nhóm',
                    chat_id=chat_id,
                )

                message.content = _normalize_chat_content(message.content)
                message.save(update_fields=['content'])
                message_payload = _serialize_message(message, {})
                message_payload['chatAvatar'] = avatar
                target_user_ids = list(
                    ManagedChatUser.objects
                    .filter(chat_id=chat_id)
                    .values_list('user_id', flat=True)
                )
                if current_user_id not in target_user_ids:
                    target_user_ids.append(current_user_id)

            transaction.on_commit(
                lambda chat_id=chat_id, user_ids=target_user_ids, payload=message_payload:
                broadcast_chat_message(chat_id, user_ids, payload)
            )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'avatar': avatar,
        })


class ChatListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        current_user_id = _current_user_id(request)
        chat_type = _int(request.query_params.get('type'), CHAT_TYPE_PRIVATE) or CHAT_TYPE_PRIVATE

        if not current_user_id:
            return _success([])

        chats = ManagedChat.objects.filter(type=chat_type, is_deleted=False)
        chat_ids = ManagedChatUser.objects.filter(user_id=current_user_id).values_list('chat_id', flat=True)
        if chat_type == CHAT_TYPE_GROUP:
            chats = chats.filter(id__in=chat_ids)
        else:
            chats = chats.filter(
                Q(id__in=chat_ids)
                | Q(created_by=current_user_id)
                | Q(user_id=current_user_id)
            )

        chats = list(chats.order_by('-updated_date', '-created_date'))
        chat_ids = [chat.id for chat in chats]

        chat_users_by_chat = {}
        for item in ManagedChatUser.objects.filter(chat_id__in=chat_ids).order_by('role', 'created_date'):
            chat_users_by_chat.setdefault(item.chat_id, []).append(item)

        pin_dates = {}
        if current_user_id:
            pin_dates = {chat.id: None for chat in chats}
            try:
                for pin in ManagedChatPin.objects.filter(chat_id__in=chat_ids, user_id=current_user_id):
                    pin_dates[pin.chat_id] = pin.pin_date
            except DatabaseError:
                pin_dates = {chat.id: chat.pin_date for chat in chats if chat.pin_date}

        last_messages = {}
        for message in (
            ManagedChatMessage.objects
            .filter(chat_id__in=chat_ids, is_deleted=False)
            .order_by('chat_id', '-created_date')
        ):
            last_messages.setdefault(message.chat_id, message)

        unread_counts = {}
        if current_user_id:
            seen_by_chat = {
                item.chat_id: item
                for item in ManagedChatSeen.objects.filter(chat_id__in=chat_ids, user_id=current_user_id)
            }
            for chat in chats:
                unread_queryset = (
                    ManagedChatMessage.objects
                    .filter(chat_id=chat.id, is_deleted=False)
                    .exclude(sender_id=current_user_id)
                )
                seen = seen_by_chat.get(chat.id)
                if seen and seen.seen_date:
                    unread_queryset = unread_queryset.filter(created_date__gt=seen.seen_date)
                unread_counts[chat.id] = unread_queryset.count()

        data = [
            _serialize_chat_list_item(
                chat,
                chat_users_by_chat.get(chat.id, []),
                last_messages.get(chat.id),
                current_user_id,
                unread_counts.get(chat.id, 0),
                pin_dates.get(chat.id, PIN_DATE_UNSET),
            )
            for chat in chats
        ]
        return _success(data)


class ChatUserByChatIDApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(
            request.query_params.get('chatID')
            or request.query_params.get('chatId')
            or request.query_params.get('id')
        )
        if not chat_id:
            return _failure('Thiếu chatID')

        chat = ManagedChat.objects.filter(id=chat_id, is_deleted=False).first()
        if not chat:
            return _success([])

        current_user_id = _current_user_id(request)
        if not _can_access_chat(chat, current_user_id):
            return _failure('Bạn không phải thành viên cuộc trò chuyện')

        try:
            members = list(
                ManagedChatUser.objects
                .filter(chat_id=chat_id)
                .order_by('role', 'created_date')
            )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success([_chat_member_payload(member, chat) for member in members])


class ChatAttachmentListApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        empty_payload = {
            'chatFiles': [],
            'chatLinks': [],
            'files': [],
            'links': [],
        }
        chat_id = _string(
            request.query_params.get('chatID')
            or request.query_params.get('chatId')
            or request.query_params.get('id')
        )
        if not chat_id:
            return _success(empty_payload)

        chat = ManagedChat.objects.filter(id=chat_id, is_deleted=False).first()
        if not chat:
            return _success(empty_payload)

        current_user_id = _current_user_id(request)
        if not current_user_id:
            return _success(empty_payload)
        if not _can_access_chat(chat, current_user_id):
            return _failure('Ban khong phai thanh vien cuoc tro chuyen')

        message_type = _int(
            request.query_params.get('messagetype')
            or request.query_params.get('messageType'),
            0,
        )

        files_qs = ManagedChatFile.objects.filter(chat_id=chat.id)
        links_qs = ManagedChatLink.objects.filter(chat_id=chat.id)
        if message_type:
            message_ids = list(
                ManagedChatMessage.objects
                .filter(chat_id=chat.id, is_deleted=False, message_type=message_type)
                .values_list('id', flat=True)
            )
            files_qs = files_qs.filter(message_id__in=message_ids)
            links_qs = links_qs.filter(message_id__in=message_ids)

        files = [_serialize_file(item) for item in files_qs.order_by('created_date')]
        links = [_serialize_link(item) for item in links_qs.order_by('created_date')]
        return _success({
            'chatFiles': files,
            'chatLinks': links,
            'files': files,
            'links': links,
        })


class ChatAdminUserIdApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        User = get_user_model()
        admin = (
            User.objects
            .filter(is_active=True, is_superuser=True)
            .order_by('id')
            .first()
        )
        return _success(str(admin.id) if admin else '')


class ChatInsertMemberApi(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        chat_id = _string(
            request.data.get('chatID')
            or request.data.get('chatId')
            or request.data.get('ChatID')
            or request.data.get('id')
        )
        actor_user_id = _actor_user_id(request)
        user_ids = _request_insert_member_user_ids(request)

        if not chat_id:
            return _failure('Thiếu chatID')
        if not actor_user_id:
            return _failure('Thiếu currentUserID')
        if not user_ids:
            return _failure('Thiếu userIDs')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _failure('Không tìm thấy nhóm chat', status=404)

        try:
            with transaction.atomic():
                actor_member = _chat_member(chat.id, actor_user_id)
                if not actor_member and _string(chat.created_by) == actor_user_id:
                    actor_member, _ = ManagedChatUser.objects.get_or_create(
                        chat_id=chat.id,
                        user_id=actor_user_id,
                        defaults={
                            'role': CHAT_ROLE_LEADER,
                            'add_by': actor_user_id,
                        },
                    )
                    actor_member = _normalize_chat_member(actor_member)
                if not actor_member:
                    return _failure('B\u1ea1n kh\u00f4ng ph\u1ea3i th\u00e0nh vi\u00ean nh\u00f3m')

                existing_user_ids = set(
                    ManagedChatUser.objects
                    .filter(chat_id=chat.id)
                    .values_list('user_id', flat=True)
                )
                added_user_ids = []
                skipped_user_ids = []
                pending_requests = []
                messages = []
                is_manager = _is_chat_manager(chat, actor_member, actor_user_id)

                for user_id in user_ids:
                    if user_id in existing_user_ids:
                        skipped_user_ids.append(user_id)
                        continue

                    if not is_manager:
                        await_confirm = (
                            ManagedChatAwaitConfirm.objects
                            .filter(
                                chat_id=chat.id,
                                user_id=user_id,
                                status=CHAT_AWAIT_STATUS_WAITING,
                            )
                            .order_by('-created_date')
                            .first()
                        )
                        if not await_confirm:
                            await_confirm = ManagedChatAwaitConfirm.objects.create(
                                chat_id=chat.id,
                                user_id=user_id,
                                status=CHAT_AWAIT_STATUS_WAITING,
                                created_by=actor_user_id,
                            )
                        elif not await_confirm.created_by:
                            await_confirm.created_by = actor_user_id
                            await_confirm.save(update_fields=['created_by', 'modified_date'])
                        pending_requests.append(await_confirm)
                        continue

                    ManagedChatUser.objects.create(
                        chat_id=chat.id,
                        user_id=user_id,
                        role=CHAT_ROLE_MEMBER,
                        add_by=actor_user_id,
                    )
                    ManagedChatAwaitConfirm.objects.filter(
                        chat_id=chat.id,
                        user_id=user_id,
                        status=CHAT_AWAIT_STATUS_WAITING,
                    ).update(
                        status=CHAT_AWAIT_STATUS_ACCEPTED,
                        confirmed_by=actor_user_id,
                        confirmed_date=timezone.now(),
                    )
                    existing_user_ids.add(user_id)
                    added_user_ids.append(user_id)
                    messages.append(_create_group_event(
                        chat,
                        actor_user_id,
                        f'{{{user_id}}} đã được thêm vào nhóm',
                    ))

                if pending_requests:
                    invited_ids = [item.user_id for item in pending_requests]
                    message = _create_group_event(
                        chat,
                        actor_user_id,
                        (
                            f'{{{actor_user_id}}} \u0111\u00e3 m\u1eddi '
                            f'{len(invited_ids)} th\u00e0nh vi\u00ean v\u00e0o nh\u00f3m, '
                            'ch\u1edd qu\u1ea3n tr\u1ecb vi\u00ean ho\u1eb7c ph\u00f3 nh\u00f3m duy\u1ec7t'
                        ),
                    )
                    target_user_ids = _chat_user_ids(chat.id, [actor_user_id, *invited_ids])
                    _broadcast_group_event(
                        chat,
                        target_user_ids,
                        message,
                        extra_payload={
                            'needsApproval': True,
                            'pendingRequests': [_chat_await_payload(item) for item in pending_requests],
                        },
                    )

                target_user_ids = _chat_user_ids(chat.id, [actor_user_id, *user_ids])
                for message in messages:
                    _broadcast_group_event(chat, target_user_ids, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'userIDs': added_user_ids,
            'skippedUserIDs': skipped_user_ids,
            'needsApproval': bool(pending_requests),
            'requests': [_chat_await_payload(item) for item in pending_requests],
        })


class ChatListUserWaitConfirmApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thi\u1ebfu chatID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _success([])

        try:
            requests = list(
                ManagedChatAwaitConfirm.objects
                .filter(chat_id=chat.id, status=CHAT_AWAIT_STATUS_WAITING)
                .order_by('-created_date')
            )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success([_chat_await_payload(item) for item in requests])


class ChatConfirmUserJoinGroupApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        await_id = _string(
            request.query_params.get('chatAwaitConfrimID')
            or request.query_params.get('chatAwaitConfirmID')
            or request.query_params.get('id')
            or request.query_params.get('ID')
        )
        status = _int(request.query_params.get('status'), CHAT_AWAIT_STATUS_WAITING)
        actor_user_id = _actor_user_id(request)

        if not await_id:
            return _failure('Thi\u1ebfu chatAwaitConfirmID')
        if status not in {CHAT_AWAIT_STATUS_ACCEPTED, CHAT_AWAIT_STATUS_REJECTED}:
            return _failure('Tr\u1ea1ng th\u00e1i duy\u1ec7t kh\u00f4ng h\u1ee3p l\u1ec7')
        if not actor_user_id:
            return _failure('Thi\u1ebfu currentUserID')

        try:
            with transaction.atomic():
                await_confirm = (
                    ManagedChatAwaitConfirm.objects
                    .select_for_update()
                    .filter(id=await_id)
                    .first()
                )
                if not await_confirm:
                    return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y y\u00eau c\u1ea7u ch\u1edd duy\u1ec7t', status=404)

                chat = ManagedChat.objects.filter(id=await_confirm.chat_id, type=CHAT_TYPE_GROUP).first()
                if not chat:
                    return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y nh\u00f3m chat', status=404)

                actor_member = _chat_member(chat.id, actor_user_id)
                if not _is_chat_manager(chat, actor_member, actor_user_id):
                    return _failure('B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n duy\u1ec7t y\u00eau c\u1ea7u th\u00eam th\u00e0nh vi\u00ean')

                if await_confirm.status != CHAT_AWAIT_STATUS_WAITING:
                    return _success(_chat_await_payload(await_confirm))

                await_confirm.status = status
                await_confirm.confirmed_by = actor_user_id
                await_confirm.confirmed_date = timezone.now()
                await_confirm.save(update_fields=[
                    'status',
                    'confirmed_by',
                    'confirmed_date',
                    'modified_date',
                ])

                target_user_id = _string(await_confirm.user_id)
                if status == CHAT_AWAIT_STATUS_ACCEPTED:
                    ManagedChatUser.objects.get_or_create(
                        chat_id=chat.id,
                        user_id=target_user_id,
                        defaults={
                            'role': CHAT_ROLE_MEMBER,
                            'add_by': await_confirm.created_by or actor_user_id,
                        },
                    )
                    content = (
                        f'{{{actor_user_id}}} \u0111\u00e3 duy\u1ec7t '
                        f'{{{target_user_id}}} v\u00e0o nh\u00f3m'
                    )
                else:
                    content = (
                        f'{{{actor_user_id}}} \u0111\u00e3 t\u1eeb ch\u1ed1i l\u1eddi m\u1eddi '
                        f'{{{target_user_id}}} v\u00e0o nh\u00f3m'
                    )

                message = _create_group_event(chat, actor_user_id, content)
                target_user_ids = _chat_user_ids(
                    chat.id,
                    [actor_user_id, target_user_id, await_confirm.created_by],
                )
                _broadcast_group_event(
                    chat,
                    target_user_ids,
                    message,
                    extra_payload={
                        'awaitConfirmID': await_confirm.id,
                        'awaitStatus': status,
                    },
                )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(_chat_await_payload(await_confirm))


class ChatChooseSubLeaderApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        target_user_id = _chat_target_user_id(request)
        actor_user_id = _actor_user_id(request)

        if not chat_id:
            return _failure('Thiếu chatID')
        if not target_user_id:
            return _failure('Thiếu userID')
        if not actor_user_id:
            return _failure('Thiếu currentUserID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _failure('Không tìm thấy nhóm chat', status=404)

        try:
            with transaction.atomic():
                actor_member = _chat_member(chat.id, actor_user_id)
                target_member = _chat_member(chat.id, target_user_id)
                if not _is_chat_manager(chat, actor_member, actor_user_id):
                    return _failure('Bạn không có quyền bổ nhiệm phó nhóm', status=403)
                if not target_member:
                    return _failure('Thành viên không thuộc nhóm', status=404)
                if _is_chat_leader(chat, target_member, target_user_id):
                    return _failure('Không thể bổ nhiệm trưởng nhóm thành phó nhóm')

                target_member.role = CHAT_ROLE_VICE_LEADER
                target_member.save(update_fields=['role'])

                message = _create_group_event(
                    chat,
                    actor_user_id,
                    f'{{{actor_user_id}}} đã bổ nhiệm {{{target_user_id}}} thành phó nhóm',
                )
                target_user_ids = _chat_user_ids(chat.id, [actor_user_id, target_user_id])
                _broadcast_group_event(chat, target_user_ids, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'userID': target_user_id,
            'role': CHAT_ROLE_VICE_LEADER,
        })


class ChatRemoveSubLeaderApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        target_user_id = _chat_target_user_id(request)
        actor_user_id = _actor_user_id(request)

        if not chat_id:
            return _failure('Thiếu chatID')
        if not target_user_id:
            return _failure('Thiếu userID')
        if not actor_user_id:
            return _failure('Thiếu currentUserID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _failure('Không tìm thấy nhóm chat', status=404)

        try:
            with transaction.atomic():
                actor_member = _chat_member(chat.id, actor_user_id)
                target_member = _chat_member(chat.id, target_user_id)
                if not _is_chat_leader(chat, actor_member, actor_user_id):
                    return _failure('Bạn không có quyền xóa quyền phó nhóm')
                if not target_member:
                    return _failure('Thành viên không thuộc nhóm', status=404)
                if _chat_role(target_member.role) != CHAT_ROLE_VICE_LEADER:
                    return _failure('Thành viên này không phải phó nhóm')

                target_member.role = CHAT_ROLE_MEMBER
                target_member.save(update_fields=['role'])

                message = _create_group_event(
                    chat,
                    actor_user_id,
                    f'{{{actor_user_id}}} đã xóa quyền phó nhóm của {{{target_user_id}}}',
                )
                target_user_ids = _chat_user_ids(chat.id, [actor_user_id, target_user_id])
                _broadcast_group_event(chat, target_user_ids, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'userID': target_user_id,
            'role': CHAT_ROLE_MEMBER,
        })


class ChatChooseLeaderApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        target_user_id = _chat_target_user_id(request)
        actor_user_id = _actor_user_id(request)

        if not chat_id:
            return _failure('Thiếu chatID')
        if not target_user_id:
            return _failure('Thiếu userID')
        if not actor_user_id:
            return _failure('Thiếu currentUserID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _failure('Không tìm thấy nhóm chat', status=404)

        try:
            with transaction.atomic():
                actor_member = _chat_member(chat.id, actor_user_id)
                target_member = _chat_member(chat.id, target_user_id)
                if not _is_chat_leader(chat, actor_member, actor_user_id):
                    return _failure('Bạn không có quyền nhượng quyền trưởng nhóm', status=403)
                if not target_member:
                    return _failure('Thành viên không thuộc nhóm', status=404)
                if target_user_id == actor_user_id:
                    return _failure('Không thể nhượng quyền cho chính bạn')

                ManagedChatUser.objects.filter(
                    chat_id=chat.id,
                    role=CHAT_ROLE_LEADER,
                ).exclude(user_id=target_user_id).update(role=CHAT_ROLE_MEMBER)

                target_member.role = CHAT_ROLE_LEADER
                target_member.save(update_fields=['role'])

                chat.created_by = target_user_id
                chat.updated_by = actor_user_id
                chat.message_type = MESSAGE_TYPE_EVENT
                chat.save(update_fields=['created_by', 'updated_by', 'message_type', 'updated_date'])

                message = ManagedChatMessage.objects.create(
                    sender_id=actor_user_id,
                    message_type=MESSAGE_TYPE_EVENT,
                    content=f'{{{actor_user_id}}} đã bổ nhiệm {{{target_user_id}}} thành trưởng nhóm mới',
                    chat_id=chat.id,
                )
                target_user_ids = _chat_user_ids(chat.id, [actor_user_id, target_user_id])
                _broadcast_group_event(
                    chat,
                    target_user_ids,
                    message,
                    extra_payload={'createdBy': target_user_id},
                )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'userID': target_user_id,
            'role': CHAT_ROLE_LEADER,
        })


class ChatRemoveFromGroupApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        target_user_id = _chat_target_user_id(request)
        actor_user_id = _actor_user_id(request)

        if not chat_id:
            return _failure('Thiếu chatID')
        if not target_user_id:
            return _failure('Thiếu userID')
        if not actor_user_id:
            return _failure('Thiếu currentUserID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _failure('Không tìm thấy nhóm chat', status=404)

        try:
            with transaction.atomic():
                actor_member = _chat_member(chat.id, actor_user_id)
                target_member = _chat_member(chat.id, target_user_id)
                if not _is_chat_manager(chat, actor_member, actor_user_id):
                    return _failure('Bạn không có quyền xóa thành viên khỏi nhóm', status=403)
                if not target_member:
                    return _failure('Thành viên không thuộc nhóm', status=404)
                if target_user_id == actor_user_id:
                    return _failure('Không thể xóa chính bạn khỏi nhóm bằng thao tác này')
                if _is_chat_leader(chat, target_member, target_user_id):
                    return _failure('Không thể xóa trưởng nhóm khỏi nhóm')

                target_member.delete()

                message = _create_group_event(
                    chat,
                    actor_user_id,
                    f'{{{actor_user_id}}} đã xóa {{{target_user_id}}} khỏi nhóm',
                )
                target_user_ids = _chat_user_ids(chat.id, [actor_user_id, target_user_id])
                _broadcast_group_event(chat, target_user_ids, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'userID': target_user_id,
        })


class ChatLeaveGroupApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        target_user_id = _chat_target_user_id(request) or _actor_user_id(request)
        actor_user_id = _actor_user_id(request) or target_user_id

        if not chat_id:
            return _failure('Thi\u1ebfu chatID')
        if not target_user_id:
            return _failure('Thi\u1ebfu userID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP).first()
        if not chat:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y nh\u00f3m chat', status=404)

        try:
            with transaction.atomic():
                target_member = _chat_member(chat.id, target_user_id)
                if not target_member:
                    return _failure('Th\u00e0nh vi\u00ean kh\u00f4ng thu\u1ed9c nh\u00f3m', status=404)
                if _is_chat_leader(chat, target_member, target_user_id):
                    return _failure(
                        'Qu\u1ea3n tr\u1ecb vi\u00ean kh\u00f4ng th\u1ec3 r\u1eddi kh\u1ecfi nh\u00f3m. '
                        'Vui l\u00f2ng nh\u01b0\u1eddng quy\u1ec1n tr\u01b0\u1edfng nh\u00f3m tr\u01b0\u1edbc.'
                    )

                target_member.delete()

                message = _create_group_event(
                    chat,
                    actor_user_id,
                    f'{{{target_user_id}}} \u0111\u00e3 r\u1eddi nh\u00f3m',
                )
                target_user_ids = _chat_user_ids(chat.id, [target_user_id])
                _broadcast_group_event(chat, target_user_ids, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
            'userID': target_user_id,
        })


class ChatRemoveGroupApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        actor_user_id = _actor_user_id(request)

        if not chat_id:
            return _failure('Thi\u1ebfu chatID')
        if not actor_user_id:
            return _failure('Thi\u1ebfu currentUserID')

        chat = ManagedChat.objects.filter(id=chat_id, type=CHAT_TYPE_GROUP, is_deleted=False).first()
        if not chat:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y nh\u00f3m chat', status=404)

        try:
            with transaction.atomic():
                actor_member = _chat_member(chat.id, actor_user_id)
                if not _is_chat_leader(chat, actor_member, actor_user_id):
                    return _failure(
                        'Ch\u1ec9 qu\u1ea3n tr\u1ecb vi\u00ean nh\u00f3m m\u1edbi c\u00f3 quy\u1ec1n gi\u1ea3i t\u00e1n nh\u00f3m',
                        status=403,
                    )

                target_user_ids = _chat_user_ids(chat.id, [actor_user_id])
                chat.is_deleted = True
                chat.updated_by = actor_user_id
                chat.message_type = MESSAGE_TYPE_EVENT
                chat.save(update_fields=['is_deleted', 'updated_by', 'message_type', 'updated_date'])

                message = ManagedChatMessage.objects.create(
                    sender_id=actor_user_id,
                    message_type=MESSAGE_TYPE_EVENT,
                    content=f'{{{actor_user_id}}} \u0111\u00e3 gi\u1ea3i t\u00e1n nh\u00f3m',
                    chat_id=chat.id,
                )
                _broadcast_group_event(
                    chat,
                    target_user_ids,
                    message,
                    extra_payload={
                        'chatDeleted': True,
                        'isDeleted': True,
                    },
                )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat_id,
        })


class ChatEventsApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        user_id = _current_user_id(request) or _string(
            request.query_params.get('userID')
            or request.query_params.get('userId')
            or request.query_params.get('userid')
        )
        if not user_id:
            return _failure('Thieu userID')

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return _failure('Realtime chua san sang', status=503)

        try:
            channel_name = async_to_sync(channel_layer.new_channel)('sse.chat')
            group_names = [
                user_group_name(user_id),
                notification_user_group_name(user_id),
            ]
            for group_name in group_names:
                async_to_sync(channel_layer.group_add)(group_name, channel_name)
        except Exception as exc:
            logger.warning('Cannot open chat SSE stream for user %s: %s', user_id, exc)
            return _failure('Realtime chua san sang', status=503)

        def event_stream():
            try:
                yield _sse_payload('Connected', {'userID': user_id, 'transport': 'sse'})
                while True:
                    event = async_to_sync(_receive_channel_event)(channel_layer, channel_name)
                    if event is None:
                        yield ': heartbeat\n\n'
                        continue

                    yield _sse_payload(event.get('event', 'Message'), event.get('data'))
            except GeneratorExit:
                pass
            except Exception as exc:
                logger.warning('Chat SSE stream stopped for user %s: %s', user_id, exc)
            finally:
                for group_name in group_names:
                    try:
                        async_to_sync(channel_layer.group_discard)(group_name, channel_name)
                    except Exception:
                        pass

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


class ChatSendApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        current_user_id = _current_user_id(request)
        sender_id = _string(request.data.get('SenderID')) or current_user_id
        if not sender_id:
            return _failure('Thiếu SenderID')

        try:
            with transaction.atomic():
                chat = _create_chat_for_message(request, current_user_id or sender_id)
                if not _can_access_chat(chat, sender_id):
                    return _failure('Bạn không phải thành viên cuộc trò chuyện')

                link_id = _optional_string(request.data.get('LinkId'))
                if link_id and not chat.link_id:
                    chat.link_id = link_id

                chat.updated_by = current_user_id or sender_id
                chat.message_type = _int(request.data.get('MessageType'), MESSAGE_TYPE_TEXT) or MESSAGE_TYPE_TEXT
                chat.save(update_fields=['link_id', 'updated_by', 'message_type', 'updated_date'])

                message = ManagedChatMessage.objects.create(
                    sender_id=sender_id,
                    message_type=_int(request.data.get('MessageType'), MESSAGE_TYPE_TEXT) or MESSAGE_TYPE_TEXT,
                    reply_to_id=_optional_string(request.data.get('ReplyToID')),
                    content=request.data.get('Content') or '',
                    chat_id=chat.id,
                    event_id=_optional_string(request.data.get('EventID')),
                    event_type=_int(request.data.get('EventType'), None) if request.data.get('EventType') else None,
                    list_user_join_remind=_optional_string(request.data.get('ListUserJoinRemind')),
                )

                chat_files = []
                for upload in _collect_uploads(request):
                    saved_path = _save_chat_file(upload, chat.id)
                    chat_files.append(ManagedChatFile.objects.create(
                        chat_id=chat.id,
                        message_id=message.id,
                        file=default_storage.url(saved_path),
                        file_name=getattr(upload, 'name', '') or os.path.basename(saved_path),
                        size=_file_size_mb(upload),
                        extension=Path(getattr(upload, 'name', '') or saved_path).suffix.lstrip('.'),
                        created_by=current_user_id or sender_id,
                    ))

                chat_links = []
                for link in _parse_json_list(request.data.get('ChatLinks')):
                    link_value = _string(link)
                    if link_value:
                        chat_links.append(ManagedChatLink.objects.create(
                            chat_id=chat.id,
                            message_id=message.id,
                            link=link_value,
                            created_by=current_user_id or sender_id,
                        ))

                message_payload = _serialize_message(
                    message,
                    {message.id: chat_files},
                    {message.id: chat_links},
                )
                target_user_ids = list(
                    ManagedChatUser.objects
                    .filter(chat_id=chat.id)
                    .values_list('user_id', flat=True)
                )
                target_user_ids.extend(_request_chat_user_ids(request))
                if sender_id not in target_user_ids:
                    target_user_ids.append(sender_id)
                target_user_ids = sorted({user_id for user_id in target_user_ids if user_id})

                chat_users_payload = json.dumps(
                    [{'UserID': user_id} for user_id in target_user_ids],
                    ensure_ascii=False,
                )
                message_payload.update({
                    'ChatType': chat.type,
                    'chatType': chat.type,
                    'ChatUsers': chat_users_payload,
                    'chatUsers': chat_users_payload,
                })

                def publish_chat_events(chat_obj=chat, user_ids=target_user_ids, payload=message_payload):
                    broadcast_chat_message(chat_obj.id, user_ids, payload)
                    _notify_chat_message(chat_obj, sender_id, user_ids, payload)

                transaction.on_commit(publish_chat_events)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success({
            'chatID': chat.id,
            'chatId': chat.id,
            'id': chat.id,
            'messageID': message.id,
            'messageId': message.id,
            'message': message_payload,
        })


class ChatDetailApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thiếu chatID')

        chat = ManagedChat.objects.filter(id=chat_id, is_deleted=False).first()
        if not chat and chat_id == HERITAGE_ASSISTANT_CHAT_ID:
            return _success({
                'dataChat': {
                    'id': HERITAGE_ASSISTANT_CHAT_ID,
                    'name': HERITAGE_ASSISTANT_NAME,
                    'type': CHAT_TYPE_PRIVATE,
                    'avatar': HERITAGE_ASSISTANT_AVATAR,
                    'isAI': True,
                },
                'dataChatMessage': [],
            })

        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        current_user_id = _current_user_id(request)
        if not _can_access_chat(chat, current_user_id):
            return _failure('Bạn không phải thành viên cuộc trò chuyện')

        page = _int(request.query_params.get('page'), 0)
        page_size = _int(
            request.query_params.get('pageSize')
            or request.query_params.get('page_size'),
            0
        )
        is_paginated = page > 0 and page_size > 0

        message_qs = (
            ManagedChatMessage.objects
            .filter(chat_id=chat.id, is_deleted=False)
            .order_by('created_date')
        )
        if is_paginated:
            total_messages = message_qs.count()
            start_index = max(total_messages - (page * page_size), 0)
            end_index = max(total_messages - ((page - 1) * page_size), 0)
            messages = list(message_qs[start_index:end_index])
        else:
            total_messages = None
            messages = list(message_qs)

        message_ids = [message.id for message in messages]
        files_qs = ManagedChatFile.objects.filter(chat_id=chat.id)
        links_qs = ManagedChatLink.objects.filter(chat_id=chat.id)
        if is_paginated:
            files_qs = files_qs.filter(message_id__in=message_ids)
            links_qs = links_qs.filter(message_id__in=message_ids)

        files = list(files_qs.order_by('created_date'))
        files_by_message = {}
        for item in files:
            files_by_message.setdefault(item.message_id, []).append(item)
        links = list(links_qs.order_by('created_date'))
        links_by_message = {}
        for item in links:
            links_by_message.setdefault(item.message_id, []).append(item)
        pin_date = PIN_DATE_UNSET
        if current_user_id:
            try:
                pin = ManagedChatPin.objects.filter(chat_id=chat.id, user_id=current_user_id).first()
                pin_date = pin.pin_date if pin else None
            except DatabaseError:
                pin_date = chat.pin_date

        seen_by_message = _seen_by_message_map([message.id for message in messages])

        payload = {
            'dataChat': _serialize_chat(chat, pin_date),
            'dataChatMessage': [
                _serialize_message(message, files_by_message, links_by_message, seen_by_message)
                for message in messages
            ],
        }
        if is_paginated:
            payload.update({
                'page': page,
                'pageSize': page_size,
                'totalCount': total_messages,
                'hasMore': page * page_size < total_messages,
            })

        return _success(payload)


class ChatSeenApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        identifier = _string(
            request.query_params.get('messageId')
            or request.query_params.get('messageID')
            or request.query_params.get('chatMessageId')
            or request.query_params.get('chatMessageID')
            or request.query_params.get('chatId')
            or request.query_params.get('chatID')
        )
        if not identifier:
            return _success(None)

        current_user_id = _current_user_id(request)
        message = ManagedChatMessage.objects.filter(id=identifier, is_deleted=False).first()
        chat_id = message.chat_id if message else identifier

        if not message:
            message = (
                ManagedChatMessage.objects
                .filter(chat_id=chat_id, is_deleted=False)
                .order_by('-created_date')
                .first()
            )

        if current_user_id:
            ManagedChatSeen.objects.update_or_create(
                chat_id=chat_id,
                user_id=current_user_id,
                defaults={
                    'chat_message_id': message.id if message else '',
                },
            )

        ManagedChat.objects.filter(id=chat_id).update(updated_date=timezone.now())

        payload = None
        if message:
            files = list(ManagedChatFile.objects.filter(message_id=message.id).order_by('created_date'))
            links = list(ManagedChatLink.objects.filter(message_id=message.id).order_by('created_date'))
            payload = _serialize_message(
                message,
                {message.id: files},
                {message.id: links},
                _seen_by_message_map([message.id]),
            )
            payload['isSeenUpdate'] = True
            payload['IsSeenUpdate'] = True
            broadcast_chat_message(chat_id, _chat_user_ids(chat_id, [current_user_id]), payload)

        return _success({
            'chatId': chat_id,
            'chatID': chat_id,
            'messageId': message.id if message else '',
            'messageID': message.id if message else '',
            'message': payload,
        })


class ChatPinOrUnPinApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thiếu chatID')

        current_user_id = _current_user_id(request)
        if not current_user_id:
            return _failure('Thiếu userID')

        chat = ManagedChat.objects.filter(id=chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        try:
            with transaction.atomic():
                existing = ManagedChatPin.objects.filter(
                    chat_id=chat_id,
                    user_id=current_user_id,
                ).first()

                if existing:
                    existing.delete()
                    return _success({
                        'chatID': chat_id,
                        'isPinned': False,
                        'pinDate': None,
                    })

                pin = ManagedChatPin.objects.create(
                    chat_id=chat_id,
                    user_id=current_user_id,
                )
                return _success({
                    'chatID': chat_id,
                    'isPinned': True,
                    'pinDate': pin.pin_date.isoformat() if pin.pin_date else None,
                })
        except DatabaseError:
            pin_date = None if chat.pin_date else timezone.now()
            chat.pin_date = pin_date
            chat.save(update_fields=['pin_date', 'updated_date'])
            return _success({
                'chatID': chat_id,
                'isPinned': bool(pin_date),
                'pinDate': pin_date.isoformat() if pin_date else None,
            })


class ChatUnsendMessageApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        message_id = _string(request.query_params.get('messageID') or request.query_params.get('messageId'))
        if not message_id:
            return _failure('Thiếu messageID')

        message = ManagedChatMessage.objects.filter(id=message_id, is_deleted=False).first()
        if not message:
            return _failure('Không tìm thấy tin nhắn', status=404)

        chat = ManagedChat.objects.filter(id=message.chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        current_user_id = _current_user_id(request)
        if current_user_id:
            if not _can_access_chat(chat, current_user_id):
                return _failure('Bạn không phải thành viên cuộc trò chuyện')
            if _string(message.sender_id) != _string(current_user_id):
                return _failure('Bạn chỉ có thể thu hồi tin nhắn của mình')

        with transaction.atomic():
            if not message.is_unsend:
                message.is_unsend = True
                message.save(update_fields=['is_unsend'])
            _broadcast_message_state(
                message.chat_id,
                message.id,
                MESSAGE_TYPE_UNSEND,
                'Message unsent',
            )

        return _success(None)


class ChatPinMessageApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        message_id = _string(request.query_params.get('messageID') or request.query_params.get('messageId'))
        if not message_id:
            return _failure('Thiếu messageID')

        message = ManagedChatMessage.objects.filter(id=message_id, is_deleted=False).first()
        if not message:
            return _failure('Không tìm thấy tin nhắn', status=404)

        chat = ManagedChat.objects.filter(id=message.chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        current_user_id = _current_user_id(request)
        if current_user_id and not _can_access_chat(chat, current_user_id):
            return _failure('Bạn không phải thành viên cuộc trò chuyện')

        with transaction.atomic():
            if not message.is_pin:
                message.is_pin = True
                message.save(update_fields=['is_pin'])
            _broadcast_message_state(
                message.chat_id,
                message.id,
                MESSAGE_TYPE_PIN,
                'Message pinned',
            )

        return _success(None)


class ChatPinnedMessageListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thiếu chatID')

        chat = ManagedChat.objects.filter(id=chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        current_user_id = _current_user_id(request)
        if current_user_id and not _can_access_chat(chat, current_user_id):
            return _failure('Bạn không phải thành viên cuộc trò chuyện')

        messages = list(
            ManagedChatMessage.objects
            .filter(chat_id=chat_id, is_deleted=False, is_pin=True)
            .order_by('-created_date')
        )
        files_by_message, links_by_message = _message_related_data(messages)

        return _success({
            'dataChat': _serialize_chat(chat),
            'dataChatMessage': [
                _serialize_message(message, files_by_message, links_by_message)
                for message in messages
            ],
        })


class ChatUnpinMessageApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        raw_message_ids = request.data.get('messageID') or request.data.get('messageId') or []
        raw_event_ids = request.data.get('eventID') or request.data.get('eventId') or []

        message_ids = _normalize_id_list(raw_message_ids)
        event_ids = _normalize_id_list(raw_event_ids)
        if not message_ids and not event_ids:
            return _failure('Thiếu messageID hoặc eventID')

        messages = list(
            ManagedChatMessage.objects
            .filter(id__in=message_ids, is_deleted=False)
        )
        if not messages and message_ids:
            return _failure('Không tìm thấy tin nhắn', status=404)

        chat_id = messages[0].chat_id if messages else ''
        if not chat_id and event_ids:
            event_message = (
                ManagedChatMessage.objects
                .filter(event_id__in=event_ids, is_deleted=False)
                .first()
            )
            chat_id = event_message.chat_id if event_message else ''

        if not chat_id:
            return _success(None)

        chat = ManagedChat.objects.filter(id=chat_id).first()
        if not chat:
            return _failure('Không tìm thấy cuộc trò chuyện', status=404)

        current_user_id = _current_user_id(request)
        if current_user_id and not _can_access_chat(chat, current_user_id):
            return _failure('Bạn không phải thành viên cuộc trò chuyện')

        with transaction.atomic():
            updated = 0
            if message_ids:
                updated += (
                    ManagedChatMessage.objects
                    .filter(id__in=message_ids, chat_id=chat_id, is_deleted=False)
                    .update(is_pin=False)
                )
            if event_ids:
                updated += (
                    ManagedChatMessage.objects
                    .filter(event_id__in=event_ids, chat_id=chat_id, is_deleted=False)
                    .update(is_pin=False)
                )

            if updated:
                _broadcast_message_state(
                    chat_id,
                    message_ids[0] if message_ids else event_ids[0],
                    MESSAGE_TYPE_UNPIN,
                    'Message unpinned',
                )

        return _success(None)


