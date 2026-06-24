import secrets
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.mail import send_mail
from django.conf import settings
from core.response import ResponseServer
from core.permissions import HasModulePermission
from .models import User, Role, Function, Action, Permission, PasswordResetToken
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, FunctionSerializer, ActionSerializer, PermissionSerializer,
)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except TokenError:
            pass
        return ResponseServer.success(message='Đăng xuất thành công')


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return ResponseServer.failure(message='Vui lòng nhập email')

        try:
            user = User.objects.get(email=email, is_deleted=False)
        except User.DoesNotExist:
            # Always return success to avoid email enumeration
            return ResponseServer.success(message='Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu')

        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(user=user, token=token)

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}&email={email}"
        send_mail(
            subject='Đặt lại mật khẩu - Trung Tâm Triển Lãm',
            message=(
                f'Xin chào {user.get_full_name()},\n\n'
                f'Nhấn vào link sau để đặt lại mật khẩu (có hiệu lực trong 1 giờ):\n\n'
                f'{reset_url}\n\n'
                f'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return ResponseServer.success(message='Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn')


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        if not all([token_str, email, password]):
            return ResponseServer.failure(message='Thiếu thông tin cần thiết')

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(
                token=token_str,
                user__email=email,
            )
        except PasswordResetToken.DoesNotExist:
            return ResponseServer.failure(message='Token không hợp lệ')

        if not reset_token.is_valid():
            return ResponseServer.failure(message='Token đã hết hạn hoặc đã được sử dụng')

        user = reset_token.user
        user.set_password(password)
        user.save(update_fields=['password'])

        reset_token.is_used = True
        reset_token.save(update_fields=['is_used'])

        return ResponseServer.success(message='Đặt lại mật khẩu thành công')


class UserViewSet(viewsets.ModelViewSet):
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

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = UserSerializer(request.user)
        return ResponseServer.success(data=serializer.data)

    @action(detail=False, methods=['get'], url_path='dropdown')
    def dropdown(self, request):
        users = self.get_queryset().values('id', 'username', 'first_name', 'last_name', 'avatar', 'department_id')
        return ResponseServer.success(data=list(users))

    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        user = self.get_object()
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not user.check_password(old_password):
            return ResponseServer.failure(message='Mật khẩu hiện tại không đúng')

        if len(new_password) < 6:
            return ResponseServer.failure(message='Mật khẩu mới phải có ít nhất 6 ký tự')

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return ResponseServer.success(message='Đổi mật khẩu thành công')


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.filter(is_deleted=False)
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        return ResponseServer.success(message='Xóa vai trò thành công')


class FunctionViewSet(viewsets.ModelViewSet):
    queryset = Function.objects.filter(is_deleted=False).order_by('sort_order')
    serializer_class = FunctionSerializer
    permission_classes = [IsAuthenticated]


class ActionViewSet(viewsets.ModelViewSet):
    queryset = Action.objects.all()
    serializer_class = ActionSerializer
    permission_classes = [IsAuthenticated]


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.select_related('role', 'function', 'action')
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role']

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        # TODO: implement bulk permission update by role
        return ResponseServer.success(message='Cập nhật quyền thành công')


class UserMenuPermissionsView(APIView):
    """Returns the menu function tree for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_superuser:
            functions = Function.objects.filter(is_deleted=False).order_by('sort_order')
        else:
            role_ids = list(
                user.user_roles.values_list('role_id', flat=True)
            )
            func_ids = list(
                Permission.objects.filter(role_id__in=role_ids)
                .values_list('function_id', flat=True)
                .distinct()
            )
            functions = Function.objects.filter(
                id__in=func_ids, is_deleted=False
            ).order_by('sort_order')

        result = [
            {
                'uniqueKey': func.icon or '',
                'functionID': str(func.id),
                'parrentID': str(func.parent_id) if func.parent_id else None,
                'functionName': func.name,
                'path': func.url or '',
                'actionNames': 'View',
            }
            for func in functions
        ]

        return ResponseServer.success(data=result)
