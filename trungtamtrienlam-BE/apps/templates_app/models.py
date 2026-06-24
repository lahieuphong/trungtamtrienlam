from django.db import models
from core.models import BaseModel


class Template(BaseModel):
    class TemplateType(models.IntegerChoices):
        DOCUMENT = 0, 'Mẫu văn bản'
        FORM = 1, 'Biểu mẫu'
        WORD_PROCESSING = 2, 'Xử lý văn bản'

    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    template_type = models.IntegerField(choices=TemplateType.choices, default=TemplateType.DOCUMENT)
    file_path = models.TextField(blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    department_id = models.UUIDField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'templates'
        verbose_name = 'Mẫu biểu'
