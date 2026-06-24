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
        return ResponseServer.success(message='ÄÄƒng xuáº¥t thÃ nh cÃ´ng')


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return ResponseServer.failure(message='Vui lÃ²ng nháº­p email')

        try:
            user = User.objects.get(email=email, is_deleted=False)
        except User.DoesNotExist:
            # Always return success to avoid email enumeration
            return ResponseServer.success(message='Náº¿u email tá»“n táº¡i, báº¡n sáº½ nháº­n Ä‘Æ°á»£c hÆ°á»›ng dáº«n Ä‘áº·t láº¡i máº­t kháº©u')

        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(user=user, token=token)

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}&email={email}"
        send_mail(
            subject='Äáº·t láº¡i máº­t kháº©u - Trung TÃ¢m Triá»ƒn LÃ£m',
            message=(
                f'Xin chÃ o {user.get_full_name()},\n\n'
                f'Nháº¥n vÃ o link sau Ä‘á»ƒ Ä‘áº·t láº¡i máº­t kháº©u (cÃ³ hiá»‡u lá»±c trong 1 giá»):\n\n'
                f'{reset_url}\n\n'
                f'Náº¿u báº¡n khÃ´ng yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u, vui lÃ²ng bá» qua email nÃ y.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return ResponseServer.success(message='HÆ°á»›ng dáº«n Ä‘áº·t láº¡i máº­t kháº©u Ä‘Ã£ Ä‘Æ°á»£c gá»­i Ä‘áº¿n email cá»§a báº¡n')


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        if not all([token_str, email, password]):
            return ResponseServer.failure(message='Thiáº¿u thÃ´ng tin cáº§n thiáº¿t')

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(
                token=token_str,
                user__email=email,
            )
        except PasswordResetToken.DoesNotExist:
            return ResponseServer.failure(message='Token khÃ´ng há»£p lá»‡')

        if not reset_token.is_valid():
            return ResponseServer.failure(message='Token Ä‘Ã£ háº¿t háº¡n hoáº·c Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng')

        user = reset_token.user
        user.set_password(password)
        user.save(update_fields=['password'])

        reset_token.is_used = True
        reset_token.save(update_fields=['is_used'])

        return ResponseServer.success(message='Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng')


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
        return ResponseServer.success(message='XÃ³a tÃ i khoáº£n thÃ nh cÃ´ng')

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
            return ResponseServer.failure(message='Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä‘Ãºng')

        if len(new_password) < 6:
            return ResponseServer.failure(message='Máº­t kháº©u má»›i pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±')

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return ResponseServer.success(message='Äá»•i máº­t kháº©u thÃ nh cÃ´ng')


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.filter(is_deleted=False)
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        return ResponseServer.success(message='XÃ³a vai trÃ² thÃ nh cÃ´ng')


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
    filterset_fields = ['role', 'department_id']


class PermissionMatrixView(APIView):
    """GET /api/auth/permissions/matrix/?roleID=&departmentID="""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_id = request.query_params.get('roleID', '').strip()
        department_id = request.query_params.get('departmentID', '').strip()

        if not role_id:
            return ResponseServer.failure(message='Thiáº¿u roleID')

        ACTION_CODES = ['view', 'add', 'edit', 'delete', 'verify', 'refuse', 'download', 'isPublic']

        granted = set(
            Permission.objects.filter(role_id=role_id, department_id=department_id)
            .values_list('function_id', 'action__code')
        )

        functions = Function.objects.filter(is_deleted=False).order_by('sort_order')
        result = []
        for func in functions:
            fid = str(func.id)
            row = {
                'functionID': fid,
                'functionParrentID': str(func.parent_id) if func.parent_id else None,
                'functionName': func.name,
            }
            for code in ACTION_CODES:
                row[code] = (func.id, code) in granted
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
        department_id = str(data.get('departmentID', '') or '').strip()
        function_id = str(data.get('functionID', '')).strip()
        action_code = str(data.get('action', '')).strip()

        if not all([role_id, function_id, action_code]):
            return ResponseServer.failure(message='Thieu thong tin phan quyen')

        try:
            role = Role.objects.get(id=role_id, is_deleted=False)
            function = Function.objects.get(id=function_id, is_deleted=False)
            action = Action.objects.get(code=action_code)
        except (Role.DoesNotExist, Function.DoesNotExist, Action.DoesNotExist):
            return ResponseServer.not_found(message='Khong tim thay du lieu phan quyen')

        perm, created = Permission.objects.get_or_create(
            role=role,
            department_id=department_id,
            function=function,
            action=action,
        )
        if not created:
            perm.delete()
            return ResponseServer.success(message='Da thu hoi quyen')
        return ResponseServer.success(message='Da cap quyen')


class PermissionCloneView(APIView):
    """POST /api/auth/permissions/clone/ or GET /api/Permissions/Clone"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return self._clone(request.query_params)

    def post(self, request):
        return self._clone(request.data)

    def _clone(self, data):
        old_role_id = str(data.get('oldRoleID', '')).strip()
        old_dept_id = str(data.get('oldDepartmentID', '') or '').strip()
        new_role_id = str(data.get('newRoleID', '')).strip()
        new_dept_id = str(data.get('newDepartmentID', '') or '').strip()

        if not old_role_id or not new_role_id:
            return ResponseServer.failure(message='Thieu roleID')

        if not Role.objects.filter(id=old_role_id, is_deleted=False).exists():
            return ResponseServer.not_found(message='Khong tim thay vai tro nguon')
        if not Role.objects.filter(id=new_role_id, is_deleted=False).exists():
            return ResponseServer.not_found(message='Khong tim thay vai tro dich')

        old_perms = list(Permission.objects.filter(role_id=old_role_id, department_id=old_dept_id))
        Permission.objects.filter(role_id=new_role_id, department_id=new_dept_id).delete()

        new_perms = [
            Permission(
                role_id=new_role_id,
                department_id=new_dept_id,
                function=p.function,
                action=p.action,
            )
            for p in old_perms
        ]
        Permission.objects.bulk_create(new_perms, ignore_conflicts=True)

        return ResponseServer.success(message='Sao chep quyen thanh cong')

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


