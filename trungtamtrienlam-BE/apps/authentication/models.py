import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.TextField(blank=True, null=True)
    department_id = models.UUIDField(blank=True, null=True, db_index=True)
    position = models.CharField(max_length=255, blank=True, null=True)
    province_id = models.UUIDField(blank=True, null=True)
    district_id = models.UUIDField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'Người dùng'
        verbose_name_plural = 'Người dùng'

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.username

    def soft_delete(self, deleted_by=None):
        self.is_deleted = True
        self.is_active = False
        self.save(update_fields=['is_deleted', 'is_active', 'updated_at'])


class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_director = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    is_disabled = models.BooleanField(default=False)
    level = models.IntegerField(default=0)
    can_receive_task = models.BooleanField(default=False)
    can_assign_task = models.BooleanField(default=False)
    can_see_department_tasks = models.BooleanField(default=False)
    is_vice_director = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, blank=True, null=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Vai trò'
        verbose_name_plural = 'Vai trò'
        ordering = ['level', 'name']

    def __str__(self):
        return self.name


class RoleDepartment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_departments')
    department = models.ForeignKey('departments.Department', on_delete=models.CASCADE, related_name='role_departments')

    class Meta:
        db_table = 'roles_department'
        unique_together = ('role', 'department')
        verbose_name = 'Vai trò theo phòng ban'
        verbose_name_plural = 'Vai trò theo phòng ban'

    def __str__(self):
        return f'{self.role_id} - {self.department_id}'


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_users')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_roles'
        unique_together = ('user', 'role')
        verbose_name = 'Phân quyền người dùng'
        verbose_name_plural = 'Phân quyền người dùng'


class Function(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    url = models.CharField(max_length=500, blank=True, null=True)
    icon = models.CharField(max_length=100, blank=True, null=True)
    parent_id = models.UUIDField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'functions'
        verbose_name = 'Chức năng'
        verbose_name_plural = 'Chức năng'
        ordering = ['sort_order']

    def __str__(self):
        return self.name


class Action(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'actions'
        verbose_name = 'Hành động'
        verbose_name_plural = 'Hành động'

    def __str__(self):
        return self.code


class Permission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    department_id = models.CharField(max_length=36, blank=True, default='')
    function = models.ForeignKey(Function, on_delete=models.CASCADE)
    action = models.ForeignKey(Action, on_delete=models.CASCADE)

    class Meta:
        db_table = 'permissions'
        unique_together = ('role', 'department_id', 'function', 'action')
        verbose_name = 'Quyền hạn'
        verbose_name_plural = 'Quyền hạn'


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'

    def is_valid(self):
        from django.utils import timezone
        expiry = self.created_at + timezone.timedelta(hours=1)
        return not self.is_used and timezone.now() < expiry