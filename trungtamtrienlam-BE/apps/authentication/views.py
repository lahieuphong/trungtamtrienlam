import secrets
import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from core.response import ResponseServer
from core.permissions import HasModulePermission
from apps.departments.models import Department
from .models import User, Role, Function, Action, FunctionAction, Permission, PasswordResetToken
from .permission_matrix import ACTION_CODES, get_allowed_actions_for_function, is_action_allowed_for_function
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, FunctionSerializer, ActionSerializer, FunctionActionSerializer, PermissionSerializer,
)



def is_uuid(value):
    if not value:
        return False
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def role_uses_global_permission_scope(role):
    return bool(role.is_admin or role.is_director or role.is_vice_director)


def get_permission_department_scope(role, raw_department_id):
    if role_uses_global_permission_scope(role):
        return None, ''

    department_id = str(raw_department_id or '').strip()
    if not department_id:
        return None, 'Vui lòng chọn phòng ban'
    if not is_uuid(department_id):
        return None, 'Phòng ban không hợp lệ'
    if not Department.objects.filter(id=department_id, is_deleted=False).exists():
        return None, 'Phòng ban không tồn tại'
    return department_id, ''


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


class FunctionActionViewSet(viewsets.ModelViewSet):
    queryset = FunctionAction.objects.select_related('function', 'action')
    serializer_class = FunctionActionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['function', 'action']

class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.select_related('role', 'department', 'function', 'action')
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'department']


class PermissionMatrixView(APIView):
    """GET /api/auth/permissions/matrix/?roleID=&departmentID="""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_id = request.query_params.get('roleID', '').strip()
        raw_department_id = request.query_params.get('departmentID', '').strip()

        if not role_id:
            return ResponseServer.failure(message='Thiếu roleID')

        try:
            role = Role.objects.get(id=role_id, is_deleted=False)
        except Role.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy vai trò')

        department_id, scope_error = get_permission_department_scope(role, raw_department_id)
        if scope_error:
            return ResponseServer.failure(message=scope_error)

        granted = set(
            Permission.objects.filter(role=role, department_id=department_id)
            .values_list('function_id', 'action__code')
        )

        functions = (
            Function.objects.filter(is_deleted=False)
            .prefetch_related('function_actions__action')
            .order_by('sort_order')
        )
        result = []
        for func in functions:
            fid = str(func.id)
            row = {
                'functionID': fid,
                'functionParrentID': str(func.parent_id) if func.parent_id else None,
                'functionName': func.name,
            }
            allowed_actions = set(get_allowed_actions_for_function(func))
            for code in ACTION_CODES:
                row[code] = (func.id, code) in granted if code in allowed_actions else None
            result.append(row)

        return ResponseServer.success(data={'permissions': result})

class PermissionToggleView(APIView):
    """POST /api/auth/permissions/toggle/ or GET /api/Permissions/update"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return self._toggle(request.query_params)

    def post(self, request):
        return self._toggle(request.data)

    def _toggle(self, data):
        role_id = str(data.get('roleID', '')).strip()
        raw_department_id = str(data.get('departmentID', '') or '').strip()
        function_id = str(data.get('functionID', '')).strip()
        action_code = str(data.get('action', '')).strip()

        if not all([role_id, function_id, action_code]):
            return ResponseServer.failure(message='Thiếu thông tin phân quyền')

        try:
            role = Role.objects.get(id=role_id, is_deleted=False)
            function = Function.objects.get(id=function_id, is_deleted=False)
            action = Action.objects.get(code=action_code)
        except (Role.DoesNotExist, Function.DoesNotExist, Action.DoesNotExist):
            return ResponseServer.not_found(message='Không tìm thấy dữ liệu phân quyền')

        department_id, scope_error = get_permission_department_scope(role, raw_department_id)
        if scope_error:
            return ResponseServer.failure(message=scope_error)

        if not is_action_allowed_for_function(function, action_code):
            return ResponseServer.failure(message='Quyền này không áp dụng cho chức năng đã chọn')

        perm, created = Permission.objects.get_or_create(
            role=role,
            department_id=department_id,
            function=function,
            action=action,
        )
        if not created:
            perm.delete()
            return ResponseServer.success(message='Đã thu hồi quyền')
        return ResponseServer.success(message='Đã cấp quyền')

class PermissionCloneView(APIView):
    """POST /api/auth/permissions/clone/ or GET /api/Permissions/Clone"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return self._clone(request.query_params)

    def post(self, request):
        return self._clone(request.data)

    def _clone(self, data):
        old_role_id = str(data.get('oldRoleID', '')).strip()
        old_raw_dept_id = str(data.get('oldDepartmentID', '') or '').strip()
        new_role_id = str(data.get('newRoleID', '')).strip()
        new_raw_dept_id = str(data.get('newDepartmentID', '') or '').strip()

        if not old_role_id or not new_role_id:
            return ResponseServer.failure(message='Thiếu roleID')

        try:
            old_role = Role.objects.get(id=old_role_id, is_deleted=False)
        except Role.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy vai trò nguồn')
        try:
            new_role = Role.objects.get(id=new_role_id, is_deleted=False)
        except Role.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy vai trò đích')

        old_dept_id, old_scope_error = get_permission_department_scope(old_role, old_raw_dept_id)
        if old_scope_error:
            return ResponseServer.failure(message=f'Nguồn: {old_scope_error}')
        new_dept_id, new_scope_error = get_permission_department_scope(new_role, new_raw_dept_id)
        if new_scope_error:
            return ResponseServer.failure(message=f'Đích: {new_scope_error}')

        old_perms = list(
            Permission.objects.select_related('function', 'action')
            .filter(role=old_role, department_id=old_dept_id)
        )
        Permission.objects.filter(role=new_role, department_id=new_dept_id).delete()

        new_perms = [
            Permission(
                role=new_role,
                department_id=new_dept_id,
                function=p.function,
                action=p.action,
            )
            for p in old_perms
            if is_action_allowed_for_function(p.function, p.action.code)
        ]
        Permission.objects.bulk_create(new_perms, ignore_conflicts=True)

        return ResponseServer.success(message='Sao chép quyền thành công')

class UserMenuPermissionsView(APIView):
    """Returns the menu function tree for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_superuser:
            functions = Function.objects.filter(is_deleted=False).order_by('sort_order')
        else:
            role_ids = set(user.user_roles.values_list('role_id', flat=True))
            scoped_permission_q = Q(pk__isnull=True)
            has_scoped_permissions = False

            try:
                from apps.accounts.models import UserConcurrently
                assignments = UserConcurrently.objects.filter(
                    user=user,
                    is_deleted=False,
                    role_id__isnull=False,
                ).values_list('role_id', 'department_id')
                for role_id, department_id in assignments:
                    role_ids.add(role_id)
                    if department_id:
                        scoped_permission_q |= Q(role_id=role_id, department_id=department_id)
                        has_scoped_permissions = True
            except Exception:
                pass

            role_ids.discard(None)
            if not role_ids:
                functions = Function.objects.none()
            else:
                permission_q = Q(role_id__in=list(role_ids), department__isnull=True)
                if has_scoped_permissions:
                    permission_q |= scoped_permission_q

                func_ids = list(
                    Permission.objects.filter(permission_q)
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
