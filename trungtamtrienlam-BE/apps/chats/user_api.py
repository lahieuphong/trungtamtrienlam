from django.contrib.auth import get_user_model
from django.db import DatabaseError
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


def _success(payload=None):
    return Response({
        'status': 200,
        'message': 'Lay du lieu thanh cong',
        'data': {
            'status': 200,
            'message': None,
            'data': payload,
        },
        'errors': None,
    })


def _failure(message='Thao tac that bai', status=400):
    return Response({
        'status': status,
        'message': message,
        'data': {
            'status': status,
            'message': message,
            'data': None,
        },
        'errors': [message],
    }, status=status)


def _string(value):
    return '' if value is None else str(value).strip()


def _iso(value):
    return value.isoformat() if value else None


def _display_name(user, staff=None):
    staff_name = _string(getattr(staff, 'full_name', '') if staff else '')
    return (
        staff_name
        or _string(user.get_full_name())
        or _string(getattr(user, 'email', ''))
        or _string(getattr(user, 'username', ''))
        or str(user.id)
    )


class UserListDropdownForChatsApi(GenericAPIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        try:
            users = self._get_users_for_chats()
        except DatabaseError as exc:
            return _failure(str(exc), status=500)

        return _success({'users': users})

    def _get_users_for_chats(self):
        from apps.accounts.models import UserConcurrently
        from apps.authentication.models import UserRole
        from apps.departments.models import Department, Staff

        User = get_user_model()
        users = list(
            User.objects
            .filter(is_deleted=False, is_active=True)
            .order_by('first_name', 'last_name', 'username', 'id')
        )
        user_ids = [user.id for user in users]

        staff_by_user_id = {}
        for staff in (
            Staff.objects
            .filter(user_id__in=user_ids, is_deleted=False)
            .select_related('department')
            .order_by('-is_manager', '-updated_at', '-created_at')
        ):
            staff_by_user_id.setdefault(staff.user_id, staff)

        concurrent_by_user_id = {}
        for item in (
            UserConcurrently.objects
            .filter(user_id__in=user_ids, is_deleted=False)
            .select_related('role', 'department')
            .order_by('-updated_at', '-created_at')
        ):
            concurrent_by_user_id.setdefault(item.user_id, item)

        user_role_by_user_id = {}
        for item in (
            UserRole.objects
            .filter(user_id__in=user_ids)
            .select_related('role')
            .order_by('-created_at')
        ):
            user_role_by_user_id.setdefault(item.user_id, item)

        departments_by_id = {
            department.id: department
            for department in Department.objects.filter(is_deleted=False)
        }

        return [
            self._serialize_user(
                user,
                staff_by_user_id.get(user.id),
                concurrent_by_user_id.get(user.id),
                user_role_by_user_id.get(user.id),
                departments_by_id,
            )
            for user in users
        ]

    def _serialize_user(self, user, staff, concurrent, user_role, departments_by_id):
        user_id = str(user.id)
        role = getattr(concurrent, 'role', None) or getattr(user_role, 'role', None)
        department = (
            getattr(concurrent, 'department', None)
            or getattr(staff, 'department', None)
            or departments_by_id.get(getattr(user, 'department_id', None))
        )

        full_name = _display_name(user, staff)
        avatar = _string(getattr(staff, 'avatar', '') if staff else '') or _string(getattr(user, 'avatar', ''))
        phone = _string(getattr(staff, 'phone_number', '') if staff else '') or _string(getattr(user, 'phone', ''))
        email = _string(getattr(staff, 'email', '') if staff else '') or _string(getattr(user, 'email', ''))
        role_id = _string(getattr(role, 'id', ''))
        role_name = _string(getattr(role, 'name', '')) or ('Admin' if user.is_superuser else '')
        department_id = _string(getattr(department, 'id', ''))
        department_name = _string(getattr(department, 'name', ''))

        return {
            'id': user_id,
            'userID': user_id,
            'customerID': None,
            'nationID': None,
            'fullName': full_name,
            'userName': user.username,
            'passwordHash': None,
            'isCustomer': None,
            'isOnline': False,
            'lastLogin': _iso(user.last_login),
            'status': 1 if user.is_active else 0,
            'twoFactorEnabled': None,
            'accessFailedCount': None,
            'phoneNumberConfirmed': None,
            'concurrencyStamp': None,
            'emailConfirmed': None,
            'lockoutEnabled': None,
            'createdDate': _iso(user.date_joined),
            'stripeCustomerID': None,
            'verifyiedCode': None,
            'verifyiedDate': None,
            'reasonLock': None,
            'lockedBy': None,
            'lockedDate': None,
            'bannedFrom': None,
            'bannedTo': None,
            'createdBy': None,
            'modifiedBy': None,
            'modifiedDate': _iso(getattr(staff, 'updated_at', None)) if staff else None,
            'dateTimeOffset': None,
            'lockoutEnd': None,
            'normalizedEmail': email.upper() if email else None,
            'securityStamp': None,
            'email': email,
            'phoneNumber': phone,
            'reasonLockEN': None,
            'roleID': role_id,
            'normalizedUserName': user.username.upper() if user.username else None,
            'blockFromDate': None,
            'blockToDate': None,
            'departmentID': department_id,
            'departmentName': department_name,
            'roleName': role_name,
            'avatar': avatar,
            'departments': None,
            'roles': None,
            'label': full_name,
            'value': user_id,
        }
