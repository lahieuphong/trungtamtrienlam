import os
import uuid

from django.conf import settings
from django.db import models

from core.models import BaseModel


def monument_upload_to(instance, filename):
    _, extension = os.path.splitext(filename or '')
    safe_name = f'{uuid.uuid4()}{extension.lower()}'
    monument_id = instance.monument_id or 'pending'
    return f'monuments/{monument_id}/{instance.mode}/{safe_name}'


def monument_section_upload_to(instance, filename):
    _, extension = os.path.splitext(filename or '')
    safe_name = f'{uuid.uuid4()}{extension.lower()}'
    monument_id = instance.monument_id or 'pending'
    return f'monuments/{monument_id}/sections/{safe_name}'


class Monument(BaseModel):
    class Status(models.IntegerChoices):
        DRAFT = 0, 'Soạn thảo'
        PENDING_APPROVAL = 1, 'Chờ duyệt'
        APPROVED = 2, 'Đã duyệt'
        NOT_APPROVED = 3, 'Không duyệt'
        REDO = 4, 'Trả lại'
        PUBLISHED = 5, 'Đã xuất bản'

    class ProfileType(models.IntegerChoices):
        PUBLIC = 0, 'Công khai'
        PRIVATE = 1, 'Không công khai'

    class Level(models.IntegerChoices):
        SPECIAL_NATIONAL = 0, 'Cấp quốc gia đặc biệt'
        NATIONAL = 1, 'Cấp quốc gia'
        CITY = 2, 'Cấp thành phố'

    class PriorityMode(models.IntegerChoices):
        ALWAYS = 0, 'Luôn ưu tiên'
        BY_POST_DATE = 1, 'Xuất hiện theo ngày đăng'
        HIDDEN = 2, 'Ẩn'

    name = models.CharField(max_length=500)
    recognition_decision = models.CharField(max_length=500)
    address = models.TextField()
    description = models.TextField(blank=True, null=True)
    year_of_construction = models.CharField(max_length=100)
    rating = models.CharField(max_length=20)
    location = models.CharField(max_length=500)
    type_of_monument = models.IntegerField(choices=Level.choices, default=Level.SPECIAL_NATIONAL)
    priority_mode = models.IntegerField(choices=PriorityMode.choices, default=PriorityMode.ALWAYS)
    status = models.IntegerField(choices=Status.choices, default=Status.DRAFT, db_index=True)
    type = models.IntegerField(choices=ProfileType.choices, default=ProfileType.PUBLIC)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='monuments')
    pending_level = models.IntegerField(blank=True, null=True, db_index=True)
    reason = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    published_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'monuments'
        verbose_name = 'Hồ sơ di tích'
        verbose_name_plural = 'Hồ sơ di tích'

    def __str__(self):
        return self.name


class MonumentSection(BaseModel):
    class SectionType(models.IntegerChoices):
        IMAGE = 0, '1 Đối tượng: Hình ảnh'
        IMAGE_CONTENT = 1, '2 Đối tượng: Hình ảnh - Đoạn văn'
        CONTENT = 2, '1 Đối tượng: Đoạn văn'
        CONTENT_IMAGE = 3, '2 Đối tượng: Đoạn văn - Hình ảnh'

    monument = models.ForeignKey(Monument, on_delete=models.CASCADE, related_name='sections')
    content = models.TextField(blank=True, null=True)
    type = models.IntegerField(choices=SectionType.choices, default=SectionType.IMAGE)
    order = models.IntegerField(default=1)
    file = models.FileField(upload_to=monument_section_upload_to, blank=True, null=True)
    file_name = models.CharField(max_length=500, blank=True, null=True)
    file_size = models.BigIntegerField(default=0)
    file_extension = models.CharField(max_length=20, blank=True, null=True)
    file_type = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = 'monument_sections'
        ordering = ['order', 'created_at']
        verbose_name = 'Nội dung di tích'
        verbose_name_plural = 'Nội dung di tích'


class MonumentFile(BaseModel):
    class Mode(models.IntegerChoices):
        IMAGE_AVATAR = 0, 'Hình đại diện'
        IMAGE_AVATAR_2 = 1, 'Hình đại diện không công khai'
        IMAGE_OBJECT = 2, 'Hình ảnh hiện vật'
        IMAGE_DETAIL = 3, 'Hình ảnh chi tiết'
        FILE_VIDEO = 4, 'Video'
        FILE_MODEL_3D = 5, 'Định dạng 3D'
        FILE_STRUCTURE = 6, 'Kiến trúc'
        IMAGE_TECH = 7, 'Hình ảnh bản vẽ kỹ thuật'
        FILE_MAP = 8, 'Bản đồ khoanh vùng'
        FILE_RECOGNITION_DECISION = 9, 'Quyết định công nhận'
        FILE_RATING = 10, 'Xếp hạng'

    class FileType(models.IntegerChoices):
        IMAGE = 0, 'Hình ảnh'
        SOUND = 1, 'Âm thanh'
        VIDEO = 2, 'Video'
        DOCUMENT = 3, 'Tài liệu'
        THREE_D = 4, 'Mô hình 3D'
        OTHER = 5, 'Khác'

    monument = models.ForeignKey(Monument, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to=monument_upload_to)
    file_name = models.CharField(max_length=500)
    size = models.BigIntegerField(default=0)
    extension = models.CharField(max_length=20, blank=True, null=True)
    type = models.IntegerField(choices=FileType.choices, default=FileType.OTHER)
    mode = models.IntegerField(choices=Mode.choices)

    class Meta:
        db_table = 'monument_files'
        verbose_name = 'Tệp hồ sơ di tích'
        verbose_name_plural = 'Tệp hồ sơ di tích'


class MonumentHistory(BaseModel):
    class Status(models.IntegerChoices):
        REQUESTED = 0, 'Trình duyệt'
        VERIFIED = 1, 'Duyệt'
        REFUSED = 2, 'Không duyệt'
        REDO = 3, 'Trả lại'
        PUBLISHED = 4, 'Đẩy lên website'

    monument = models.ForeignKey(Monument, on_delete=models.CASCADE, related_name='histories')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='monument_history_requests',
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='monument_history_confirms',
    )
    requested_date = models.DateTimeField(blank=True, null=True)
    confirmed_date = models.DateTimeField(blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.REQUESTED)
    level = models.IntegerField(blank=True, null=True, db_index=True)
    reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'monument_histories'
        ordering = ['-created_at']
        verbose_name = 'Lịch sử hồ sơ di tích'
        verbose_name_plural = 'Lịch sử hồ sơ di tích'
