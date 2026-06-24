import json
import os
import uuid
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from core.response import ResponseServer
from apps.authentication.models import User, Role
from apps.departments.models import Department
from .models import Province, District, Organization, StaffFile, UserConcurrently
from .serializers import StaffListSerializer, StaffDetailSerializer, UserConcurrentlySerializer

TYPE_FILE_AVATAR = 1
TYPE_FILE_SIGN = 2
TYPE_FILE_STAMP = 3

ALLOWED_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}


def _save_staff_file(uploaded_file, user_id, type_file, subfolder):
    """Lưu file vào media, trả về StaffFile instance chưa save."""
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    filename = f'{uuid.uuid4()}{ext}'
    rel_path = f'staff/{subfolder}/{user_id}/{filename}'
    full_path = os.path.join(settings.MEDIA_ROOT, 'staff', subfolder, user_id, filename)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'wb+') as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)
    return StaffFile(
        id=uuid.uuid4(),
        user_id=user_id,
        file=rel_path,
        file_name=uploaded_file.name,
        size=round(uploaded_file.size / (1024 * 1024), 4),
        extension=ext.lstrip('.'),
        type_file=type_file,
    )


class StaffListView(APIView):
    """GET /api/accounts/staff/getlist/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = max(int(request.query_params.get('pageSize', 15)), 1)
        keyword = request.query_params.get('keyword', '').strip()

        qs = User.objects.filter(is_deleted=False)
        if keyword:
            qs = qs.filter(
                username__icontains=keyword
            ) | User.objects.filter(
                is_deleted=False,
                first_name__icontains=keyword
            ) | User.objects.filter(
                is_deleted=False,
                last_name__icontains=keyword
            ) | User.objects.filter(
                is_deleted=False,
                email__icontains=keyword
            )
            qs = qs.distinct()

        total = qs.count()
        start = (page - 1) * page_size
        staffs = qs.order_by('-date_joined')[start: start + page_size]
        data = StaffListSerializer(staffs, many=True).data

        return ResponseServer.success(data={'staffs': data, 'total': total})


class StaffDetailView(APIView):
    """GET /api/accounts/staff/getdetail/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff_id = request.query_params.get('id', '').strip()
        is_info = request.query_params.get('isInfo', 'false').lower() == 'true'

        if is_info:
            staff_id = str(request.user.id)

        if not staff_id:
            return ResponseServer.failure(message='Thiếu ID tài khoản')

        try:
            user = User.objects.get(id=staff_id, is_deleted=False)
        except User.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        staff_data = StaffDetailSerializer(user).data

        uc_qs = UserConcurrently.objects.filter(user_id=str(user.id), is_deleted=False)
        user_concurrentlies = UserConcurrentlySerializer(uc_qs, many=True).data

        # roleInfo: check if any role is director/admin
        is_director = False
        is_admin = False
        for uc in uc_qs:
            if uc.role_id:
                role = Role.objects.filter(id=uc.role_id).first()
                if role:
                    if role.is_director:
                        is_director = True
                    if role.is_admin:
                        is_admin = True

        role_info = {'IsDirector': is_director, 'IsAdmin': is_admin}

        return ResponseServer.success(data={
            'staff': staff_data,
            'userConcurrentlies': user_concurrentlies,
            'roleInfo': role_info,
        })


class StaffCreateView(APIView):
    """POST /api/accounts/staff/create/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        data = request.data
        files = request.FILES

        username = data.get('UserName', '').strip()
        password = data.get('Password', '').strip()
        first_name = data.get('FirstName', '').strip()
        last_name = data.get('LastName', '').strip()
        email = data.get('Email', '').strip()
        phone = data.get('PhoneNumber', '').strip()
        province_id = data.get('ProvinceID', '').strip()
        district_id = data.get('DistrictID', '').strip()
        address = data.get('Address', '').strip()
        status = data.get('Status', '1')
        positions_str = data.get('Positions', '')

        # Validate
        if not username:
            return ResponseServer.failure(message='Vui lòng nhập tài khoản')
        if len(username) < 6:
            return ResponseServer.failure(message='Tài khoản phải có ít nhất 6 ký tự')
        if User.objects.filter(username=username, is_deleted=False).exists():
            return ResponseServer.failure(message='Tài khoản đã tồn tại')
        if not password:
            return ResponseServer.failure(message='Vui lòng nhập mật khẩu')
        if len(password) < 6:
            return ResponseServer.failure(message='Mật khẩu phải có ít nhất 6 ký tự')
        if not first_name:
            return ResponseServer.failure(message='Vui lòng nhập họ')
        if not last_name:
            return ResponseServer.failure(message='Vui lòng nhập tên')
        if not email:
            return ResponseServer.failure(message='Vui lòng nhập email')
        if not phone:
            return ResponseServer.failure(message='Vui lòng nhập số điện thoại')
        if not address:
            return ResponseServer.failure(message='Vui lòng nhập địa chỉ')
        if not positions_str:
            return ResponseServer.failure(message='Vui lòng chọn chức vụ')

        try:
            positions = json.loads(positions_str)
        except Exception:
            return ResponseServer.failure(message='Dữ liệu chức vụ không hợp lệ')

        if not positions:
            return ResponseServer.failure(message='Vui lòng chọn chức vụ')

        # Check director role
        check_is_director = False
        for pos in positions:
            role_id = pos.get('roleID', '')
            if role_id:
                role = Role.objects.filter(id=role_id).first()
                if role and role.is_director:
                    check_is_director = True

        # Validate avatar
        avatar_file = files.get('avatar')
        if not avatar_file:
            return ResponseServer.failure(message='Vui lòng chọn hình đại diện')
        ext = os.path.splitext(avatar_file.name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTS:
            return ResponseServer.failure(message='Định dạng ảnh không hợp lệ')

        # Director needs sign and stamp
        if check_is_director:
            if not files.get('sign'):
                return ResponseServer.failure(message='Vui lòng upload chữ ký')
            if not files.get('stamp'):
                return ResponseServer.failure(message='Vui lòng upload chữ ký có con dấu')

        with transaction.atomic():
            user = User(
                username=username,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                province_id=uuid.UUID(province_id) if province_id else None,
                district_id=uuid.UUID(district_id) if district_id else None,
                address=address,
                is_active=str(status) == '1',
            )
            user.set_password(password)
            user.save()

            user_id = str(user.id)
            staff_files = []

            # Avatar
            sf_avatar = _save_staff_file(avatar_file, user_id, TYPE_FILE_AVATAR, 'avatar')
            sf_avatar.created_by = str(request.user.id)
            staff_files.append(sf_avatar)

            # Sign and Stamp for director
            if check_is_director:
                sign_file = files.get('sign')
                if sign_file:
                    sf_sign = _save_staff_file(sign_file, user_id, TYPE_FILE_SIGN, 'sign')
                    sf_sign.created_by = str(request.user.id)
                    staff_files.append(sf_sign)

                stamp_file = files.get('stamp')
                if stamp_file:
                    sf_stamp = _save_staff_file(stamp_file, user_id, TYPE_FILE_STAMP, 'stamp')
                    sf_stamp.created_by = str(request.user.id)
                    staff_files.append(sf_stamp)

            StaffFile.objects.bulk_create(staff_files)

            # UserConcurrentlies
            uc_list = []
            for pos in positions:
                uc_list.append(UserConcurrently(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    role_id=pos.get('roleID', '') or None,
                    department_id=pos.get('departmentID', '') or None,
                    organization_id=pos.get('organizationID', '') or None,
                ))
            UserConcurrently.objects.bulk_create(uc_list)

        return ResponseServer.success(message='Tạo tài khoản thành công')


class StaffUpdateView(APIView):
    """PUT /api/accounts/staff/update/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request):
        data = request.data
        files = request.FILES
        staff_id = data.get('id', '').strip()

        if not staff_id:
            return ResponseServer.failure(message='Thiếu ID tài khoản')

        try:
            user = User.objects.get(id=staff_id, is_deleted=False)
        except User.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        first_name = data.get('FirstName', '').strip()
        last_name = data.get('LastName', '').strip()
        email = data.get('Email', '').strip()
        phone = data.get('PhoneNumber', '').strip()
        province_id = data.get('ProvinceID', '').strip()
        district_id = data.get('DistrictID', '').strip()
        address = data.get('Address', '').strip()
        status = data.get('Status', '1')
        password = data.get('Password', '').strip()
        positions_str = data.get('Positions', '')

        if not first_name:
            return ResponseServer.failure(message='Vui lòng nhập họ')
        if not last_name:
            return ResponseServer.failure(message='Vui lòng nhập tên')
        if not email:
            return ResponseServer.failure(message='Vui lòng nhập email')
        if not phone:
            return ResponseServer.failure(message='Vui lòng nhập số điện thoại')
        if not address:
            return ResponseServer.failure(message='Vui lòng nhập địa chỉ')
        if not positions_str:
            return ResponseServer.failure(message='Vui lòng chọn chức vụ')

        try:
            positions = json.loads(positions_str)
        except Exception:
            return ResponseServer.failure(message='Dữ liệu chức vụ không hợp lệ')

        if not positions:
            return ResponseServer.failure(message='Vui lòng chọn chức vụ')

        check_is_director = False
        for pos in positions:
            role_id = pos.get('roleID', '')
            if role_id:
                role = Role.objects.filter(id=role_id).first()
                if role and role.is_director:
                    check_is_director = True

        with transaction.atomic():
            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.phone = phone
            user.province_id = uuid.UUID(province_id) if province_id else None
            user.district_id = uuid.UUID(district_id) if district_id else None
            user.address = address
            user.is_active = str(status) == '1'
            if password and len(password) >= 6:
                user.set_password(password)
            user.save()

            user_id = str(user.id)
            staff_files_to_create = []
            type_files_to_delete = []

            # Avatar
            avatar_file = files.get('avatar')
            if avatar_file:
                ext = os.path.splitext(avatar_file.name)[1].lower()
                if ext not in ALLOWED_IMAGE_EXTS:
                    return ResponseServer.failure(message='Định dạng ảnh không hợp lệ')
                type_files_to_delete.append(TYPE_FILE_AVATAR)
                sf = _save_staff_file(avatar_file, user_id, TYPE_FILE_AVATAR, 'avatar')
                sf.created_by = str(request.user.id)
                staff_files_to_create.append(sf)

            # Sign / Stamp for director
            if check_is_director:
                sign_file = files.get('sign')
                if sign_file:
                    type_files_to_delete.append(TYPE_FILE_SIGN)
                    sf = _save_staff_file(sign_file, user_id, TYPE_FILE_SIGN, 'sign')
                    sf.created_by = str(request.user.id)
                    staff_files_to_create.append(sf)

                stamp_file = files.get('stamp')
                if stamp_file:
                    type_files_to_delete.append(TYPE_FILE_STAMP)
                    sf = _save_staff_file(stamp_file, user_id, TYPE_FILE_STAMP, 'stamp')
                    sf.created_by = str(request.user.id)
                    staff_files_to_create.append(sf)

            if type_files_to_delete:
                StaffFile.objects.filter(user_id=user_id, type_file__in=type_files_to_delete).update(is_deleted=True)

            if staff_files_to_create:
                StaffFile.objects.bulk_create(staff_files_to_create)

            # Update UserConcurrentlies
            UserConcurrently.objects.filter(user_id=user_id).update(is_deleted=True)
            uc_list = []
            for pos in positions:
                uc_list.append(UserConcurrently(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    role_id=pos.get('roleID', '') or None,
                    department_id=pos.get('departmentID', '') or None,
                    organization_id=pos.get('organizationID', '') or None,
                ))
            UserConcurrently.objects.bulk_create(uc_list)

        return ResponseServer.success(message='Cập nhật tài khoản thành công')


class StaffDeleteView(APIView):
    """DELETE /api/accounts/staff/delete/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        staff_id = request.query_params.get('id', '').strip()
        if not staff_id:
            return ResponseServer.failure(message='Thiếu ID tài khoản')

        try:
            user = User.objects.get(id=staff_id, is_deleted=False)
        except User.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        user.is_deleted = True
        user.is_active = False
        user.save(update_fields=['is_deleted', 'is_active'])
        return ResponseServer.success(message='Xóa tài khoản thành công')


class StaffForgotPasswordView(APIView):
    """GET /api/accounts/staff/forgot-password/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff_id = request.query_params.get('id', '').strip()
        if not staff_id:
            return ResponseServer.failure(message='Thiếu ID tài khoản')

        try:
            user = User.objects.get(id=staff_id, is_deleted=False)
        except User.DoesNotExist:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        import secrets
        from apps.authentication.models import PasswordResetToken
        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(user=user, token=token)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_url = f'{frontend_url}/reset-password?token={token}&email={user.email}'

        try:
            send_mail(
                subject='Đặt lại mật khẩu - Trung Tâm Triển Lãm',
                message=(
                    f'Xin chào {user.get_full_name()},\n\n'
                    f'Admin đã gửi cho bạn đường dẫn đặt lại mật khẩu (có hiệu lực trong 1 giờ):\n\n'
                    f'{reset_url}\n\n'
                    f'Nếu bạn không yêu cầu, vui lòng bỏ qua email này.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return ResponseServer.success(message='Đã gửi đường dẫn đặt lại mật khẩu đến email người dùng')


# ─── Dropdown Views ───────────────────────────────────────────────────────────

class DropdownRolesView(APIView):
    """GET /api/accounts/dropdown/roles/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.filter(is_deleted=False).values('id', 'name', 'is_director', 'is_admin')
        data = [
            {
                'id': str(r['id']),
                'name': r['name'],
                'isDirector': r['is_director'],
                'isAdmin': r['is_admin'],
            }
            for r in roles
        ]
        return ResponseServer.success(data={'roles': data})


class DropdownDepartmentsView(APIView):
    """GET /api/accounts/dropdown/departments/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        depts = Department.objects.filter(is_deleted=False).values('id', 'name', 'code')
        data = [{'id': str(d['id']), 'name': d['name'], 'code': d['code']} for d in depts]
        return ResponseServer.success(data={'departments': data})


class DropdownOrganizationsView(APIView):
    """GET /api/accounts/dropdown/organizations/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orgs = Organization.objects.filter(is_deleted=False).values('id', 'name')
        data = [{'id': str(o['id']), 'name': o['name']} for o in orgs]
        return ResponseServer.success(data={'organizations': data})


class DropdownProvincesView(APIView):
    """GET /api/accounts/dropdown/provinces/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        provinces = Province.objects.filter(is_deleted=False).values('id', 'name')
        data = [{'id': str(p['id']), 'name': p['name']} for p in provinces]
        return ResponseServer.success(data={'provinces': data})


class DropdownDistrictsView(APIView):
    """GET /api/accounts/dropdown/districts/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        province_id = request.query_params.get('provinceId', '').strip()
        qs = District.objects.filter(is_deleted=False)
        if province_id:
            qs = qs.filter(province_id=province_id)
        data = [{'id': str(d['id']), 'name': d['name']} for d in qs.values('id', 'name')]
        return ResponseServer.success(data={'districts': data})
