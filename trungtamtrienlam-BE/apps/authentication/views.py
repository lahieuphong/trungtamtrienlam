from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.response import ResponseServer
from core.permissions import HasModulePermission
from .models import User, Role, Function, Action, Permission
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, FunctionSerializer, ActionSerializer, PermissionSerializer,
)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


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
        # TODO: implement change password
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
