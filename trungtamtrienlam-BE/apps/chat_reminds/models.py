"""Chat remind models."""

from django.db import models

from apps.chats.models import ManagedChat
from apps.chats.models import managed_chat_id_generator


class ManagedChatRemind(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    remind_name = models.CharField(max_length=255, blank=True, null=True)
    remind_content = models.TextField(blank=True, null=True)
    chat = models.ForeignKey(
        ManagedChat,
        on_delete=models.CASCADE,
        related_name='chat_reminds',
        db_column='chat_id',
        blank=True,
        null=True,
    )
    remind_time = models.DateTimeField(blank=True, null=True)
    repeat_type = models.IntegerField(blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(blank=True, null=True)
    modified_date = models.DateTimeField(blank=True, null=True)
    count_join = models.IntegerField(blank=True, null=True)
    count_not_join = models.IntegerField(blank=True, null=True)
    user_join = models.TextField(blank=True, null=True)
    user_not_join = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_reminds'
        ordering = ('-remind_time', '-created_date', 'id')
        verbose_name = 'Managed chat remind'
        verbose_name_plural = 'Managed chat reminds'

    def __str__(self):  # pragma: nocover
        return self.remind_name or self.id


class ManagedChatRemindJob(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_remind = models.ForeignKey(
        ManagedChatRemind,
        on_delete=models.CASCADE,
        related_name='jobs',
        db_column='chat_remind_id',
        blank=True,
        null=True,
    )
    job_id = models.CharField(max_length=255, blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    status = models.IntegerField(blank=True, null=True)
    type = models.IntegerField(blank=True, null=True)
    time = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_remind_jobs'
        ordering = ('time', 'id')
        verbose_name = 'Managed chat remind job'
        verbose_name_plural = 'Managed chat remind jobs'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_remind_id}:{self.job_id}'


class ManagedChatRemindUser(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat = models.ForeignKey(
        ManagedChat,
        on_delete=models.CASCADE,
        related_name='chat_remind_users',
        db_column='chat_id',
        blank=True,
        null=True,
    )
    chat_remind = models.ForeignKey(
        ManagedChatRemind,
        on_delete=models.CASCADE,
        related_name='users',
        db_column='chat_remind_id',
        blank=True,
        null=True,
    )
    user_id = models.CharField(max_length=64, blank=True, null=True)
    type = models.BooleanField(blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_remind_users'
        ordering = ('created_date', 'id')
        verbose_name = 'Managed chat remind user'
        verbose_name_plural = 'Managed chat remind users'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_remind_id}:{self.user_id}'


__all__ = [
    'ManagedChatRemind',
    'ManagedChatRemindJob',
    'ManagedChatRemindUser',
    'managed_chat_id_generator',
]

