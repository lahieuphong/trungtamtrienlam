import uuid
from django.db import models


class BaseModel(models.Model):
    """Abstract base model với các trường chung cho toàn bộ entities."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, blank=True, null=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def soft_delete(self, deleted_by=None):
        self.is_deleted = True
        if deleted_by:
            self.updated_by = str(deleted_by)
        self.save(update_fields=['is_deleted', 'updated_by', 'updated_at'])
