import uuid
from django.db import models
from core.models import BaseModel


class Province(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, blank=True, null=True)
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
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'districts'
        verbose_name = 'Quận/Huyện'
        verbose_name_plural = 'Quận/Huyện'
        ordering = ['name']

    def __str__(self):
        return self.name


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    code = models.CharField(max_length=50, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'organizations'
        verbose_name = 'Tổ chức'
        verbose_name_plural = 'Tổ chức'

    def __str__(self):
        return self.name


class StaffFile(BaseModel):
    # user_id stored as char to avoid circular FK issues
    user_id = models.CharField(max_length=36, db_index=True)
    file = models.CharField(max_length=1000, blank=True, null=True)
    file_name = models.CharField(max_length=500, blank=True, null=True)
    size = models.FloatField(default=0)
    extension = models.CharField(max_length=20, blank=True, null=True)
    type = models.IntegerField(default=0)    # file type (image/video etc)
    type_file = models.IntegerField(default=0)  # 1=Avatar, 2=Sign, 3=Stamp

    class Meta:
        db_table = 'staff_files'
        verbose_name = 'File nhân sự'
        verbose_name_plural = 'File nhân sự'

    def __str__(self):
        return f'{self.user_id} - {self.file_name}'


class UserConcurrently(BaseModel):
    user_id = models.CharField(max_length=36, db_index=True)
    role_id = models.CharField(max_length=36, blank=True, null=True)
    department_id = models.CharField(max_length=36, blank=True, null=True)
    organization_id = models.CharField(max_length=36, blank=True, null=True)

    class Meta:
        db_table = 'user_concurrentlies'
        verbose_name = 'Chức vụ kiêm nhiệm'
        verbose_name_plural = 'Chức vụ kiêm nhiệm'
