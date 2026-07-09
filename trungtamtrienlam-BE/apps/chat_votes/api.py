import json
import logging
import uuid

from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.db import transaction
from django.db.models import Count
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.dateparse import parse_datetime
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.chat_votes.models import ManagedChatVote
from apps.chat_votes.models import ManagedChatVoteOption
from apps.chat_votes.models import ManagedChatVoteResult
from apps.chats.models import ManagedChat
from apps.chats.models import ManagedChatMessage
from apps.chats.models import ManagedChatUser
from apps.chats.realtime import broadcast_chat_message
from apps.notifications.notify_events import notify_events

logger = logging.getLogger(__name__)

MESSAGE_TYPE_EVENT = 5
EVENT_TYPE_VOTE = 2
SUCCESS_MESSAGE = 'L\u1ea5y d\u1eef li\u1ec7u th\u00e0nh c\u00f4ng'
FAILURE_MESSAGE = 'Thao t\u00e1c th\u1ea5t b\u1ea1i'
CREATE_VOTE_TEMPLATE = '{name} \u0111\u00e3 t\u1ea1o b\u00ecnh ch\u1ecdn m\u1edbi'
DELETE_VOTE_TEMPLATE = '{name} \u0111\u00e3 x\u00f3a b\u00ecnh ch\u1ecdn'
VOTE_TEMPLATE = '{name} \u0111\u00e3 tham gia b\u00ecnh ch\u1ecdn {vote_name}'

def _new_id():
    return str(uuid.uuid4())

def _success(payload=None):
    return Response({
        'status': 200,
        'message': SUCCESS_MESSAGE,
        'data': {
            'status': 200,
            'message': None,
            'data': payload,
        },
        'errors': None,
    })

def _failure(message=FAILURE_MESSAGE, status=400):
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

def _bool(value):
    if isinstance(value, bool):
        return value
    return _string(value).lower() in {'1', 'true', 'yes', 'on'}

def _parse_datetime(value):
    if not value:
        return None
    if hasattr(value, 'isoformat'):
        parsed = value
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed

    parsed = parse_datetime(_string(value))
    if not parsed:
        parsed_date = parse_date(_string(value))
        if parsed_date:
            parsed = timezone.datetime.combine(parsed_date, timezone.datetime.min.time())

    if parsed and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed

def _aware_datetime(value):
    if not value:
        return None
    return timezone.make_aware(value, timezone.get_current_timezone()) if timezone.is_naive(value) else value

def _is_vote_expired(vote):
    date_end = _aware_datetime(getattr(vote, 'date_end', None))
    return bool(date_end and timezone.now() >= date_end)

def _is_vote_closed(vote):
    return bool(getattr(vote, 'is_completed', False) or _is_vote_expired(vote))

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

def _request_data(request):
    return getattr(request, 'data', {}) or {}

def _data_value(data, *fields):
    for field in fields:
        if field in data:
            return data[field], True
    return None, False

def _option_items(value):
    items = _parse_json_list(value)
    return [item for item in items if isinstance(item, dict)]

def _option_ids(value):
    if isinstance(value, list):
        return [_string(item) for item in value if _string(item)]
    parsed = _parse_json_list(value)
    if parsed:
        return [_string(item) for item in parsed if _string(item)]
    if _string(value):
        return [_string(item) for item in _string(value).split(',') if _string(item)]
    return []

def _user_display(user_id):
    lookup = _string(user_id)
    if not lookup:
        return {'name': '', 'avatar': ''}

    User = get_user_model()
    user = User.objects.filter(id=lookup).first()
    if not user:
        user = User.objects.filter(Q(username=lookup) | Q(email=lookup)).first()
    if not user:
        return {'name': lookup, 'avatar': ''}

    staff = None
    try:
        from apps.departments.models import Staff
        staff = (
            Staff.objects
            .filter(user_id=getattr(user, 'id', None), is_deleted=False)
            .order_by('-is_manager', '-updated_at', '-created_at')
            .first()
        )
    except Exception:
        staff = None

    name = _string(getattr(staff, 'full_name', '') if staff else '') or _string(user.get_full_name()) or _string(user.get_username())
    avatar = _string(getattr(staff, 'avatar', '') if staff else '') or _string(getattr(user, 'avatar', ''))
    return {'name': name or lookup, 'avatar': avatar}


def _actor(request):
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        user_id = _string(getattr(user, 'id', None))
        name = _string(
            user.get_full_name()
            or getattr(user, 'username', None)
        )
        return {
            'id': user_id,
            'name': name or user_id,
            'django_id': user_id,
        }

    data = _request_data(request)
    user_id = _string(
        data.get('SenderID')
        or data.get('UserID')
        or data.get('userID')
        or data.get('CreatedBy')
        or request.query_params.get('userID')
        or request.query_params.get('UserID')
        or request.query_params.get('SenderID')
    )
    display = _user_display(user_id)
    return {
        'id': user_id,
        'name': display['name'] or user_id,
        'django_id': '',
    }


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

    return [user_id for user_id in user_ids if user_id]


def _serialize_message(message):
    sender = _user_display(message.sender_id)
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
        'senderName': sender['name'],
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


def _create_vote_event(chat_id, actor_id, content, event_id):
    chat = ManagedChat.objects.filter(id=chat_id).first()
    if chat:
        chat.updated_by = actor_id
        chat.message_type = MESSAGE_TYPE_EVENT
        chat.event_type = EVENT_TYPE_VOTE
        chat.save(update_fields=['updated_by', 'message_type', 'event_type', 'updated_date'])

    return ManagedChatMessage.objects.create(
        sender_id=actor_id,
        message_type=MESSAGE_TYPE_EVENT,
        content=content,
        chat_id=chat_id,
        event_id=event_id,
        event_type=EVENT_TYPE_VOTE,
    )


def _broadcast_vote_event(chat_id, actor, message):
    user_ids = _chat_user_ids(chat_id, [actor.get('id'), actor.get('django_id')])
    payload = _serialize_message(message)
    transaction.on_commit(
        lambda chat_id=chat_id, target_user_ids=user_ids, data=payload:
        broadcast_chat_message(chat_id, target_user_ids, data)
    )


def _vote_queryset(chat_id):
    return (
        ManagedChatVote.objects
        .filter(chat_id=chat_id)
        .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        .order_by('-is_pin', '-pin_date', '-created_date', 'id')
    )


def _serialize_vote(vote, current_user_id=''):
    options = list(
        ManagedChatVoteOption.objects
        .filter(vote_id=vote.id)
        .order_by('created_date', 'id')
    )
    result_qs = ManagedChatVoteResult.objects.filter(vote_id=vote.id)
    counts = {
        item['option_id']: item['total']
        for item in result_qs.values('option_id').annotate(total=Count('id'))
    }
    current_user_option_ids = set()
    if current_user_id:
        current_user_option_ids = set(
            result_qs
            .filter(user_id=current_user_id)
            .values_list('option_id', flat=True)
        )
    count_user_vote = (
        result_qs
        .exclude(user_id__isnull=True)
        .exclude(user_id='')
        .values('user_id')
        .distinct()
        .count()
    )

    option_payload = []
    for option in options:
        count_vote = counts.get(option.id, 0)
        option_payload.append({
            'optionName': option.option_name or '',
            'id': option.id,
            'voteID': option.vote_id,
            'countVote': str(count_vote),
            'voteCount': count_vote,
            'userVoted': option.id in current_user_option_ids,
        })

    option_lists = json.dumps(option_payload, ensure_ascii=False)
    created_date = vote.created_date.isoformat() if vote.created_date else None
    date_end = vote.date_end.isoformat() if vote.date_end else None
    pin_date = vote.pin_date.isoformat() if vote.pin_date else None
    is_expired = _is_vote_expired(vote)
    is_closed = bool(vote.is_completed) or is_expired

    return {
        'id': vote.id,
        'chatID': vote.chat_id,
        'voteName': vote.vote_name,
        'createdBy': vote.created_by,
        'createdDate': created_date,
        'dateEnd': date_end,
        'isMulti': bool(vote.is_multi),
        'remindVote': bool(vote.remind_vote),
        'isCompleted': bool(vote.is_completed),
        'isExpired': is_expired,
        'isClosed': is_closed,
        'canVote': not is_closed and not bool(vote.is_deleted),
        'isDeleted': bool(vote.is_deleted),
        'isPin': bool(vote.is_pin),
        'pinDate': pin_date,
        'optionLists': option_lists,
        'countUserVote': count_user_vote,
    }


def _create_options(vote_id, chat_id, options, actor_id):
    now = timezone.now()
    option_models = []
    for item in options:
        option_name = _string(item.get('OptionName') or item.get('optionName'))
        if not option_name:
            continue
        option_models.append(ManagedChatVoteOption(
            id=_new_id(),
            vote_id=vote_id,
            option_name=option_name,
            created_date=now,
            created_by=actor_id,
            chat_id=chat_id,
        ))

    if not option_models:
        return []

    ManagedChatVoteOption.objects.bulk_create(option_models)
    return option_models


class ChatVoteListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = _string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thi\u1ebfu chatID')

        actor = _actor(request)
        votes = [_serialize_vote(vote, actor.get('id')) for vote in _vote_queryset(chat_id)]
        return _success(votes)


class ChatVoteCreateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = _request_data(request)
        actor = _actor(request)
        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')

        chat_id = _string(data.get('ChatID') or data.get('chatID') or data.get('chatId'))
        vote_name = _string(data.get('VoteName') or data.get('voteName'))
        options = _option_items(data.get('Options') or data.get('options'))
        if not chat_id:
            return _failure('Thi\u1ebfu ChatID')
        if not vote_name:
            return _failure('Thi\u1ebfu VoteName')
        if not options:
            return _failure('Thi\u1ebfu Options')

        vote_id = _new_id()
        try:
            with transaction.atomic():
                ManagedChatVote.objects.create(
                    id=vote_id,
                    chat_id=chat_id,
                    vote_name=vote_name,
                    created_by=actor['id'],
                    created_date=timezone.now(),
                    date_end=_parse_datetime(data.get('DateEnd') or data.get('dateEnd')),
                    is_multi=_bool(data.get('IsMulti') or data.get('isMulti')),
                    remind_vote=_bool(data.get('RemindVote') or data.get('remindVote')),
                    is_completed=False,
                    is_deleted=False,
                    is_pin=False,
                )
                created_options = _create_options(vote_id, chat_id, options, actor['id'])
                if not created_options:
                    raise ValueError('Thi\u1ebfu Options')

                message = _create_vote_event(
                    chat_id,
                    actor['id'],
                    CREATE_VOTE_TEMPLATE.format(name=actor['name']),
                    vote_id,
                )
                _broadcast_vote_event(chat_id, actor, message)
                notify_events(chat_id, actor['id'], message, event_kind='vote')
        except ValueError as exc:
            return _failure(str(exc))
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(vote_id)


class ChatVoteDeleteApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = _request_data(request)
        vote_id = _string(
            data.get('noteID')
            or data.get('VoteID')
            or data.get('voteID')
            or request.query_params.get('noteID')
            or request.query_params.get('voteID')
        )
        actor = _actor(request)
        if not vote_id:
            return _failure('Thi\u1ebfu voteID')
        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')

        vote = ManagedChatVote.objects.filter(id=vote_id).first()
        if not vote:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y b\u00ecnh ch\u1ecdn', status=404)

        try:
            with transaction.atomic():
                vote.is_deleted = True
                vote.save(update_fields=['is_deleted'])
                message = _create_vote_event(
                    vote.chat_id,
                    actor['id'],
                    DELETE_VOTE_TEMPLATE.format(name=actor['name']),
                    vote_id,
                )
                _broadcast_vote_event(vote.chat_id, actor, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)


class ChatVotePinOrUnpinApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = _request_data(request)
        vote_id = _string(
            data.get('voteID')
            or data.get('VoteID')
            or request.query_params.get('voteID')
            or request.query_params.get('VoteID')
        )
        is_pin = _bool(
            data.get('isPin')
            if 'isPin' in data else data.get('IsPin')
            if 'IsPin' in data else request.query_params.get('isPin')
            or request.query_params.get('IsPin')
        )
        if not vote_id:
            return _failure('Thi\u1ebfu voteID')

        vote = ManagedChatVote.objects.filter(id=vote_id).first()
        if not vote:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y b\u00ecnh ch\u1ecdn', status=404)

        vote.is_pin = is_pin
        vote.pin_date = timezone.now() if is_pin else None
        try:
            vote.save(update_fields=['is_pin', 'pin_date'])
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)


class ChatVoteSubmitApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = _request_data(request)
        actor = _actor(request)
        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')

        vote_id = _string(data.get('VoteID') or data.get('voteID'))
        chat_id = _string(data.get('ChatID') or data.get('chatID') or data.get('chatId'))
        option_value, has_option_ids = _data_value(data, 'OptionIDs', 'optionIDs', 'OptionID')
        option_ids = _option_ids(option_value)
        if not vote_id:
            return _failure('Thi\u1ebfu VoteID')
        if not has_option_ids:
            return _failure('Thi\u1ebfu OptionIDs')

        vote = ManagedChatVote.objects.filter(id=vote_id).first()
        if not vote:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y b\u00ecnh ch\u1ecdn', status=404)
        if vote.is_deleted:
            return _failure('B\u00ecnh ch\u1ecdn \u0111\u00e3 b\u1ecb x\u00f3a', status=404)
        if _is_vote_closed(vote):
            return _failure('B\u00ecnh ch\u1ecdn \u0111\u00e3 k\u1ebft th\u00fac')
        chat_id = chat_id or vote.chat_id

        if not vote.is_multi and len(option_ids) > 1:
            option_ids = option_ids[:1]

        try:
            with transaction.atomic():
                ManagedChatVoteResult.objects.filter(
                    vote_id=vote_id,
                    user_id=actor['id'],
                ).delete()

                now = timezone.now()
                ManagedChatVoteResult.objects.bulk_create([
                    ManagedChatVoteResult(
                        id=_new_id(),
                        vote_id=vote_id,
                        option_id=option_id,
                        user_id=actor['id'],
                        created_date=now,
                        created_by=actor['id'],
                        chat_id=chat_id,
                    )
                    for option_id in option_ids
                ])

                message = _create_vote_event(
                    chat_id,
                    actor['id'],
                    VOTE_TEMPLATE.format(name=actor['name'], vote_name=vote.vote_name or ''),
                    vote_id,
                )
                _broadcast_vote_event(chat_id, actor, message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)


class ChatVoteResultApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        vote_id = _string(request.query_params.get('voteID') or request.query_params.get('VoteID'))
        if not vote_id:
            return _failure('Thi\u1ebfu voteID')

        options = list(
            ManagedChatVoteOption.objects
            .filter(vote_id=vote_id)
            .order_by('created_date', 'id')
        )
        results = list(
            ManagedChatVoteResult.objects
            .filter(vote_id=vote_id)
            .order_by('created_date', 'id')
        )
        results_by_option = {}
        for result in results:
            results_by_option.setdefault(result.option_id, []).append(result)

        payload = []
        for option in options:
            voters = []
            for result in results_by_option.get(option.id, []):
                display = _user_display(result.user_id)
                voters.append({
                    'id': result.user_id,
                    'fullName': display['name'],
                    'avatar': display['avatar'],
                    'createdDate': result.created_date.isoformat() if result.created_date else None,
                })
            payload.append({
                'id': option.id,
                'optionName': option.option_name,
                'voters': json.dumps(voters, ensure_ascii=False),
            })

        return _success(payload)


class ChatVoteCreateOptionsApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = _request_data(request)
        actor = _actor(request)
        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')

        vote_id = _string(data.get('ID') or data.get('VoteID') or data.get('voteID'))
        chat_id = _string(data.get('ChatID') or data.get('chatID') or data.get('chatId'))
        options = _option_items(data.get('Options') or data.get('options'))
        if not vote_id:
            return _failure('Thi\u1ebfu ID')
        if not options:
            return _failure('Thi\u1ebfu Options')

        vote = ManagedChatVote.objects.filter(id=vote_id).first()
        if not vote:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y b\u00ecnh ch\u1ecdn', status=404)
        if vote.is_deleted:
            return _failure('B\u00ecnh ch\u1ecdn \u0111\u00e3 b\u1ecb x\u00f3a', status=404)
        if _is_vote_closed(vote):
            return _failure('B\u00ecnh ch\u1ecdn \u0111\u00e3 k\u1ebft th\u00fac')

        try:
            with transaction.atomic():
                created_options = _create_options(vote_id, chat_id or vote.chat_id, options, actor['id'])
                if not created_options:
                    raise ValueError('Thi\u1ebfu Options')
        except ValueError as exc:
            return _failure(str(exc))
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(vote_id)


