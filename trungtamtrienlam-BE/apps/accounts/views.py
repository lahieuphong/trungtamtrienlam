import json
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Prefetch
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from core.response import ResponseServer
from core.search import search_score
from apps.authentication.models import Role, User
from apps.departments.models import Department, Staff
from .models import District, Organization, Province, StaffFile, UserConcurrently, Ward
from .serializers import StaffListSerializer, StaffDetailSerializer, UserConcurrentlySerializer
from .services import (
    TYPE_FILE_AVATAR,
    TYPE_FILE_SIGN,
    TYPE_FILE_STAMP,
    active_location_or_failure,
    clean_staff_files_for_type,
    ensure_staff_for_user,
    ensure_staff_profiles_for_users,
    get_staff_by_identifier,
    is_truthy_status,
    role_flags_for_user,
    save_staff_file,
    sync_user_assignments,
    validate_image,
    validate_positions,
)


class StaffListView(APIView):
    """GET /api/accounts/staff/getlist/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = max(int(request.query_params.get('pageSize', 15)), 1)
        keyword = request.query_params.get('keyword', '').strip()

        missing_users = User.objects.filter(is_deleted=False).exclude(
            id__in=Staff.objects.filter(user__isnull=False, is_deleted=False).values_list('user_id', flat=True)
        )[:100]
        ensure_staff_profiles_for_users(missing_users)

        qs = (
            Staff.objects.select_related('user', 'province', 'district', 'ward', 'department')
            .prefetch_related(Prefetch(
                'user__concurrent_roles',
                queryset=UserConcurrently.objects.filter(is_deleted=False).select_related('role', 'department'),
                to_attr='active_concurrent_roles',
            ))
            .filter(
                is_deleted=False,
                user__is_deleted=False,
            )
            .order_by('-created_at', '-user__date_joined')
        )

        start = (page - 1) * page_size
        if keyword:
            ranked_staffs = []
            for index, staff in enumerate(qs):
                score = search_score(self._staff_search_text(staff), keyword)
                if score is not None:
                    ranked_staffs.append((score, index, staff))
            ranked_staffs.sort(key=lambda item: (item[0], item[1]))
            total = len(ranked_staffs)
            staffs = [item[2] for item in ranked_staffs[start: start + page_size]]
        else:
            total = qs.count()
            staffs = qs[start: start + page_size]

        data = StaffListSerializer(staffs, many=True).data
        return ResponseServer.success(data={'staffs': data, 'total': total})

    @staticmethod
    def _staff_search_text(staff):
        user = staff.user
        assignments = getattr(user, 'active_concurrent_roles', []) if user else []
        role_department_text = []
        for assignment in assignments:
            if assignment.role:
                role_department_text.append(assignment.role.name)
            if assignment.department:
                role_department_text.append(assignment.department.name)

        return ' '.join(str(value or '') for value in [
            user.username if user else '',
            user.email if user else '',
            user.phone if user else '',
            user.first_name if user else '',
            user.last_name if user else '',
            user.get_full_name() if user else '',
            staff.first_name,
            staff.last_name,
            staff.full_name,
            staff.staff_code,
            staff.title,
            staff.email,
            staff.phone_number,
            staff.department.name if staff.department else '',
            staff.address,
            staff.province.name if staff.province else '',
            staff.province.code if staff.province else '',
            staff.district.name if staff.district else '',
            staff.ward.name if staff.ward else '',
            staff.ward.code if staff.ward else '',
            staff.ward.old_district_name if staff.ward else '',
            *role_department_text,
        ])


class StaffDetailView(APIView):
    """GET /api/accounts/staff/getdetail/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff_id = request.query_params.get('id', '').strip()
        is_info = request.query_params.get('isInfo', 'false').lower() == 'true'

        staff = get_staff_by_identifier(staff_id, user=request.user if is_info else None)
        if not staff or not staff.user or staff.user.is_deleted:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        staff_data = StaffDetailSerializer(staff).data
        uc_qs = UserConcurrently.objects.select_related('role', 'department', 'organization').filter(
            user=staff.user,
            is_deleted=False,
        )
        user_concurrentlies = UserConcurrentlySerializer(uc_qs, many=True).data

        return ResponseServer.success(data={
            'staff': staff_data,
            'userConcurrentlies': user_concurrentlies,
            'roleInfo': role_flags_for_user(staff.user),
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
        province_id = (data.get('ProvinceID') or data.get('ProvinceCode') or data.get('province_code') or '').strip()
        district_id = data.get('DistrictID', '').strip()
        ward_id = (data.get('WardID') or data.get('WardCode') or data.get('ward_code') or '').strip()
        address = data.get('Address', '').strip()
        status = data.get('Status', '1')
        positions_str = data.get('Positions', '')

        error = self._validate_required(username, password, first_name, last_name, email, phone, address)
        if error:
            return ResponseServer.failure(message=error)
        if User.objects.filter(username=username, is_deleted=False).exists():
            return ResponseServer.failure(message='Tài khoản đã tồn tại')

        try:
            positions = json.loads(positions_str)
        except Exception:
            return ResponseServer.failure(message='Dữ liệu chức vụ không hợp lệ')
        if not positions:
            return ResponseServer.failure(message='Vui lòng chọn chức vụ')

        ok, message, check_is_director, _ = validate_positions(positions)
        if not ok:
            return ResponseServer.failure(message=message)

        province, district, ward, location_error = active_location_or_failure(province_id, ward_id, district_id=district_id)
        if location_error:
            return ResponseServer.failure(message=location_error)

        avatar_file = files.get('avatar')
        ok, message = validate_image(avatar_file)
        if not ok:
            return ResponseServer.failure(message=message)
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
                province_id=province.id if province else None,
                district_id=None,
                ward_id=ward.id if ward else None,
                address=address,
                is_active=is_truthy_status(status),
            )
            user.set_password(password)
            user.save()

            staff = Staff.objects.create(
                user=user,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone,
                province=province,
                district=district,
                ward=ward,
                address=address,
                created_by=str(request.user.id),
            )

            save_staff_file(avatar_file, staff, TYPE_FILE_AVATAR, 'avatar', created_by=str(request.user.id))
            if check_is_director:
                save_staff_file(files.get('sign'), staff, TYPE_FILE_SIGN, 'sign', created_by=str(request.user.id))
                save_staff_file(files.get('stamp'), staff, TYPE_FILE_STAMP, 'stamp', created_by=str(request.user.id))

            sync_user_assignments(user, positions, created_by=str(request.user.id))

        return ResponseServer.success(message='Tạo tài khoản thành công')

    @staticmethod
    def _validate_required(username, password, first_name, last_name, email, phone, address):
        if not username:
            return 'Vui lòng nhập tài khoản'
        if not password:
            return 'Vui lòng nhập mật khẩu'
        if len(password) < 6:
            return 'Mật khẩu phải có ít nhất 6 ký tự'
        if not first_name:
            return 'Vui lòng nhập họ'
        if not last_name:
            return 'Vui lòng nhập tên'
        if not email:
            return 'Vui lòng nhập email'
        if not phone:
            return 'Vui lòng nhập số điện thoại'
        if not address:
            return 'Vui lòng nhập địa chỉ'
        return ''


class StaffUpdateView(APIView):
    """PUT /api/accounts/staff/update/"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request):
        data = request.data
        files = request.FILES
        staff_id = data.get('id', '').strip()

        staff = get_staff_by_identifier(staff_id)
        if not staff or not staff.user:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        first_name = data.get('FirstName', '').strip()
        last_name = data.get('LastName', '').strip()
        email = data.get('Email', '').strip()
        phone = data.get('PhoneNumber', '').strip()
        province_id = (data.get('ProvinceID') or data.get('ProvinceCode') or data.get('province_code') or '').strip()
        district_id = data.get('DistrictID', '').strip()
        ward_id = (data.get('WardID') or data.get('WardCode') or data.get('ward_code') or '').strip()
        address = data.get('Address', '').strip()
        status = data.get('Status', '1')
        password = data.get('Password', '').strip()
        positions_str = data.get('Positions', '')

        for value, message in [
            (first_name, 'Vui lòng nhập họ'),
            (last_name, 'Vui lòng nhập tên'),
            (email, 'Vui lòng nhập email'),
            (phone, 'Vui lòng nhập số điện thoại'),
            (address, 'Vui lòng nhập địa chỉ'),
        ]:
            if not value:
                return ResponseServer.failure(message=message)

        try:
            positions = json.loads(positions_str)
        except Exception:
            return ResponseServer.failure(message='Dữ liệu chức vụ không hợp lệ')
        if not positions:
            return ResponseServer.failure(message='Vui lòng chọn chức vụ')

        ok, message, check_is_director, _ = validate_positions(positions)
        if not ok:
            return ResponseServer.failure(message=message)

        province, district, ward, location_error = active_location_or_failure(province_id, ward_id, district_id=district_id)
        if location_error:
            return ResponseServer.failure(message=location_error)

        avatar_file = files.get('avatar')
        if avatar_file:
            ok, message = validate_image(avatar_file)
            if not ok:
                return ResponseServer.failure(message=message)
        elif not StaffFile.objects.filter(staff=staff, type_file=TYPE_FILE_AVATAR, is_deleted=False).exists():
            return ResponseServer.failure(message='Vui lòng chọn hình đại diện')

        if check_is_director:
            if not files.get('sign') and not StaffFile.objects.filter(staff=staff, type_file=TYPE_FILE_SIGN, is_deleted=False).exists():
                return ResponseServer.failure(message='Vui lòng upload chữ ký')
            if not files.get('stamp') and not StaffFile.objects.filter(staff=staff, type_file=TYPE_FILE_STAMP, is_deleted=False).exists():
                return ResponseServer.failure(message='Vui lòng upload chữ ký có con dấu')

        with transaction.atomic():
            user = staff.user
            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.phone = phone
            user.province_id = province.id if province else None
            user.district_id = None
            user.ward_id = ward.id if ward else None
            user.address = address
            user.is_active = is_truthy_status(status)
            if password:
                if len(password) < 6:
                    return ResponseServer.failure(message='Mật khẩu phải có ít nhất 6 ký tự')
                user.set_password(password)
            user.save()

            staff.first_name = first_name
            staff.last_name = last_name
            staff.email = email
            staff.phone_number = phone
            staff.province = province
            staff.district = district
            staff.ward = ward
            staff.address = address
            staff.updated_by = str(request.user.id)
            staff.save()

            type_files_to_delete = []
            if avatar_file:
                type_files_to_delete.append(TYPE_FILE_AVATAR)
            if check_is_director and files.get('sign'):
                type_files_to_delete.append(TYPE_FILE_SIGN)
            if check_is_director and files.get('stamp'):
                type_files_to_delete.append(TYPE_FILE_STAMP)
            if type_files_to_delete:
                clean_staff_files_for_type(staff, type_files_to_delete)

            if avatar_file:
                save_staff_file(avatar_file, staff, TYPE_FILE_AVATAR, 'avatar', created_by=str(request.user.id))
            if check_is_director and files.get('sign'):
                save_staff_file(files.get('sign'), staff, TYPE_FILE_SIGN, 'sign', created_by=str(request.user.id))
            if check_is_director and files.get('stamp'):
                save_staff_file(files.get('stamp'), staff, TYPE_FILE_STAMP, 'stamp', created_by=str(request.user.id))

            sync_user_assignments(user, positions, created_by=str(request.user.id))

        return ResponseServer.success(message='Cập nhật tài khoản thành công')


class StaffDeleteView(APIView):
    """DELETE /api/accounts/staff/delete/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        staff_id = request.query_params.get('id', '').strip()
        staff = get_staff_by_identifier(staff_id)
        if not staff or not staff.user:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        staff.soft_delete(deleted_by=request.user.id)
        staff.user.soft_delete(deleted_by=request.user.id)
        UserConcurrently.objects.filter(user=staff.user, is_deleted=False).update(is_deleted=True, updated_by=str(request.user.id))
        StaffFile.objects.filter(staff=staff, is_deleted=False).update(is_deleted=True, updated_by=str(request.user.id))
        return ResponseServer.success(message='Xóa tài khoản thành công')


class StaffForgotPasswordView(APIView):
    """GET /api/accounts/staff/forgot-password/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff_id = request.query_params.get('id', '').strip()
        staff = get_staff_by_identifier(staff_id)
        if not staff or not staff.user:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        import secrets
        from apps.authentication.models import PasswordResetToken
        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(user=staff.user, token=token)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_url = f'{frontend_url}/reset-password?token={token}&email={staff.email or staff.user.email}'

        try:
            send_mail(
                subject='Đặt lại mật khẩu - Trung Tâm Triển Lãm',
                message=(
                    f'Xin chào {staff.full_name or staff.user.get_full_name()},\n\n'
                    f'Admin đã gửi cho bạn đường dẫn đặt lại mật khẩu (có hiệu lực trong 1 giờ):\n\n'
                    f'{reset_url}\n\n'
                    f'Nếu bạn không yêu cầu, vui lòng bỏ qua email này.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[staff.email or staff.user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return ResponseServer.success(message='Đã gửi đường dẫn đặt lại mật khẩu đến email người dùng')


class StaffChangePasswordView(APIView):
    """POST /api/accounts/staff/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        staff_id = str(request.data.get('id') or request.data.get('staffID') or '').strip()
        password = str(request.data.get('password') or request.data.get('newPassword') or '').strip()

        if not password:
            return ResponseServer.failure(message='Vui lòng nhập mật khẩu mới')
        if len(password) < 6:
            return ResponseServer.failure(message='Mật khẩu mới phải có ít nhất 6 ký tự')

        staff = get_staff_by_identifier(staff_id)
        if not staff or not staff.user:
            return ResponseServer.not_found(message='Không tìm thấy tài khoản')

        user = staff.user
        user.set_password(password)
        user.save(update_fields=['password', 'updated_at'])
        return ResponseServer.success(message='Đổi mật khẩu thành công')


class DropdownRolesView(APIView):
    """GET /api/accounts/dropdown/roles/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.filter(is_deleted=False, is_disabled=False).order_by('level', 'name')
        data = [
            {
                'id': str(role.id),
                'name': role.name,
                'isDirector': role.is_director,
                'isAdmin': role.is_admin,
                'isViceDirector': role.is_vice_director,
                'level': role.level,
                'canReceiveTask': role.can_receive_task,
                'canAssignTask': role.can_assign_task,
                'canSeeDepartmentTasks': role.can_see_department_tasks,
            }
            for role in roles
        ]
        return ResponseServer.success(data={'roles': data})


class DropdownDepartmentsView(APIView):
    """GET /api/accounts/dropdown/departments/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        depts = Department.objects.filter(is_deleted=False).order_by('sort_order', 'name')
        data = [{'id': str(d.id), 'name': d.name, 'code': d.code, 'isPOAD': d.is_poad} for d in depts]
        return ResponseServer.success(data={'departments': data})


class DropdownOrganizationsView(APIView):
    """GET /api/accounts/dropdown/organizations/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orgs = Organization.objects.filter(is_deleted=False).order_by('name')
        data = [{'id': str(o.id), 'name': o.name} for o in orgs]
        return ResponseServer.success(data={'organizations': data})


class DropdownProvincesView(APIView):
    """GET /api/accounts/dropdown/provinces/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        provinces = Province.objects.filter(is_deleted=False, is_disabled=False).order_by('name')
        data = [
            {
                'id': str(p.id),
                'code': p.code,
                'name': p.name,
                'unitType': p.unit_type,
            }
            for p in provinces
        ]
        return ResponseServer.success(data={'provinces': data})


class DropdownDistrictsView(APIView):
    """GET /api/accounts/dropdown/districts/?includeLegacy=true"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        include_legacy = request.query_params.get('includeLegacy', '').lower() == 'true'
        if not include_legacy:
            return ResponseServer.success(data={'districts': []})

        province_id = request.query_params.get('provinceId', '').strip()
        qs = District.objects.filter(is_deleted=False, is_legacy=True)
        if province_id:
            qs = qs.filter(province_id=province_id)
        data = [
            {
                'id': str(d.id),
                'name': d.name,
                'code': d.code,
                'provinceId': str(d.province_id) if d.province_id else '',
                'isLegacy': d.is_legacy,
            }
            for d in qs.order_by('name')
        ]
        return ResponseServer.success(data={'districts': data})


class DropdownWardsView(APIView):
    """GET /api/accounts/dropdown/wards/?provinceId=<uuid>"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        province_id = request.query_params.get('provinceId', '').strip()
        province_code = request.query_params.get('provinceCode', '').strip()
        qs = Ward.objects.select_related('province').filter(is_deleted=False, is_disabled=False)
        if province_id:
            qs = qs.filter(province_id=province_id)
        elif province_code:
            qs = qs.filter(province__code=province_code)
        data = [
            {
                'id': str(w.id),
                'code': w.code,
                'name': w.name,
                'provinceId': str(w.province_id),
                'unitType': w.unit_type,
                'oldDistrictName': w.old_district_name or '',
            }
            for w in qs.order_by('name')
        ]
        return ResponseServer.success(data={'wards': data})
