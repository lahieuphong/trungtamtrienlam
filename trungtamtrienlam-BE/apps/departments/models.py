import uuid
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

    class Meta:
        db_table = 'departments'
        verbose_name = 'Phòng ban'
        verbose_name_plural = 'Phòng ban'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Staff(BaseModel):
    user_id = models.UUIDField(db_index=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='staffs')
    staff_code = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    join_date = models.DateField(blank=True, null=True)
    is_manager = models.BooleanField(default=False)

    class Meta:
        db_table = 'staffs'
        verbose_name = 'Nhân sự'
        verbose_name_plural = 'Nhân sự'
