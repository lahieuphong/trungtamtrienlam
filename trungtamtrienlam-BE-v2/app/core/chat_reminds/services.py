"""Services for managed chat reminders."""

import json
import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.dateparse import parse_datetime

from core.chat_reminds.models import ManagedChatRemind
from core.chat_reminds.models import ManagedChatRemindJob
from core.chat_reminds.models import ManagedChatRemindUser
from core.chats.models import ManagedChat
from core.chats.models import ManagedChatMessage
from core.chats.models import ManagedChatUser
from core.chats.realtime import broadcast_chat_message
from core.notifications.notify_events import notify_events


logger = logging.getLogger(__name__)

MESSAGE_TYPE_EVENT = 5
EVENT_TYPE_REMIND = 3
JOB_STATUS_ACTIVE = 0
JOB_STATUS_CANCELED = 1
JOB_STATUS_FINISHED = 2
REPEAT_NOT_REPEAT = 0
REPEAT_DAILY = 1
REPEAT_WEEKLY = 2
REPEAT_MONTHLY = 3
REMIND_TASK_NAME = 'apps.chat_reminds.tasks.run_chat_remind_job'

CREATE_REMIND_TEMPLATE = '{name} \u0111\u00e3 t\u1ea1o nh\u1eafc h\u1eb9n m\u1edbi'
UPDATE_REMIND_TEMPLATE = '{name} \u0111\u00e3 ch\u1ec9nh s\u1eeda nh\u1eafc h\u1eb9n'
JOIN_REMIND_TEMPLATE = '{name} x\u00e1c nh\u1eadn: {action} {content}'
JOIN_REMIND_TEXT = 'Tham gia'
DECLINE_REMIND_TEXT = 'Kh\u00f4ng tham gia'
RUN_REMIND_TEXT = 'Nh\u1eafc h\u1eb9n'


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


def int_or_none(value):
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_datetime_value(value):
    if not value:
        return None
    if hasattr(value, 'isoformat'):
        parsed = value
    else:
        parsed = parse_datetime(string(value))
        if not parsed:
            parsed_date = parse_date(string(value))
            if parsed_date:
                parsed = timezone.datetime.combine(parsed_date, timezone.datetime.min.time())

    if parsed and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


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


def serialize_user(user_id):
    display = user_display(user_id)
    return {
        'id': display['id'] or string(user_id),
        'userID': string(user_id),
        'fullName': display['full_name'],
        'avatar': display['avatar'],
    }


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


def create_remind_event(chat_id, actor_id, content, remind_id, list_user_join_remind=''):
    chat = ManagedChat.objects.filter(id=chat_id).first()
    if chat:
        chat.updated_by = actor_id
        chat.message_type = MESSAGE_TYPE_EVENT
        chat.event_type = EVENT_TYPE_REMIND
        chat.save(update_fields=['updated_by', 'message_type', 'event_type', 'updated_date'])

    return ManagedChatMessage.objects.create(
        sender_id=actor_id,
        message_type=MESSAGE_TYPE_EVENT,
        content=content,
        chat_id=chat_id,
        event_id=remind_id,
        event_type=EVENT_TYPE_REMIND,
        list_user_join_remind=list_user_join_remind,
    )


def remind_due_content(remind):
    content = string(remind.remind_content) or string(remind.remind_name)
    if not content:
        return RUN_REMIND_TEXT
    return f'{RUN_REMIND_TEXT}: {content}'


def broadcast_remind_event(chat_id, actor_id, message, extra_user_ids=None):
    user_ids = chat_user_ids(chat_id, [actor_id, *(extra_user_ids or [])])
    payload = serialize_message(message)
    transaction.on_commit(
        lambda chat_id=chat_id, target_user_ids=user_ids, data=payload:
        broadcast_chat_message(chat_id, target_user_ids, data)
    )


def participant_payloads(remind_id, joined):
    user_ids = (
        ManagedChatRemindUser.objects
        .filter(chat_remind_id=remind_id, type=joined)
        .order_by('created_date', 'id')
        .values_list('user_id', flat=True)
    )
    return [serialize_user(user_id) for user_id in user_ids if user_id]


def user_join_type(remind_id, user_id):
    if not user_id:
        return None
    item = ManagedChatRemindUser.objects.filter(
        chat_remind_id=remind_id,
        user_id=user_id,
    ).first()
    if item is None:
        return None
    return bool(item.type)


def serialize_remind(remind, current_user_id=''):
    joined_users = participant_payloads(remind.id, True)
    declined_users = participant_payloads(remind.id, False)
    user_join = json.dumps(joined_users, ensure_ascii=False)
    user_not_join = json.dumps(declined_users, ensure_ascii=False)
    created_date = remind.created_date.isoformat() if remind.created_date else None
    modified_date = remind.modified_date.isoformat() if remind.modified_date else None
    remind_time = remind.remind_time.isoformat() if remind.remind_time else None
    current_join_type = user_join_type(remind.id, current_user_id)

    return {
        'id': remind.id,
        'remindName': remind.remind_name,
        'remindContent': remind.remind_content,
        'chatID': remind.chat_id,
        'remindTime': remind_time,
        'repeatType': remind.repeat_type,
        'createdDate': created_date,
        'createdBy': remind.created_by,
        'isDeleted': bool(remind.is_deleted),
        'modifiedDate': modified_date,
        'countJoin': len(joined_users),
        'countNotJoin': len(declined_users),
        'userJoin': user_join,
        'userNotJoin': user_not_join,
        'participants': user_join,
        'typeUserJoin': current_join_type,
    }


def remind_queryset(chat_id):
    return (
        ManagedChatRemind.objects
        .filter(chat_id=chat_id)
        .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        .order_by('-remind_time', '-created_date', 'id')
    )


def get_remind_detail(remind_id):
    return (
        ManagedChatRemind.objects
        .filter(id=remind_id)
        .filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        .first()
    )


def upsert_remind_user(remind, user_id, joined):
    now = timezone.now()
    existing = ManagedChatRemindUser.objects.filter(
        chat_remind_id=remind.id,
        user_id=user_id,
    ).first()

    if existing:
        existing.type = joined
        existing.modified_date = now
        existing.save(update_fields=['type', 'modified_date'])
        return existing

    return ManagedChatRemindUser.objects.create(
        id=new_id(),
        chat_id=remind.chat_id,
        chat_remind_id=remind.id,
        user_id=user_id,
        type=joined,
        created_date=now,
        created_by=user_id,
    )


def deactivate_active_jobs(remind_id):
    old_jobs = list(
        ManagedChatRemindJob.objects
        .filter(chat_remind_id=remind_id, status=JOB_STATUS_ACTIVE)
    )
    if not old_jobs:
        return

    ManagedChatRemindJob.objects.filter(
        chat_remind_id=remind_id,
        status=JOB_STATUS_ACTIVE,
    ).update(status=JOB_STATUS_CANCELED)

    for old_job in old_jobs:
        delete_periodic_task(old_job.job_id)


def delete_periodic_task(job_id):
    if not job_id:
        return

    try:
        from django_celery_beat.models import PeriodicTask
    except Exception:
        logger.exception('Cannot import django_celery_beat for chat remind job cleanup')
        return

    try:
        PeriodicTask.objects.filter(name=job_id).delete()
    except Exception:
        logger.exception('Cannot delete chat remind periodic task %s', job_id)


def schedule_remind_id(remind_id, is_change_job=False):
    remind = ManagedChatRemind.objects.filter(id=remind_id).first()
    if not remind:
        return
    remind_calculation(remind, is_change_job=is_change_job)


def remind_calculation(remind, is_change_job=False):
    try:
        if is_change_job:
            deactivate_active_jobs(remind.id)

        if not remind.remind_time:
            return

        job_id = create_periodic_task(remind)
        ManagedChatRemindJob.objects.create(
            id=new_id(),
            chat_remind_id=remind.id,
            job_id=job_id,
            time=remind.remind_time,
            status=JOB_STATUS_ACTIVE,
            type=remind.repeat_type if remind.repeat_type is not None else REPEAT_NOT_REPEAT,
        )
    except Exception:
        logger.exception('Cannot schedule chat remind %s', getattr(remind, 'id', ''))


def create_periodic_task(remind):
    repeat_type = remind.repeat_type if remind.repeat_type is not None else REPEAT_NOT_REPEAT
    if repeat_type == REPEAT_NOT_REPEAT:
        task_name = f'ChatRemindOnce_{remind.id}'
    else:
        task_name = f'ChatRemindRepeat_{remind.id}'

    try:
        from django_celery_beat.models import ClockedSchedule
        from django_celery_beat.models import CrontabSchedule
        from django_celery_beat.models import PeriodicTask
    except Exception:
        logger.exception('Cannot import django_celery_beat for chat remind scheduling')
        return task_name

    args = json.dumps([
        remind.id,
        remind.remind_time.isoformat() if remind.remind_time else None,
        remind.chat_id,
    ])
    PeriodicTask.objects.filter(name=task_name).delete()

    if repeat_type == REPEAT_NOT_REPEAT:
        clocked_time = remind.remind_time
        if clocked_time <= timezone.now():
            clocked_time = timezone.now() + timedelta(seconds=1)
        clocked, _ = ClockedSchedule.objects.get_or_create(clocked_time=clocked_time)
        PeriodicTask.objects.create(
            name=task_name,
            task=REMIND_TASK_NAME,
            clocked=clocked,
            one_off=True,
            args=args,
            enabled=True,
        )
        return task_name

    local_time = timezone.localtime(remind.remind_time)
    day_of_week = '*'
    day_of_month = '*'
    if repeat_type == REPEAT_WEEKLY:
        day_of_week = local_time.strftime('%w')
    elif repeat_type == REPEAT_MONTHLY:
        day_of_month = str(local_time.day)

    crontab, _ = CrontabSchedule.objects.get_or_create(
        minute=str(local_time.minute),
        hour=str(local_time.hour),
        day_of_week=day_of_week,
        day_of_month=day_of_month,
        month_of_year='*',
        timezone=getattr(settings, 'TIME_ZONE', 'Asia/Ho_Chi_Minh'),
    )
    PeriodicTask.objects.create(
        name=task_name,
        task=REMIND_TASK_NAME,
        crontab=crontab,
        args=args,
        enabled=True,
    )
    return task_name


def run_remind(chat_remind_id, remind_time=None, chat_id=None):
    remind = get_remind_detail(chat_remind_id)
    if not remind:
        return None

    target_chat_id = chat_id or remind.chat_id
    user_ids = list(
        ManagedChatRemindUser.objects
        .filter(chat_id=target_chat_id, chat_remind_id=remind.id, type=True)
        .values_list('user_id', flat=True)
    )
    user_ids = [user_id for user_id in user_ids if user_id]
    if not user_ids:
        return None

    joined_user_ids = ','.join(user_ids)
    with transaction.atomic():
        message = create_remind_event(
            target_chat_id,
            '',
            remind_due_content(remind),
            remind.id,
            list_user_join_remind=joined_user_ids,
        )
        if remind.repeat_type == REPEAT_NOT_REPEAT:
            ManagedChatRemindJob.objects.filter(
                chat_remind_id=remind.id,
                status=JOB_STATUS_ACTIVE,
            ).update(status=JOB_STATUS_FINISHED)
        broadcast_remind_event(target_chat_id, '', message, extra_user_ids=user_ids)
        notify_events(
            target_chat_id,
            '',
            message,
            event_kind='remind_due',
            user_ids=user_ids,
        )

    return message.id



