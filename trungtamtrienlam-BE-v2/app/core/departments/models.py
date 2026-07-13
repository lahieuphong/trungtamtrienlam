from django.conf import settings
from django.db import models
from core.models import BaseModel


class Department(BaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    parent_id = models.UUIDField(blank=True, null=True)
    manager_id = models.UUIDField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    is_poad = models.BooleanField(default=False)

    class Meta:
        db_table = 'departments'
        verbose_name = 'Phòng ban'
        verbose_name_plural = 'Phòng ban'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Staff(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='staff_profiles',
        db_column='user_id',
        blank=True,
        null=True,
    )
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='staffs')

    # Existing department module fields kept for compatibility.
    staff_code = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    join_date = models.DateField(blank=True, null=True)
    is_manager = models.BooleanField(default=False)

    # 185 Staffs profile fields.
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    avatar = models.CharField(max_length=1000, blank=True, null=True)
    province = models.ForeignKey('accounts.Province', on_delete=models.SET_NULL, blank=True, null=True, related_name='staffs')
    district = models.ForeignKey('accounts.District', on_delete=models.SET_NULL, blank=True, null=True, related_name='staffs')
    ward = models.ForeignKey('accounts.Ward', on_delete=models.SET_NULL, blank=True, null=True, related_name='staffs')
    address = models.TextField(blank=True, null=True)
    sign = models.CharField(max_length=1000, blank=True, null=True)
    stamp = models.CharField(max_length=1000, blank=True, null=True)
    sign_encrypted = models.TextField(blank=True, null=True)
    stamp_encrypted = models.TextField(blank=True, null=True)
    email_personal = models.EmailField(blank=True, null=True)

    class Meta:
        db_table = 'staffs'
        verbose_name = 'Nhân sự'
        verbose_name_plural = 'Nhân sự'
        indexes = [models.Index(fields=['user', 'is_deleted'], name='staffs_user_id_290caf_idx')]

    @property
    def full_name(self):
        return f'{self.first_name or ""} {self.last_name or ""}'.strip()

    def __str__(self):
        return self.full_name or self.staff_code or str(self.id)