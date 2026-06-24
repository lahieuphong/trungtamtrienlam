from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from apps.authentication.models import User
from apps.authentication.serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from core.response import ResponseServer


class AccountViewSet(viewsets.ModelViewSet):
    """Quản lý tài khoản người dùng (CRUD + phân quyền)."""
    queryset = User.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete(deleted_by=request.user.id)  # type: ignore[attr-defined]
        return ResponseServer.success(message='Xóa tài khoản thành công')

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        # TODO: implement reset password by admin
        return ResponseServer.success(message='Đặt lại mật khẩu thành công')

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save(update_fields=['is_active'])
        state = 'kích hoạt' if instance.is_active else 'vô hiệu hóa'
        return ResponseServer.success(message=f'Tài khoản đã được {state}')
