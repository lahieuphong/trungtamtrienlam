"""Managed chat note models."""

from django.db import models

from apps.chats.models import ManagedChat
from apps.chats.models import managed_chat_id_generator


class ManagedChatNote(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat = models.ForeignKey(
        ManagedChat,
        on_delete=models.CASCADE,
        related_name='chat_notes',
        db_column='chat_id',
        blank=True,
        null=True,
    )
    note = models.TextField(blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(blank=True, null=True)
    is_pinned = models.BooleanField(blank=True, null=True)
    pin_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_notes'
        ordering = ('-is_pinned', '-pin_date', '-created_date', 'id')
        verbose_name = 'Managed chat note'
        verbose_name_plural = 'Managed chat notes'

    def __str__(self):  # pragma: nocover
        return self.note or self.id


__all__ = [
    'ManagedChatNote',
    'managed_chat_id_generator',
]

