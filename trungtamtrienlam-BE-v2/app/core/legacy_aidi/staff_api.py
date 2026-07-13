import json
import os
import unicodedata

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.validators import validate_email
from django.db import IntegrityError
from django.db import transaction
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.authentication.models import User as AccountUser
from core.legacy_aidi.location_fallback import FALLBACK_PROVINCES
from core.legacy_aidi.location_fallback import get_fallback_districts
from core.legacy_aidi.location_fallback import get_fallback_wards
from core.legacy_aidi.models import (
    LegacyRole,
    LegacyStaff,
    LegacyStaffFile,
    LegacyUser,
    LegacyUserConcurrently,
    ManagedDepartment,
    ManagedRole,
    ManagedStaffPosition,
    ManagedStaffProfile,
)


DEFAULT_ORGANIZATION_ID = 'org-trung-tam-bao-ton'


def _to_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_search(value):
    value = value or ''
    normalized = unicodedata.normalize('NFD', str(value))
    no_marks = ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')
    return no_marks.replace('\u0111', 'd').replace('\u0110', 'D').lower().strip()


def _is_deleted(value):
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {'1', 'true', 'yes'}


def _success(payload=None, message='L\u1ea5y d\u1eef li\u1ec7u th\u00e0nh c\u00f4ng'):
    return Response({
        'status': 200,
        'message': message,
        'data': {
            'status': 200,
            'message': None,
            'data': payload,
        },
        'errors': None,
    })


def _failure(message):
    return Response({
        'status': 400,
        'message': message,
        'data': {
            'status': 400,
            'message': message,
            'data': None,
        },
        'errors': [message],
    })


def _staff_file_to_dict(staff_file):
    return {
        'ID': staff_file.ID,
        'StaffID': staff_file.StaffID,
        'File': staff_file.File,
        'FileName': staff_file.FileName,
        'Type': staff_file.Type,
        'Size': staff_file.Size,
        'CreatedBy': staff_file.CreatedBy,
        'CreatedDate': staff_file.CreatedDate.isoformat() if staff_file.CreatedDate else None,
        'Extension': staff_file.Extension,
        'IsDeleted': staff_file.IsDeleted,
        'TypeFile': staff_file.TypeFile,
    }


def _get_value(data, *names):
    for name in names:
        value = data.get(name)
        if value not in [None, '']:
            return str(value).strip()
    return ''


def _bool_from_status(value):
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _position_value(position, *names):
    for name in names:
        value = position.get(name)
        if value not in [None, '']:
            return str(value).strip()
    return ''


def _parse_positions(raw_positions):
    if not raw_positions:
        return []

    if isinstance(raw_positions, list):
        positions = raw_positions
    else:
        try:
            positions = json.loads(raw_positions)
        except (TypeError, json.JSONDecodeError):
            return []

    if not isinstance(positions, list):
        return []

    normalized_positions = []
    for index, position in enumerate(positions):
        if not isinstance(position, dict):
            return []

        role_id = _position_value(position, 'roleID', 'RoleID', 'roleId', 'role_id')
        department_id = _position_value(position, 'departmentID', 'DepartmentID', 'departmentId', 'department_id')
        organization_id = (
            _position_value(position, 'organizationID', 'OrganizationID', 'organizationId', 'organization_id')
            or DEFAULT_ORGANIZATION_ID
        )
        is_default = bool(position.get('isDefault') if 'isDefault' in position else index == 0)

        normalized_positions.append({
            'role_id': role_id,
            'department_id': department_id,
            'organization_id': organization_id,
            'is_default': is_default,
        })

    return normalized_positions


def _uploaded_file(request, *names):
    for name in names:
        file = request.FILES.get(name)
        if file:
            return file
    return None


def _save_staff_upload(request, staff_id, field_name):
    file = _uploaded_file(request, field_name, field_name.lower())
    if not file:
        return ''

    _, extension = os.path.splitext(file.name or '')
    safe_extension = extension.lower()[:20]
    path = f'staff/{staff_id}/{field_name.lower()}{safe_extension}'
    return default_storage.save(path, file)


def _first_location_name(rows, value):
    value = str(value or '')
    if not value:
        return ''

    for row in rows:
        row_id = str(row.get('ID') or row.get('id') or '')
        if row_id == value:
            return row.get('Name') or row.get('name') or value
    return ''


def _province_name(province_id):
    return _first_location_name(FALLBACK_PROVINCES, province_id)


def _district_name(province_id, district_id):
    return _first_location_name(get_fallback_districts(province_id), district_id)


def _ward_name(district_id, ward_id):
    return _first_location_name(get_fallback_wards(district_id), ward_id)


def _managed_role_to_dict(role):
    if not role:
        return None

    return {
        'id': role.id,
        'name': role.name,
        'isAdmin': bool(role.is_admin),
        'isDirector': role.is_director,
        'isDisabled': role.is_disabled,
        'isDeleted': role.is_deleted,
        'createdDate': role.created_date.isoformat() if role.created_date else None,
        'createdBy': role.created_by,
        'modifiedDate': role.modified_date.isoformat() if role.modified_date else None,
        'modifiedBy': role.modified_by,
        'level': role.level,
        'canReceiveTask': bool(role.can_receive_task),
        'canAssignTask': bool(role.can_assign_task),
        'canSeeDepartmentTasks': bool(role.can_see_department_tasks),
        'isViceDirector': bool(role.is_vice_director),
    }


def _managed_staff_files(profile):
    if not profile:
        return []

    files = []
    for type_file, field_name, path in [
        (0, 'Avatar', profile.avatar),
        (1, 'Sign', profile.sign),
        (2, 'Stamp', profile.stamp),
    ]:
        if not path:
            continue
        files.append({
            'ID': f'{profile.id}-{field_name.lower()}',
            'StaffID': profile.id,
            'File': path,
            'FileName': os.path.basename(path),
            'TypeFile': type_file,
            'IsDeleted': False,
        })
    return files


class LegacyStaffCreateApi(GenericAPIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        username = _get_value(request.data, 'UserName', 'userName', 'username')
        password = _get_value(request.data, 'Password', 'password')
        first_name = _get_value(request.data, 'FirstName', 'firstName')
        last_name = _get_value(request.data, 'LastName', 'lastName')
        email = _get_value(request.data, 'Email', 'email')
        phone_number = _get_value(request.data, 'PhoneNumber', 'phoneNumber')
        province_id = _get_value(request.data, 'ProvinceID', 'provinceID', 'provinceId')
        district_id = _get_value(request.data, 'DistrictID', 'districtID', 'districtId')
        ward_id = _get_value(request.data, 'WardID', 'wardID', 'wardId')
        address = _get_value(request.data, 'Address', 'address')
        status = _get_value(request.data, 'Status', 'status') or '1'
        positions = _parse_positions(_get_value(request.data, 'Positions', 'positions'))

        validation_error = self._validate(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone_number=phone_number,
            province_id=province_id,
            district_id=district_id,
            address=address,
            positions=positions,
        )
        if validation_error:
            return _failure(validation_error)

        created_by = str(request.user.id) if request.user and request.user.is_authenticated else None

        try:
            with transaction.atomic():
                user = AccountUser.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=phone_number,
                    name=' '.join(part for part in [first_name, last_name] if part).strip(),
                    is_active=_bool_from_status(status),
                    has_activated=True,
                    language='vi',
                )

                profile = ManagedStaffProfile.objects.create(
                    user=user,
                    province_id=province_id,
                    district_id=district_id,
                    ward_id=ward_id,
                    address=address,
                    created_by=created_by,
                )

                avatar = _save_staff_upload(request, profile.id, 'Avatar')
                sign = _save_staff_upload(request, profile.id, 'Sign')
                stamp = _save_staff_upload(request, profile.id, 'Stamp')
                if avatar or sign or stamp:
                    profile.avatar = avatar
                    profile.sign = sign
                    profile.stamp = stamp
                    profile.save(update_fields=['avatar', 'sign', 'stamp', 'modified_date'])

                created_positions = [
                    ManagedStaffPosition(
                        user=user,
                        role_id=position['role_id'],
                        department_id=position['department_id'],
                        organization_id=position['organization_id'],
                        is_default=position['is_default'],
                        created_by=created_by,
                    )
                    for position in positions
                ]
                ManagedStaffPosition.objects.bulk_create(created_positions)
        except IntegrityError:
            return _failure('T\u00e0i kho\u1ea3n \u0111\u00e3 t\u1ed3n t\u1ea1i')

        return _success(
            {'staff': self._serialize_created_user(user, profile, created_positions)},
            message='T\u1ea1o t\u00e0i kho\u1ea3n th\u00e0nh c\u00f4ng',
        )

    def _validate(self, **values):
        if not values['username']:
            return 'Vui l\u00f2ng nh\u1eadp m\u00e3 s\u1ed1 t\u00e0i kho\u1ea3n'
        if AccountUser.objects.filter(username__iexact=values['username']).exists():
            return 'M\u00e3 s\u1ed1 t\u00e0i kho\u1ea3n \u0111\u00e3 t\u1ed3n t\u1ea1i'
        if not values['password']:
            return 'Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u'
        if not values['first_name']:
            return 'Vui l\u00f2ng nh\u1eadp t\u00ean'
        if not values['last_name']:
            return 'Vui l\u00f2ng nh\u1eadp h\u1ecd'
        if not values['phone_number']:
            return 'Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i'
        if not values['email']:
            return 'Vui l\u00f2ng nh\u1eadp email'
        try:
            validate_email(values['email'])
        except ValidationError:
            return 'Email kh\u00f4ng h\u1ee3p l\u1ec7'
        if not values['province_id']:
            return 'Vui l\u00f2ng ch\u1ecdn t\u1ec9nh/th\u00e0nh ph\u1ed1'
        if not values['district_id']:
            return 'Vui l\u00f2ng ch\u1ecdn ph\u01b0\u1eddng/x\u00e3'
        if not values['address']:
            return 'Vui l\u00f2ng nh\u1eadp \u0111\u1ecba ch\u1ec9'
        if not values['positions']:
            return 'Vui l\u00f2ng ch\u1ecdn ch\u1ee9c v\u1ee5'

        for position in values['positions']:
            if not position['role_id']:
                return 'Vui l\u00f2ng ch\u1ecdn ch\u1ee9c v\u1ee5'
            if not position['department_id']:
                return 'Vui l\u00f2ng ch\u1ecdn b\u1ed9 ph\u1eadn'

        return ''

    def _serialize_created_user(self, user, profile, positions):
        return {
            'id': profile.id,
            'userID': str(user.id),
            'userName': user.username,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'fullName': user.name,
            'email': user.email,
            'phoneNumber': user.phone_number,
            'provinceID': profile.province_id,
            'districtID': profile.district_id,
            'wardID': profile.ward_id,
            'address': profile.address,
            'status': 1 if user.is_active else 0,
            'positions': [
                {
                    'id': position.id,
                    'roleID': position.role_id,
                    'departmentID': position.department_id,
                    'organizationID': position.organization_id,
                    'isDefault': position.is_default,
                }
                for position in positions
            ],
        }


class LegacyStaffDetailApi(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        staff_id = _get_value(request.query_params, 'id', 'ID')
        is_info = _bool_from_status(request.query_params.get('isInfo'))
        user, profile = self._get_user_and_profile(staff_id, is_info)
        if not user:
            return _failure('Khong tim thay tai khoan')

        positions = list(
            ManagedStaffPosition.objects
            .filter(user=user)
            .order_by('-is_default', 'created_date')
        )
        role_ids = {position.role_id for position in positions if position.role_id}
        department_ids = {position.department_id for position in positions if position.department_id}
        roles_by_id = {role.id: role for role in ManagedRole.objects.filter(id__in=role_ids)}
        departments_by_id = {
            department.id: department
            for department in ManagedDepartment.objects.filter(id__in=department_ids)
        }
        primary_position = next((position for position in positions if position.is_default), positions[0] if positions else None)
        primary_role = roles_by_id.get(primary_position.role_id) if primary_position else None

        return _success({
            'staff': self._serialize_staff(user, profile, primary_role),
            'userConcurrentlies': [
                self._serialize_position(position, roles_by_id, departments_by_id)
                for position in positions
            ],
            'roleInfo': _managed_role_to_dict(primary_role) or self._admin_role_info(user),
        })

    def _get_user_and_profile(self, staff_id, is_info):
        if not staff_id:
            return None, None

        if is_info:
            user = AccountUser.objects.filter(id=staff_id, is_deleted=False).first()
            profile = ManagedStaffProfile.objects.filter(user=user).first() if user else None
            return user, profile

        profile = (
            ManagedStaffProfile.objects
            .select_related('user')
            .filter(id=staff_id, user__is_deleted=False)
            .first()
        )
        if profile:
            return profile.user, profile

        user = AccountUser.objects.filter(id=staff_id, is_deleted=False).first()
        profile = ManagedStaffProfile.objects.filter(user=user).first() if user else None
        return user, profile

    def _serialize_staff(self, user, profile, role):
        display_name = user.name or user.get_full_name() or user.username
        profile_id = str(profile.id if profile else user.id)
        province_id = profile.province_id if profile else ''
        district_id = profile.district_id if profile else ''
        ward_id = profile.ward_id if profile else ''
        province_name = _province_name(province_id)
        district_name = _district_name(province_id, district_id)
        ward_name = _ward_name(district_id, ward_id)
        staff_files = _managed_staff_files(profile)

        return {
            'id': profile_id,
            'ID': profile_id,
            'userID': str(user.id),
            'UserID': str(user.id),
            'userName': user.username,
            'UserName': user.username,
            'fullName': display_name,
            'FullName': display_name,
            'firstName': user.first_name,
            'FirstName': user.first_name,
            'lastName': user.last_name,
            'LastName': user.last_name,
            'email': user.email,
            'Email': user.email,
            'phoneNumber': user.phone_number,
            'PhoneNumber': user.phone_number,
            'avatar': profile.avatar if profile else '',
            'Avatar': profile.avatar if profile else '',
            'provinceID': province_id,
            'ProvinceID': province_id,
            'provinceName': province_name,
            'ProvinceName': province_name,
            'districtID': district_id,
            'DistrictID': district_id,
            'districtName': district_name,
            'DistrictName': district_name,
            'wardID': ward_id,
            'WardID': ward_id,
            'wardName': ward_name,
            'WardName': ward_name,
            'address': profile.address if profile else '',
            'Address': profile.address if profile else '',
            'status': 1 if user.is_active else 0,
            'Status': 1 if user.is_active else 0,
            'roleName': role.name if role else ('Admin' if user.is_superuser else ''),
            'RoleName': role.name if role else ('Admin' if user.is_superuser else ''),
            'staffFiles': json.dumps(staff_files, ensure_ascii=False),
            'StaffFiles': json.dumps(staff_files, ensure_ascii=False),
            'sign': profile.sign if profile else '',
            'Sign': profile.sign if profile else '',
            'stamp': profile.stamp if profile else '',
            'Stamp': profile.stamp if profile else '',
            'createdDate': profile.created_date.isoformat() if profile and profile.created_date else None,
            'CreatedDate': profile.created_date.isoformat() if profile and profile.created_date else None,
            'modifiedDate': profile.modified_date.isoformat() if profile and profile.modified_date else None,
            'ModifiedDate': profile.modified_date.isoformat() if profile and profile.modified_date else None,
        }

    def _serialize_position(self, position, roles_by_id, departments_by_id):
        role = roles_by_id.get(position.role_id)
        department = departments_by_id.get(position.department_id)

        return {
            'id': position.id,
            'ID': position.id,
            'userID': str(position.user_id),
            'UserID': str(position.user_id),
            'roleID': position.role_id,
            'RoleID': position.role_id,
            'roleName': role.name if role else '',
            'RoleName': role.name if role else '',
            'departmentID': position.department_id,
            'DepartmentID': position.department_id,
            'departmentName': department.name if department else '',
            'DepartmentName': department.name if department else '',
            'organizationID': position.organization_id,
            'OrganizationID': position.organization_id,
            'organizationName': '',
            'OrganizationName': '',
            'isDefault': position.is_default,
            'IsDefault': position.is_default,
            'createdDate': position.created_date.isoformat() if position.created_date else None,
            'CreatedDate': position.created_date.isoformat() if position.created_date else None,
        }

    def _admin_role_info(self, user):
        if not user.is_superuser:
            return None

        return {
            'id': 'admin',
            'name': 'Admin',
            'isAdmin': True,
            'isDirector': False,
            'isDisabled': False,
            'isDeleted': False,
            'createdDate': None,
            'createdBy': None,
            'modifiedDate': None,
            'modifiedBy': None,
            'level': 1,
            'canReceiveTask': True,
            'canAssignTask': True,
            'canSeeDepartmentTasks': True,
            'isViceDirector': False,
        }


class LegacyStaffDeleteApi(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request):
        staff_id = _get_value(request.query_params, 'id', 'ID')
        user, profile = self._get_user_and_profile(staff_id)
        if not user:
            return _failure('Khong tim thay tai khoan')

        update_fields = []
        if user.is_active:
            user.is_active = False
            update_fields.append('is_active')
        if not user.is_deleted:
            user.is_deleted = True
            update_fields.append('is_deleted')
        if update_fields:
            user.save(update_fields=update_fields)

        if profile:
            profile.modified_by = str(request.user.id) if request.user and request.user.is_authenticated else None
            profile.save(update_fields=['modified_by', 'modified_date'])

        return _success(
            {
                'id': str(profile.id if profile else user.id),
                'userID': str(user.id),
                'isDeleted': True,
                'isActive': False,
            },
            message='Xoa tai khoan thanh cong',
        )

    def _get_user_and_profile(self, staff_id):
        if not staff_id:
            return None, None

        profile = (
            ManagedStaffProfile.objects
            .select_related('user')
            .filter(id=staff_id, user__is_deleted=False)
            .first()
        )
        if profile:
            return profile.user, profile

        user = AccountUser.objects.filter(id=staff_id, is_deleted=False).first()
        profile = ManagedStaffProfile.objects.filter(user=user).first() if user else None
        return user, profile


class LegacyStaffUpdateApi(GenericAPIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def put(self, request):
        staff_id = _get_value(request.data, 'id', 'ID')
        user, profile = self._get_user_and_profile(staff_id)
        if not user:
            return _failure('Khong tim thay tai khoan')

        username = _get_value(request.data, 'UserName', 'userName', 'username')
        password = _get_value(request.data, 'Password', 'password')
        first_name = _get_value(request.data, 'FirstName', 'firstName')
        last_name = _get_value(request.data, 'LastName', 'lastName')
        email = _get_value(request.data, 'Email', 'email')
        phone_number = _get_value(request.data, 'PhoneNumber', 'phoneNumber')
        province_id = _get_value(request.data, 'ProvinceID', 'provinceID', 'provinceId')
        district_id = _get_value(request.data, 'DistrictID', 'districtID', 'districtId')
        ward_id = _get_value(request.data, 'WardID', 'wardID', 'wardId')
        address = _get_value(request.data, 'Address', 'address')
        status = _get_value(request.data, 'Status', 'status') or '0'
        positions = _parse_positions(_get_value(request.data, 'Positions', 'positions'))

        validation_error = self._validate(
            user=user,
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone_number=phone_number,
            province_id=province_id,
            district_id=district_id,
            address=address,
            positions=positions,
        )
        if validation_error:
            return _failure(validation_error)

        modified_by = str(request.user.id) if request.user and request.user.is_authenticated else None

        try:
            with transaction.atomic():
                user.username = username
                user.first_name = first_name
                user.last_name = last_name
                user.email = email
                user.phone_number = phone_number
                user.name = ' '.join(part for part in [first_name, last_name] if part).strip()
                user.is_active = _bool_from_status(status)
                user.is_deleted = False
                update_fields = [
                    'username',
                    'first_name',
                    'last_name',
                    'email',
                    'phone_number',
                    'name',
                    'is_active',
                    'is_deleted',
                ]
                if password:
                    user.set_password(password)
                    update_fields.append('password')
                user.save(update_fields=update_fields)

                if profile is None:
                    profile = ManagedStaffProfile.objects.create(
                        user=user,
                        created_by=modified_by,
                    )

                profile.province_id = province_id
                profile.district_id = district_id
                profile.ward_id = ward_id
                profile.address = address
                profile.modified_by = modified_by

                avatar = _save_staff_upload(request, profile.id, 'Avatar')
                sign = _save_staff_upload(request, profile.id, 'Sign')
                stamp = _save_staff_upload(request, profile.id, 'Stamp')
                if avatar:
                    profile.avatar = avatar
                if sign:
                    profile.sign = sign
                if stamp:
                    profile.stamp = stamp

                profile.save(update_fields=[
                    'province_id',
                    'district_id',
                    'ward_id',
                    'address',
                    'avatar',
                    'sign',
                    'stamp',
                    'modified_by',
                    'modified_date',
                ])

                ManagedStaffPosition.objects.filter(user=user).delete()
                created_positions = [
                    ManagedStaffPosition(
                        user=user,
                        role_id=position['role_id'],
                        department_id=position['department_id'],
                        organization_id=position['organization_id'],
                        is_default=position['is_default'],
                        created_by=modified_by,
                    )
                    for position in positions
                ]
                ManagedStaffPosition.objects.bulk_create(created_positions)
        except IntegrityError:
            return _failure('Ma so tai khoan da ton tai')

        return _success(
            {'staff': LegacyStaffCreateApi()._serialize_created_user(user, profile, created_positions)},
            message='Cap nhat tai khoan thanh cong',
        )

    def _get_user_and_profile(self, staff_id):
        if not staff_id:
            return None, None

        profile = (
            ManagedStaffProfile.objects
            .select_related('user')
            .filter(id=staff_id, user__is_deleted=False)
            .first()
        )
        if profile:
            return profile.user, profile

        user = AccountUser.objects.filter(id=staff_id, is_deleted=False).first()
        profile = ManagedStaffProfile.objects.filter(user=user).first() if user else None
        return user, profile

    def _validate(self, **values):
        if not values['username']:
            return 'Vui long nhap ma so tai khoan'
        if (
            AccountUser.objects
            .filter(username__iexact=values['username'], is_deleted=False)
            .exclude(id=values['user'].id)
            .exists()
        ):
            return 'Ma so tai khoan da ton tai'
        if not values['first_name']:
            return 'Vui long nhap ten'
        if not values['last_name']:
            return 'Vui long nhap ho'
        if not values['phone_number']:
            return 'Vui long nhap so dien thoai'
        if not values['email']:
            return 'Vui long nhap email'
        try:
            validate_email(values['email'])
        except ValidationError:
            return 'Email khong hop le'
        if not values['province_id']:
            return 'Vui long chon tinh/thanh pho'
        if not values['district_id']:
            return 'Vui long chon phuong/xa'
        if not values['address']:
            return 'Vui long nhap dia chi'
        if not values['positions']:
            return 'Vui long chon chuc vu'

        for position in values['positions']:
            if not position['role_id']:
                return 'Vui long chon chuc vu'

        return ''


class LegacyStaffListApi(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        page = max(_to_int(request.query_params.get('page'), 1), 1)
        page_size = max(_to_int(request.query_params.get('pageSize'), 15), 1)
        keyword = _normalize_search(request.query_params.get('keyword', ''))

        try:
            staffs, total = self._get_legacy_staffs(page, page_size, keyword)
            source = 'legacy_aidi'
        except Exception:
            staffs, total = self._get_django_users(page, page_size, keyword)
            source = 'django_accounts'

        return Response({
            'status': 200,
            'data': {
                'data': {
                    'staffs': staffs,
                    'total': total,
                    'source': source,
                },
            },
        })

    def _get_legacy_staffs(self, page, page_size, keyword):
        all_staffs = list(LegacyStaff.objects.all())
        staff_user_ids = {staff.UserID for staff in all_staffs if staff.UserID}
        users = {user.ID: user for user in LegacyUser.objects.filter(ID__in=staff_user_ids)}
        staffs = [staff for staff in all_staffs if staff.UserID in users]

        if keyword:
            staffs = [staff for staff in staffs if self._matches_keyword(staff, users[staff.UserID], keyword)]

        staffs.sort(key=lambda staff: _normalize_search(self._full_name(staff, users.get(staff.UserID))))

        total = len(staffs)
        page_staffs = staffs[(page - 1) * page_size:page * page_size]

        staff_ids = [staff.ID for staff in page_staffs]
        user_ids = [staff.UserID for staff in page_staffs if staff.UserID]
        files_by_staff_id = self._get_staff_files(staff_ids)
        roles_by_user_id = self._get_primary_roles(user_ids, users)

        return [
            self._serialize_staff(
                staff,
                users.get(staff.UserID),
                roles_by_user_id.get(staff.UserID),
                files_by_staff_id.get(staff.ID, []),
            )
            for staff in page_staffs
        ], total

    def _get_django_users(self, page, page_size, keyword):
        users = AccountUser.objects.filter(is_deleted=False).order_by('name', 'username', 'id')
        if keyword:
            users = [
                user for user in users
                if any(
                    keyword in _normalize_search(value)
                    for value in [user.username, user.name, user.email, user.phone_number]
                )
            ]
        else:
            users = list(users)

        total = len(users)
        page_users = users[(page - 1) * page_size:page * page_size]
        user_ids = [user.id for user in page_users]
        profiles_by_user_id = {
            profile.user_id: profile
            for profile in ManagedStaffProfile.objects.filter(user_id__in=user_ids)
        }
        positions_by_user_id = {}
        role_ids = set()
        for position in ManagedStaffPosition.objects.filter(user_id__in=user_ids).order_by('-is_default', 'created_date'):
            positions_by_user_id.setdefault(position.user_id, []).append(position)
            role_ids.add(position.role_id)
        roles_by_id = {
            role.id: role
            for role in ManagedRole.objects.filter(id__in=role_ids)
        }

        return [
            self._serialize_django_user(
                user,
                profiles_by_user_id.get(user.id),
                positions_by_user_id.get(user.id, []),
                roles_by_id,
            )
            for user in page_users
        ], total

    def _matches_keyword(self, staff, user, keyword):
        search_values = [
            staff.FirstName,
            staff.LastName,
            self._full_name(staff, user),
            staff.Email,
            staff.PhoneNumber,
            user.UserName if user else '',
            user.Email if user else '',
            user.PhoneNumber if user else '',
        ]
        return any(keyword in _normalize_search(value) for value in search_values)

    def _full_name(self, staff, user):
        if user and user.FullName:
            return user.FullName
        return ' '.join(part for part in [staff.FirstName, staff.LastName] if part).strip()

    def _get_staff_files(self, staff_ids):
        files_by_staff_id = {staff_id: [] for staff_id in staff_ids}
        if not staff_ids:
            return files_by_staff_id

        files = LegacyStaffFile.objects.filter(StaffID__in=staff_ids)
        for staff_file in files:
            if _is_deleted(staff_file.IsDeleted):
                continue
            files_by_staff_id.setdefault(staff_file.StaffID, []).append(_staff_file_to_dict(staff_file))
        return files_by_staff_id

    def _get_primary_roles(self, user_ids, users):
        roles_by_id = {role.ID: role for role in LegacyRole.objects.all()}
        roles_by_user_id = {}

        concurrent_roles = LegacyUserConcurrently.objects.filter(UserID__in=user_ids)
        for item in concurrent_roles:
            role = roles_by_id.get(item.RoleID)
            if not role:
                continue
            current = roles_by_user_id.get(item.UserID)
            if current is None or self._role_sort_key(role) < self._role_sort_key(current):
                roles_by_user_id[item.UserID] = role

        for user_id in user_ids:
            if user_id in roles_by_user_id:
                continue
            user = users.get(user_id)
            role_ids = (getattr(user, 'RoleID', '') or '').split('|') if user else []
            role = next((roles_by_id.get(role_id) for role_id in role_ids if roles_by_id.get(role_id)), None)
            if role:
                roles_by_user_id[user_id] = role

        return roles_by_user_id

    def _role_sort_key(self, role):
        level = role.Level if role.Level is not None else 999999
        return level, role.Name or ''

    def _serialize_staff(self, staff, user, role, staff_files):
        return {
            'id': staff.ID,
            'userID': staff.UserID,
            'userName': user.UserName if user else '',
            'fullName': self._full_name(staff, user),
            'firstName': staff.FirstName,
            'lastName': staff.LastName,
            'email': staff.Email or (user.Email if user else ''),
            'phoneNumber': staff.PhoneNumber or (user.PhoneNumber if user else ''),
            'avatar': staff.Avatar,
            'provinceID': staff.ProvinceID,
            'districtID': staff.DistrictID,
            'wardID': staff.WardID,
            'address': staff.Address,
            'status': user.Status if user else 0,
            'roleName': role.Name if role else (user.RoleName if user else ''),
            'staffFiles': json.dumps(staff_files, ensure_ascii=False),
            'sign': staff.Sign,
            'stamp': staff.Stamp,
            'createdDate': staff.CreatedDate.isoformat() if staff.CreatedDate else None,
            'modifiedDate': staff.ModifiedDate.isoformat() if staff.ModifiedDate else None,
        }

    def _serialize_django_user(self, user, profile=None, positions=None, roles_by_id=None):
        positions = positions or []
        roles_by_id = roles_by_id or {}
        primary_position = next((position for position in positions if position.is_default), positions[0] if positions else None)
        role = roles_by_id.get(primary_position.role_id) if primary_position else None
        display_name = user.name or user.get_full_name() or user.username
        staff_files = self._managed_staff_files(profile)

        return {
            'id': str(profile.id if profile else user.id),
            'userID': str(user.id),
            'userName': user.username,
            'fullName': display_name,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'email': user.email,
            'phoneNumber': user.phone_number,
            'avatar': profile.avatar if profile else '',
            'provinceID': profile.province_id if profile else '',
            'districtID': profile.district_id if profile else '',
            'wardID': profile.ward_id if profile else '',
            'address': profile.address if profile else '',
            'status': 1 if user.is_active else 0,
            'roleName': role.name if role else ('Admin' if user.is_superuser else ''),
            'staffFiles': json.dumps(staff_files, ensure_ascii=False),
            'sign': profile.sign if profile else '',
            'stamp': profile.stamp if profile else '',
            'createdDate': user.date_joined.isoformat() if user.date_joined else None,
            'modifiedDate': profile.modified_date.isoformat() if profile and profile.modified_date else None,
        }

    def _managed_staff_files(self, profile):
        if not profile:
            return []

        files = []
        for type_file, field_name, path in [
            (0, 'Avatar', profile.avatar),
            (1, 'Sign', profile.sign),
            (2, 'Stamp', profile.stamp),
        ]:
            if not path:
                continue
            files.append({
                'ID': f'{profile.id}-{field_name.lower()}',
                'StaffID': profile.id,
                'File': path,
                'FileName': os.path.basename(path),
                'TypeFile': type_file,
                'IsDeleted': False,
            })
        return files
