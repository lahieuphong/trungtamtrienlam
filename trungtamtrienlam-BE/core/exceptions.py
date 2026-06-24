from rest_framework.views import exception_handler
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'status': response.status_code,
            'message': _extract_message(response.data),
            'errors': response.data,
        }

    return response


def _extract_message(data):
    if isinstance(data, dict):
        return str(data.get('detail', 'Có lỗi xảy ra'))
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)
