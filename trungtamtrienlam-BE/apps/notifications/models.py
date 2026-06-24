from django.db import models
from core.models import BaseModel


class Notification(BaseModel):
    class NotificationType(models.IntegerChoices):
        TASK = 0, 'Công việc'
        DOCUMENT = 1, 'Văn bản'
        CALENDAR = 2, 'Lịch'
        CHAT = 3, 'Tin nhắn'
        SYSTEM = 4, 'Hệ thống'
        RATING = 5, 'Đánh giá'

    user_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=500)
    content = models.TextField(blank=True, null=True)
    notification_type = models.IntegerField(choices=NotificationType.choices, default=NotificationType.SYSTEM)
    is_read = models.BooleanField(default=False, db_index=True)
    reference_id = models.UUIDField(blank=True, null=True)
    reference_type = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Thông báo'
        verbose_name_plural = 'Thông báo'
        ordering = ['-created_at']


class PushSubscription(BaseModel):
    user_id = models.UUIDField(db_index=True, unique=True)
    endpoint = models.TextField()
    p256dh = models.TextField()
    auth = models.TextField()

    class Meta:
        db_table = 'push_subscriptions'
        verbose_name = 'Đăng ký push notification'
        verbose_name_plural = 'Đăng ký push notification'
