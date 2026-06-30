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

    title = models.CharField('Tiêu đề', max_length=500)
    description = models.TextField('Mô tả', blank=True, null=True)
    location = models.CharField('Địa điểm', max_length=500, blank=True, null=True)
    start_time = models.DateTimeField('Thời gian bắt đầu', db_index=True)
    end_time = models.DateTimeField('Thời gian kết thúc')
    calendar_type = models.IntegerField('Loại lịch', choices=CalendarType.choices, default=CalendarType.MEETING)
    status = models.IntegerField('Trạng thái', choices=Status.choices, default=Status.PENDING)
    department_id = models.UUIDField('Phòng ban', blank=True, null=True)
    is_all_day = models.BooleanField('Cả ngày', default=False)
    color = models.CharField('Màu sắc', max_length=20, blank=True, null=True)

    # Bộ trường tương thích với cấu trúc lịch của bản 185.
    name = models.CharField('Tên lịch', max_length=500, blank=True, null=True, db_index=True)
    type = models.IntegerField('Loại sự kiện', choices=EventType.choices, blank=True, null=True, db_index=True)
    from_time = models.DateTimeField('Bắt đầu', blank=True, null=True, db_index=True)
    to_time = models.DateTimeField('Kết thúc', blank=True, null=True, db_index=True)
    link = models.CharField('Đường dẫn', max_length=1000, blank=True, null=True)
    place = models.CharField('Địa điểm', max_length=500, blank=True, null=True)
    join_type = models.IntegerField('Phạm vi tham gia', choices=JoinType.choices, blank=True, null=True, db_index=True)
    deleted_date = models.DateTimeField('Ngày xóa', blank=True, null=True)
    deleted_by = models.CharField('Người xóa', max_length=255, blank=True, null=True)
    is_locked = models.BooleanField('Đã khóa', default=False)
    is_canceled = models.BooleanField('Đã hủy', default=False)
    cancel_reason = models.TextField('Lý do hủy', blank=True, null=True)
    cancel_undo_date = models.DateTimeField('Ngày khôi phục hủy', blank=True, null=True)

    class Meta:
        db_table = 'calendars'
        verbose_name = 'Lịch'
        verbose_name_plural = 'Lịch'

    def __str__(self):
        return self.name or self.title or str(self.id)

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

    calendar = models.ForeignKey(Calendar, verbose_name='Lịch', on_delete=models.CASCADE, related_name='participants')
    user_id = models.UUIDField('Người dùng', blank=True, null=True, db_index=True)
    status = models.IntegerField('Trạng thái', choices=JoinStatus.choices, default=JoinStatus.PENDING)
    department_id = models.CharField('Phòng ban', max_length=255, blank=True, null=True)
    accept_type = models.IntegerField('Trạng thái tham gia', choices=JoinStatus.choices, default=JoinStatus.PENDING)
    refuse_content = models.TextField('Nội dung từ chối', blank=True, null=True)
    accept_dated = models.DateTimeField('Ngày chấp nhận', blank=True, null=True)
    refuse_dated = models.DateTimeField('Ngày từ chối', blank=True, null=True)
    deleted_date = models.DateTimeField('Ngày xóa', blank=True, null=True)
    deleted_by = models.CharField('Người xóa', max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'calendar_joins'
        unique_together = ('calendar', 'user_id')
        verbose_name = 'Người tham gia lịch'
        verbose_name_plural = 'Người tham gia lịch'

    def __str__(self):
        return f'{self.calendar} - {self.user_id or self.department_id or "Người tham gia"}'

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

    calendar = models.ForeignKey(Calendar, verbose_name='Lịch', on_delete=models.CASCADE, related_name='files')
    file_name = models.CharField('Tên tệp', max_length=500, blank=True, null=True)
    file = models.CharField('Tệp', max_length=1000, blank=True, null=True)
    extension = models.CharField('Định dạng', max_length=50, blank=True, null=True)
    size = models.FloatField('Dung lượng', blank=True, null=True)
    type = models.IntegerField('Loại tệp', choices=FileType.choices, blank=True, null=True)

    class Meta:
        db_table = 'calendar_files'
        verbose_name = 'Tệp đính kèm lịch'
        verbose_name_plural = 'Tệp đính kèm lịch'

    def __str__(self):
        return self.file_name or self.file or str(self.id)


class CalendarJob(models.Model):
    class Status(models.IntegerChoices):
        ACTIVE = 0, 'Đang hoạt động'
        CANCELED = 1, 'Đã hủy'
        FINISHED = 2, 'Hoàn thành'

    class JobType(models.IntegerChoices):
        AUTO_REJECT_UNCONFIRMED_USERS = 0, 'Tự động từ chối người chưa xác nhận'
        LOCK_EVENT_AFTER_END_DATE = 1, 'Khóa lịch sau ngày kết thúc'
        NOTIFY_UPCOMING_EVENTS = 2, 'Thông báo lịch sắp đến'
        NOTIFY_START_EVENTS = 3, 'Thông báo lịch bắt đầu'
        LOCK_EVENT_AFTER_FINISH = 4, 'Khóa lịch sau khi kết thúc'

    calendar = models.ForeignKey(Calendar, verbose_name='Lịch', on_delete=models.CASCADE, related_name='jobs')
    job_id = models.CharField('Mã tác vụ', max_length=255, blank=True, null=True, db_index=True)
    deadline = models.DateTimeField('Hạn xử lý')
    created_date = models.DateTimeField('Ngày tạo', auto_now_add=True)
    status = models.IntegerField('Trạng thái', choices=Status.choices, default=Status.ACTIVE)
    type = models.IntegerField('Loại tác vụ', choices=JobType.choices, default=JobType.NOTIFY_UPCOMING_EVENTS)

    class Meta:
        db_table = 'calendar_jobs'
        verbose_name = 'Tác vụ lịch'
        verbose_name_plural = 'Tác vụ lịch'

    def __str__(self):
        return self.job_id or f'Tác vụ lịch #{self.pk}'
