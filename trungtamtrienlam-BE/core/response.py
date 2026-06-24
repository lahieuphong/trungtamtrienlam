from rest_framework.response import Response
from rest_framework import status


class ResponseServer:
    @staticmethod
    def success(data=None, message='Thành công', status_code=status.HTTP_200_OK):
        return Response({
            'status': 200,
            'message': message,
            'data': data,
        }, status=status_code)

    @staticmethod
    def created(data=None, message='Tạo mới thành công'):
        return Response({
            'status': 201,
            'message': message,
            'data': data,
        }, status=status.HTTP_201_CREATED)

    @staticmethod
    def failure(message='Có lỗi xảy ra', errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        return Response({
            'status': status_code,
            'message': message,
            'errors': errors,
        }, status=status_code)

    @staticmethod
    def not_found(message='Không tìm thấy dữ liệu'):
        return Response({
            'status': 404,
            'message': message,
        }, status=status.HTTP_404_NOT_FOUND)

    @staticmethod
    def unauthorized(message='Không có quyền truy cập'):
        return Response({
            'status': 401,
            'message': message,
        }, status=status.HTTP_401_UNAUTHORIZED)

    @staticmethod
    def forbidden(message='Bị cấm truy cập'):
        return Response({
            'status': 403,
            'message': message,
        }, status=status.HTTP_403_FORBIDDEN)
