"""Chat remind APIs."""

from django.db import DatabaseError
from django.db import transaction
from django.utils import timezone
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.chat_reminds.models import ManagedChatRemind
from apps.chat_reminds.services import CREATE_REMIND_TEMPLATE
from apps.chat_reminds.services import DECLINE_REMIND_TEXT
from apps.chat_reminds.services import JOIN_REMIND_TEMPLATE
from apps.chat_reminds.services import JOIN_REMIND_TEXT
from apps.chat_reminds.services import REPEAT_NOT_REPEAT
from apps.chat_reminds.services import UPDATE_REMIND_TEMPLATE
from apps.chat_reminds.services import actor_from_request
from apps.chat_reminds.services import bool_value
from apps.chat_reminds.services import broadcast_remind_event
from apps.chat_reminds.services import create_remind_event
from apps.chat_reminds.services import data_value
from apps.chat_reminds.services import get_remind_detail
from apps.chat_reminds.services import int_or_none
from apps.chat_reminds.services import new_id
from apps.chat_reminds.services import parse_datetime_value
from apps.chat_reminds.services import remind_queryset
from apps.chat_reminds.services import request_data
from apps.chat_reminds.services import schedule_remind_id
from apps.chat_reminds.services import serialize_remind
from apps.chat_reminds.services import string
from apps.chat_reminds.services import upsert_remind_user
from apps.notifications.notify_events import notify_events


SUCCESS_MESSAGE = 'L\u1ea5y d\u1eef li\u1ec7u th\u00e0nh c\u00f4ng'
FAILURE_MESSAGE = 'Thao t\u00e1c th\u1ea5t b\u1ea1i'


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


def _remind_payload(data):
    return {
        'id': string(data_value(data, 'ID', 'id')),
        'remind_name': string(data_value(data, 'RemindName', 'remindName')),
        'remind_content': string(data_value(data, 'RemindContent', 'remindContent')),
        'chat_id': string(data_value(data, 'ChatID', 'chatID', 'chatId')),
        'remind_time': parse_datetime_value(data_value(data, 'RemindTime', 'remindTime')),
        'repeat_type': int_or_none(data_value(data, 'RepeatType', 'repeatType')),
    }


class ChatRemindListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thi\u1ebfu chatID')

        actor = actor_from_request(request)
        reminds = [
            serialize_remind(remind, current_user_id=actor.get('id'))
            for remind in remind_queryset(chat_id)
        ]
        return _success(reminds)


class ChatRemindDetailApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        remind_id = string(
            request.query_params.get('chatRemindID')
            or request.query_params.get('idChatRemind')
            or request.query_params.get('ID')
            or request.query_params.get('id')
        )
        if not remind_id:
            return _failure('Thi\u1ebfu chatRemindID')

        remind = get_remind_detail(remind_id)
        if not remind:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y nh\u1eafc h\u1eb9n', status=404)

        actor = actor_from_request(request)
        return _success(serialize_remind(remind, current_user_id=actor.get('id')))


class ChatRemindCreateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = request_data(request)
        actor = actor_from_request(request)
        payload = _remind_payload(data)

        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')
        if not payload['chat_id']:
            return _failure('Thi\u1ebfu ChatID')
        if not payload['remind_content']:
            return _failure('Thi\u1ebfu RemindContent')
        if not payload['remind_time']:
            return _failure('Thi\u1ebfu RemindTime')

        remind_id = new_id()
        repeat_type = payload['repeat_type']
        if repeat_type is None:
            repeat_type = REPEAT_NOT_REPEAT

        try:
            with transaction.atomic():
                remind = ManagedChatRemind.objects.create(
                    id=remind_id,
                    remind_name=payload['remind_name'],
                    remind_content=payload['remind_content'],
                    chat_id=payload['chat_id'],
                    remind_time=payload['remind_time'],
                    repeat_type=repeat_type,
                    created_date=timezone.now(),
                    created_by=actor['id'],
                    is_deleted=False,
                )
                upsert_remind_user(remind, actor['id'], True)
                message = create_remind_event(
                    remind.chat_id,
                    actor['id'],
                    CREATE_REMIND_TEMPLATE.format(name=actor['name']),
                    remind.id,
                )
                broadcast_remind_event(remind.chat_id, actor['id'], message)
                notify_events(remind.chat_id, actor['id'], message, event_kind='remind')
                transaction.on_commit(lambda remind_id=remind.id: schedule_remind_id(remind_id))
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(remind_id)


class ChatRemindUpdateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = request_data(request)
        actor = actor_from_request(request)
        payload = _remind_payload(data)
        remind_id = payload['id']

        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')
        if not remind_id:
            return _failure('Thi\u1ebfu ID')

        remind = get_remind_detail(remind_id)
        if not remind:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y nh\u1eafc h\u1eb9n', status=404)

        new_repeat_type = payload['repeat_type']
        if new_repeat_type is None:
            new_repeat_type = remind.repeat_type
        new_remind_time = payload['remind_time'] or remind.remind_time
        is_change_job = (
            remind.remind_time != new_remind_time
            or remind.repeat_type != new_repeat_type
        )

        try:
            with transaction.atomic():
                if payload['remind_name']:
                    remind.remind_name = payload['remind_name']
                if payload['remind_content']:
                    remind.remind_content = payload['remind_content']
                remind.remind_time = new_remind_time
                remind.repeat_type = new_repeat_type
                remind.modified_date = timezone.now()
                remind.save(update_fields=[
                    'remind_name',
                    'remind_content',
                    'remind_time',
                    'repeat_type',
                    'modified_date',
                ])

                message = create_remind_event(
                    remind.chat_id,
                    actor['id'],
                    UPDATE_REMIND_TEMPLATE.format(name=actor['name']),
                    remind.id,
                )
                broadcast_remind_event(remind.chat_id, actor['id'], message)
                if is_change_job:
                    transaction.on_commit(
                        lambda remind_id=remind.id: schedule_remind_id(remind_id, is_change_job=True)
                    )
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(remind.id)


class ChatRemindUserJoinApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        remind_id = string(
            request.query_params.get('idChatRemind')
            or request.query_params.get('chatRemindID')
            or request.query_params.get('ID')
            or request.query_params.get('id')
        )
        joined = bool_value(request.query_params.get('type'))
        actor = actor_from_request(request)

        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')
        if not remind_id:
            return _failure('Thi\u1ebfu idChatRemind')

        remind = get_remind_detail(remind_id)
        if not remind:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y nh\u1eafc h\u1eb9n', status=404)

        action = JOIN_REMIND_TEXT if joined else DECLINE_REMIND_TEXT
        try:
            with transaction.atomic():
                upsert_remind_user(remind, actor['id'], joined)
                message = create_remind_event(
                    remind.chat_id,
                    actor['id'],
                    JOIN_REMIND_TEMPLATE.format(
                        name=actor['name'],
                        action=action,
                        content=remind.remind_content or '',
                    ),
                    remind.id,
                )
                broadcast_remind_event(remind.chat_id, actor['id'], message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(remind.id)

