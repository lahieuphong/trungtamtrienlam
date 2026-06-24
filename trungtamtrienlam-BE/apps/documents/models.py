from django.db import models
from core.models import BaseModel


class Document(BaseModel):
    class Status(models.IntegerChoices):
        DRAFT = 0, 'Nháp'
        PENDING = 1, 'Chờ duyệt'
        APPROVED = 2, 'Đã duyệt'
        REJECTED = 3, 'Từ chối'
        PUBLISHED = 4, 'Đã ban hành'
        ARCHIVED = 5, 'Lưu trữ'

    class DocumentType(models.IntegerChoices):
        INCOMING = 0, 'Văn bản đến'
        OUTGOING = 1, 'Văn bản đi'
        INTERNAL = 2, 'Văn bản nội bộ'

    title = models.CharField(max_length=500)
    number = models.CharField(max_length=100, blank=True, null=True)
    document_type = models.IntegerField(choices=DocumentType.choices, default=DocumentType.INTERNAL, db_index=True)
    status = models.IntegerField(choices=Status.choices, default=Status.DRAFT, db_index=True)
    content = models.TextField(blank=True, null=True)
    issued_by = models.CharField(max_length=255, blank=True, null=True)
    issued_date = models.DateField(blank=True, null=True)
    department_id = models.UUIDField(blank=True, null=True, db_index=True)
    urgency_level = models.IntegerField(default=0)
    security_level = models.IntegerField(default=0)

    class Meta:
        db_table = 'documents'
        verbose_name = 'Văn bản'
        verbose_name_plural = 'Văn bản'


class DocumentFile(BaseModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='files')
    file_path = models.TextField()
    file_name = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'document_files'
