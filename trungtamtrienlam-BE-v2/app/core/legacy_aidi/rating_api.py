import json
import logging

from django.db import DatabaseError
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


logger = logging.getLogger(__name__)


def _string(value):
    if value is None:
        return ''
    return str(value).strip()


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


def _json_array_text(value):
    if value is None:
        return '[]'
    if isinstance(value, (list, tuple)):
        return json.dumps(list(value), ensure_ascii=False)

    text = _string(value)
    if not text:
        return '[]'

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return json.dumps(parsed, ensure_ascii=False)
    except (TypeError, ValueError):
        pass

    return text


def _empty_avatar_frame(user_id=''):
    return {
        'userID': _string(user_id),
        'UserID': _string(user_id),
        'fullName': '',
        'FullName': '',
        'personalFrames': '[]',
        'PersonalFrames': '[]',
        'departmentFrames': '[]',
        'DepartmentFrames': '[]',
    }


def _normalize_avatar_frame(row, user_id=''):
    frame = _empty_avatar_frame(user_id)
    if not row:
        return frame

    lower_row = {str(key).lower(): value for key, value in row.items()}
    frame.update({
        'userID': _string(lower_row.get('userid') or frame['userID']),
        'UserID': _string(lower_row.get('userid') or frame['UserID']),
        'fullName': _string(lower_row.get('fullname')),
        'FullName': _string(lower_row.get('fullname')),
        'personalFrames': _json_array_text(lower_row.get('personalframes')),
        'PersonalFrames': _json_array_text(lower_row.get('personalframes')),
        'departmentFrames': _json_array_text(lower_row.get('departmentframes')),
        'DepartmentFrames': _json_array_text(lower_row.get('departmentframes')),
    })
    return frame


def _fetch_avatar_frame(user_id):
    if not _string(user_id):
        return _empty_avatar_frame()

    try:
        with connection.cursor() as cursor:
            cursor.execute('EXEC SP_GetAwardFramesForUser %s', [user_id])
            if not cursor.description:
                return _empty_avatar_frame(user_id)

            columns = [column[0] for column in cursor.description]
            row = cursor.fetchone()
            if not row:
                return _empty_avatar_frame(user_id)

            return _normalize_avatar_frame(dict(zip(columns, row)), user_id)
    except DatabaseError as exc:
        logger.info('Avatar frame stored procedure is unavailable: %s', exc)
        return _empty_avatar_frame(user_id)


class RatingsGetAvatarFrameApi(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        user_id = _string(
            request.query_params.get('userId')
            or request.query_params.get('userID')
            or request.query_params.get('UserID')
        )
        return _success({
            'avatarFrame': _fetch_avatar_frame(user_id),
        })
