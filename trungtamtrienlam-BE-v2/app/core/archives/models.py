from django.db import models
from core.models import BaseModel


class Archive(BaseModel):
    name = models.CharField(max_length=500)
    code = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    parent_id = models.UUIDField(blank=True, null=True, db_index=True)
    department_id = models.UUIDField(blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'archives'
        verbose_name = 'Hồ sơ lưu trữ'
        verbose_name_plural = 'Hồ sơ lưu trữ'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name
