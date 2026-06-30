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

    class EventType(models.IntegerChoices):
        MEETING = 0, 'Cuộc họp'
        COLLABORATE = 1, 'Công tác'
        OTHER = 2, 'Khác'

    class JoinType(models.IntegerChoices):
        DEPARTMENT = 0, 'Phòng ban'
        USER = 1, 'Người dùng'
        PERSONAL = 2, 'Cá nhân'

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

    # 185-compatible calendar schema. Older target fields above are kept so
    # other code can continue to read/write them while the UI uses these names.
    name = models.CharField(max_length=500, blank=True, null=True, db_index=True)
    type = models.IntegerField(choices=EventType.choices, blank=True, null=True, db_index=True)
    from_time = models.DateTimeField(blank=True, null=True, db_index=True)
    to_time = models.DateTimeField(blank=True, null=True, db_index=True)
    link = models.CharField(max_length=1000, blank=True, null=True)
    place = models.CharField(max_length=500, blank=True, null=True)
    join_type = models.IntegerField(choices=JoinType.choices, blank=True, null=True, db_index=True)
    deleted_date = models.DateTimeField(blank=True, null=True)
    deleted_by = models.CharField(max_length=255, blank=True, null=True)
    is_locked = models.BooleanField(default=False)
    is_canceled = models.BooleanField(default=False)
    cancel_reason = models.TextField(blank=True, null=True)
    cancel_undo_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'calendars'
        verbose_name = 'Lịch'
        verbose_name_plural = 'Lịch'

    def save(self, *args, **kwargs):
        if not self.name and self.title:
            self.name = self.title
        if not self.title and self.name:
            self.title = self.name
        if self.from_time is None and self.start_time:
            self.from_time = self.start_time
        if self.start_time is None and self.from_time:
            self.start_time = self.from_time
        if self.to_time is None and self.end_time:
            self.to_time = self.end_time
        if self.end_time is None and self.to_time:
            self.end_time = self.to_time
        if self.type is None and self.calendar_type is not None:
            self.type = self.calendar_type
        if self.type is not None:
            self.calendar_type = self.type
        if not self.place and self.location:
            self.place = self.location
        if not self.location and self.place:
            self.location = self.place
        if self.join_type is None:
            self.join_type = self.JoinType.DEPARTMENT
        super().save(*args, **kwargs)


class CalendarJoin(BaseModel):
    class JoinStatus(models.IntegerChoices):
        PENDING = 0, 'Chờ xác nhận'
        ACCEPTED = 1, 'Chấp nhận'
        DECLINED = 2, 'Từ chối'

    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='participants')
    user_id = models.UUIDField(blank=True, null=True, db_index=True)
    status = models.IntegerField(choices=JoinStatus.choices, default=JoinStatus.PENDING)
    department_id = models.CharField(max_length=255, blank=True, null=True)
    accept_type = models.IntegerField(choices=JoinStatus.choices, default=JoinStatus.PENDING)
    refuse_content = models.TextField(blank=True, null=True)
    accept_dated = models.DateTimeField(blank=True, null=True)
    refuse_dated = models.DateTimeField(blank=True, null=True)
    deleted_date = models.DateTimeField(blank=True, null=True)
    deleted_by = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'calendar_joins'
        unique_together = ('calendar', 'user_id')

    def save(self, *args, **kwargs):
        if self.accept_type is None and self.status is not None:
            self.accept_type = self.status
        if self.accept_type is not None:
            self.status = self.accept_type
        super().save(*args, **kwargs)


class CalendarFile(BaseModel):
    class FileType(models.IntegerChoices):
        SYSTEM = 0, 'Hệ thống'
        SHARE = 1, 'Chia sẻ'

    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='files')
    file_name = models.CharField(max_length=500, blank=True, null=True)
    file = models.CharField(max_length=1000, blank=True, null=True)
    extension = models.CharField(max_length=50, blank=True, null=True)
    size = models.FloatField(blank=True, null=True)
    type = models.IntegerField(choices=FileType.choices, blank=True, null=True)

    class Meta:
        db_table = 'calendar_files'


class CalendarJob(models.Model):
    class Status(models.IntegerChoices):
        ACTIVE = 0, 'Active'
        CANCELED = 1, 'Canceled'
        FINISHED = 2, 'Finished'

    class JobType(models.IntegerChoices):
        AUTO_REJECT_UNCONFIRMED_USERS = 0, 'Tự động từ chối'
        LOCK_EVENT_AFTER_END_DATE = 1, 'Khóa sau ngày kết thúc'
        NOTIFY_UPCOMING_EVENTS = 2, 'Thông báo sắp đến'
        NOTIFY_START_EVENTS = 3, 'Thông báo bắt đầu'
        LOCK_EVENT_AFTER_FINISH = 4, 'Khóa sau khi kết thúc'

    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='jobs')
    job_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    deadline = models.DateTimeField()
    created_date = models.DateTimeField(auto_now_add=True)
    status = models.IntegerField(choices=Status.choices, default=Status.ACTIVE)
    type = models.IntegerField(choices=JobType.choices, default=JobType.NOTIFY_UPCOMING_EVENTS)

    class Meta:
        db_table = 'calendar_jobs'
