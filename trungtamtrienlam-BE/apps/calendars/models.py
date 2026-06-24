from django.db import models
from core.models import BaseModel


class Calendar(BaseModel):
    class Status(models.IntegerChoices):
        PENDING = 0, 'Chờ xác nhận'
        CONFIRMED = 1, 'Đã xác nhận'
        CANCELLED = 2, 'Đã hủy'
        COMPLETED = 3, 'Hoàn thành'

    class CalendarType(models.IntegerChoices):
        MEETING = 0, 'Họp'
        EVENT = 1, 'Sự kiện'
        REMINDER = 2, 'Nhắc nhở'
        TASK = 3, 'Công việc'

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=500, blank=True, null=True)
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    calendar_type = models.IntegerField(choices=CalendarType.choices, default=CalendarType.MEETING)
    status = models.IntegerField(choices=Status.choices, default=Status.PENDING)
    department_id = models.UUIDField(blank=True, null=True)
    is_all_day = models.BooleanField(default=False)
    color = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'calendars'
        verbose_name = 'Lịch'
        verbose_name_plural = 'Lịch'


class CalendarJoin(BaseModel):
    class JoinStatus(models.IntegerChoices):
        PENDING = 0, 'Chờ xác nhận'
        ACCEPTED = 1, 'Chấp nhận'
        DECLINED = 2, 'Từ chối'

    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='participants')
    user_id = models.UUIDField(db_index=True)
    status = models.IntegerField(choices=JoinStatus.choices, default=JoinStatus.PENDING)

    class Meta:
        db_table = 'calendar_joins'
        unique_together = ('calendar', 'user_id')
