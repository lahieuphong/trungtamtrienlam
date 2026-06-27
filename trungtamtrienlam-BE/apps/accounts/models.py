import uuid
from django.conf import settings
from django.db import models
from core.models import BaseModel


class Province(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, blank=True, null=True)
    is_disabled = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'provinces'
        verbose_name = 'Tỉnh/Thành phố'
        verbose_name_plural = 'Tỉnh/Thành phố'
        ordering = ['name']

    def __str__(self):
        return self.name


class District(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, blank=True, null=True)
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name='districts', null=True)
    is_disabled = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'districts'
        verbose_name = 'Quận/Huyện'
        verbose_name_plural = 'Quận/Huyện'
        ordering = ['name']

    def __str__(self):
        return self.name


class Ward(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, blank=True, null=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='wards', null=True)
    is_disabled = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'wards'
        verbose_name = 'Phường/Xã'
        verbose_name_plural = 'Phường/Xã'
        ordering = ['name']

    def __str__(self):
        return self.name


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    code = models.CharField(max_length=50, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, blank=True, null=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'organizations'
        verbose_name = 'Tổ chức'
        verbose_name_plural = 'Tổ chức'

    def __str__(self):
        return self.name


class StaffFile(BaseModel):
    staff = models.ForeignKey(
        'departments.Staff',
        on_delete=models.CASCADE,
        related_name='files',
        db_column='staff_id',
        blank=True,
        null=True,
    )
    # Kept for data imported before the Staff table was wired like 185.
    user_id = models.CharField(max_length=36, db_index=True, blank=True, null=True)
    file = models.CharField(max_length=1000, blank=True, null=True)
    file_name = models.CharField(max_length=500, blank=True, null=True)
    size = models.FloatField(default=0)
    extension = models.CharField(max_length=20, blank=True, null=True)
    type = models.IntegerField(default=0)
    type_file = models.IntegerField(default=0)  # 185: 0=Avatar, 1=Sign, 2=Stamp

    class Meta:
        db_table = 'staff_files'
        verbose_name = 'File nhân sự'
        verbose_name_plural = 'File nhân sự'
        indexes = [
            models.Index(fields=['staff', 'type_file', 'is_deleted'], name='staff_files_staff_i_c4e63d_idx'),
            models.Index(fields=['user_id', 'type_file', 'is_deleted'], name='staff_files_user_id_6c9a21_idx'),
        ]

    def __str__(self):
        owner = self.staff_id or self.user_id or ''
        return f'{owner} - {self.file_name or self.file or "file"}'


class UserConcurrently(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='concurrent_roles',
        db_column='user_id',
        blank=True,
        null=True,
    )
    role = models.ForeignKey(
        'authentication.Role',
        on_delete=models.SET_NULL,
        related_name='user_concurrentlies',
        db_column='role_id',
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        related_name='user_concurrentlies',
        db_column='department_id',
        blank=True,
        null=True,
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        related_name='user_concurrentlies',
        db_column='organization_id',
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'user_concurrentlies'
        verbose_name = 'Chức vụ kiêm nhiệm'
        verbose_name_plural = 'Chức vụ kiêm nhiệm'
        indexes = [
            models.Index(fields=['user', 'is_deleted'], name='user_concu_user_id_bf9a3c_idx'),
            models.Index(fields=['role', 'department'], name='user_concu_role_id_38c54c_idx'),
        ]

    def __str__(self):
        return f'{self.user_id or ""} - {self.role_id or ""}'