from django.db import models
from core.models import BaseModel


class SystemConfig(BaseModel):
    key = models.CharField(max_length=255, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, null=True)
    group = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'system_configs'
        verbose_name = 'Cấu hình hệ thống'

    def __str__(self):
        return self.key


class SettingNotification(BaseModel):
    user_id = models.UUIDField(db_index=True, unique=True)
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    task_notify = models.BooleanField(default=True)
    document_notify = models.BooleanField(default=True)
    calendar_notify = models.BooleanField(default=True)
    chat_notify = models.BooleanField(default=True)

    class Meta:
        db_table = 'setting_notifications'
        verbose_name = 'Cài đặt thông báo'
