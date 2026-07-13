"""Chat note APIs."""

from django.db import DatabaseError
from django.db import transaction
from django.utils import timezone
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.chat_notes.models import ManagedChatNote
from core.chat_notes.services import CREATE_NOTE_TEMPLATE
from core.chat_notes.services import DELETE_NOTE_TEMPLATE
from core.chat_notes.services import UPDATE_NOTE_TEMPLATE
from core.chat_notes.services import actor_from_request
from core.chat_notes.services import bool_value
from core.chat_notes.services import broadcast_note_event
from core.chat_notes.services import create_note_event
from core.chat_notes.services import data_value
from core.chat_notes.services import get_note_detail
from core.chat_notes.services import new_id
from core.chat_notes.services import note_queryset
from core.chat_notes.services import request_data
from core.chat_notes.services import serialize_note
from core.chat_notes.services import string
from core.notifications.notify_events import notify_events


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


def _note_payload(data):
    return {
        'id': string(data_value(data, 'ID', 'id', 'noteID', 'noteId')),
        'chat_id': string(data_value(data, 'ChatID', 'chatID', 'chatId')),
        'note': string(data_value(data, 'Note', 'note')),
        'is_pinned': bool_value(data_value(data, 'IsPinned', 'isPinned', 'IsPin', 'isPin')),
    }


class ChatNoteListApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        chat_id = string(request.query_params.get('chatID') or request.query_params.get('chatId'))
        if not chat_id:
            return _failure('Thi\u1ebfu chatID')

        notes = [serialize_note(note) for note in note_queryset(chat_id)]
        return _success(notes)


class ChatNoteDetailApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        note_id = string(
            request.query_params.get('noteID')
            or request.query_params.get('noteId')
            or request.query_params.get('ID')
            or request.query_params.get('id')
        )
        if not note_id:
            return _failure('Thi\u1ebfu noteID')

        note = get_note_detail(note_id)
        if not note:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y ghi ch\u00fa', status=404)

        return _success(serialize_note(note))


class ChatNoteCreateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = request_data(request)
        actor = actor_from_request(request)
        payload = _note_payload(data)

        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')
        if not payload['chat_id']:
            return _failure('Thi\u1ebfu ChatID')
        if not payload['note']:
            return _failure('Thi\u1ebfu Note')

        note_id = new_id()
        now = timezone.now()
        try:
            with transaction.atomic():
                note = ManagedChatNote.objects.create(
                    id=note_id,
                    chat_id=payload['chat_id'],
                    note=payload['note'],
                    created_date=now,
                    created_by=actor['id'],
                    is_deleted=False,
                    is_pinned=payload['is_pinned'],
                )
                message = create_note_event(
                    note.chat_id,
                    actor['id'],
                    CREATE_NOTE_TEMPLATE.format(name=actor['name']),
                    note.id,
                )
                broadcast_note_event(note.chat_id, actor['id'], message)
                notify_events(note.chat_id, actor['id'], message, event_kind='note')
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(note_id)


class ChatNoteUpdateApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = request_data(request)
        actor = actor_from_request(request)
        payload = _note_payload(data)
        note_id = payload['id']

        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')
        if not note_id:
            return _failure('Thi\u1ebfu ID')

        note = get_note_detail(note_id)
        if not note:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y ghi ch\u00fa', status=404)
        if string(note.created_by) != actor['id']:
            return _failure(FAILURE_MESSAGE)

        try:
            with transaction.atomic():
                note.note = payload['note']
                note.created_date = timezone.now()
                note.save(update_fields=['note', 'created_date'])

                message = create_note_event(
                    note.chat_id,
                    actor['id'],
                    UPDATE_NOTE_TEMPLATE.format(name=actor['name']),
                    note.id,
                )
                broadcast_note_event(note.chat_id, actor['id'], message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(note.id)


class ChatNoteDeleteApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = request_data(request)
        note_id = string(
            data.get('noteID')
            or data.get('noteId')
            or data.get('ID')
            or data.get('id')
            or request.query_params.get('noteID')
            or request.query_params.get('noteId')
        )
        actor = actor_from_request(request)

        if not actor.get('id'):
            return _failure('Thi\u1ebfu userID')
        if not note_id:
            return _failure('Thi\u1ebfu noteID')

        note = get_note_detail(note_id)
        if not note:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y ghi ch\u00fa', status=404)

        try:
            with transaction.atomic():
                note.is_deleted = True
                note.pin_date = None
                note.save(update_fields=['is_deleted', 'pin_date'])

                message = create_note_event(
                    note.chat_id,
                    actor['id'],
                    DELETE_NOTE_TEMPLATE.format(name=actor['name']),
                    note.id,
                )
                broadcast_note_event(note.chat_id, actor['id'], message)
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)


class ChatNotePinOrUnpinApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        data = request_data(request)
        note_id = string(
            data.get('noteID')
            or data.get('noteId')
            or data.get('ID')
            or data.get('id')
            or request.query_params.get('noteID')
            or request.query_params.get('noteId')
        )
        is_pin = bool_value(
            data.get('isPin')
            if 'isPin' in data else data.get('IsPin')
            if 'IsPin' in data else data.get('isPinned')
            if 'isPinned' in data else data.get('IsPinned')
            if 'IsPinned' in data else request.query_params.get('isPin')
            or request.query_params.get('IsPin')
            or request.query_params.get('isPinned')
            or request.query_params.get('IsPinned')
        )

        if not note_id:
            return _failure('Thi\u1ebfu noteID')

        note = get_note_detail(note_id)
        if not note:
            return _failure('Kh\u00f4ng t\u00ecm th\u1ea5y ghi ch\u00fa', status=404)

        note.is_pinned = is_pin
        note.pin_date = timezone.now() if is_pin else None
        try:
            note.save(update_fields=['is_pinned', 'pin_date'])
        except DatabaseError as exc:
            return _failure(str(exc))

        return _success(None)

