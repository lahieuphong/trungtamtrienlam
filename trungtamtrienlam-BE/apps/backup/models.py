from django.db import models
from core.models import BaseModel


class BackupLog(BaseModel):
    class BackupType(models.IntegerChoices):
        AUTO = 0, 'Tự động'
        MANUAL = 1, 'Thủ công'

    class PathType(models.IntegerChoices):
        LOCAL = 0, 'Lưu cục bộ'
        CLOUD = 1, 'Lưu đám mây'

    class Status(models.IntegerChoices):
        SUCCESS = 0, 'Thành công'
        FAILED = 1, 'Thất bại'
        IN_PROGRESS = 2, 'Đang thực hiện'

    title = models.CharField(max_length=500)
    backup_type = models.IntegerField(choices=BackupType.choices, default=BackupType.MANUAL)
    path_type = models.IntegerField(choices=PathType.choices, default=PathType.LOCAL)
    path = models.TextField()
    database_name = models.CharField(max_length=255)
    server = models.CharField(max_length=100, blank=True, null=True)
    size_kb = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.IntegerField(choices=Status.choices, default=Status.IN_PROGRESS)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'backup_logs'
        verbose_name = 'Nhật ký sao lưu'
        ordering = ['-created_at']


class RestoreLog(BaseModel):
    class Status(models.IntegerChoices):
        SUCCESS = 0, 'Thành công'
        FAILED = 1, 'Thất bại'
        IN_PROGRESS = 2, 'Đang thực hiện'

    title = models.CharField(max_length=500)
    backup = models.ForeignKey(BackupLog, on_delete=models.SET_NULL, null=True)
    path_type = models.IntegerField(default=0)
    path = models.TextField()
    database_name = models.CharField(max_length=255)
    server = models.CharField(max_length=100, blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.IN_PROGRESS)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'restore_logs'
        verbose_name = 'Nhật ký phục hồi'
        ordering = ['-created_at']
