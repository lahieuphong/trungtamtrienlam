from django.db import models
from core.models import BaseModel


class Folder(BaseModel):
    name = models.CharField(max_length=500)
    parent_id = models.UUIDField(blank=True, null=True, db_index=True)
    is_private = models.BooleanField(default=False)
    department_id = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'folders'
        verbose_name = 'Thư mục'
        verbose_name_plural = 'Thư mục'

    def __str__(self):
        return self.name


class MediaFile(BaseModel):
    class FileType(models.IntegerChoices):
        IMAGE = 0, 'Hình ảnh'
        VIDEO = 1, 'Video'
        AUDIO = 2, 'Âm thanh'
        DOCUMENT = 3, 'Tài liệu'
        MODEL_3D = 4, 'Mô hình 3D'
        OTHER = 5, 'Khác'

    name = models.CharField(max_length=500)
    original_name = models.CharField(max_length=500)
    path = models.TextField()
    size = models.BigIntegerField(default=0)
    extension = models.CharField(max_length=20, blank=True, null=True)
    file_type = models.IntegerField(choices=FileType.choices, default=FileType.OTHER)
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, related_name='files')
    is_private = models.BooleanField(default=False)
    is_trashed = models.BooleanField(default=False)

    class Meta:
        db_table = 'media_files'
        verbose_name = 'Tệp tin'
        verbose_name_plural = 'Tệp tin'
