"""Chat vote models."""

from django.db import models

from apps.chats.models import ManagedChat
from apps.chats.models import managed_chat_id_generator


class ManagedChatVote(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat = models.ForeignKey(
        ManagedChat,
        on_delete=models.CASCADE,
        related_name='chat_votes',
        db_column='chat_id',
        blank=True,
        null=True,
    )
    vote_name = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    date_end = models.DateTimeField(blank=True, null=True)
    is_multi = models.BooleanField(blank=True, null=True)
    remind_vote = models.BooleanField(blank=True, null=True)
    is_completed = models.BooleanField(blank=True, null=True)
    is_deleted = models.BooleanField(blank=True, null=True)
    is_pin = models.BooleanField(blank=True, null=True)
    pin_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_votes'
        ordering = ('-is_pin', '-pin_date', '-created_date', 'id')
        verbose_name = 'Managed chat vote'
        verbose_name_plural = 'Managed chat votes'

    def __str__(self):  # pragma: nocover
        return self.vote_name or self.id


class ManagedChatVoteOption(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    vote = models.ForeignKey(
        ManagedChatVote,
        on_delete=models.CASCADE,
        related_name='options',
        db_column='vote_id',
        blank=True,
        null=True,
    )
    option_name = models.CharField(max_length=255, blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    chat = models.ForeignKey(
        ManagedChat,
        on_delete=models.CASCADE,
        related_name='chat_vote_options',
        db_column='chat_id',
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'aidi_managed_chat_vote_options'
        ordering = ('created_date', 'id')
        verbose_name = 'Managed chat vote option'
        verbose_name_plural = 'Managed chat vote options'

    def __str__(self):  # pragma: nocover
        return self.option_name or self.id


class ManagedChatVoteResult(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    vote = models.ForeignKey(
        ManagedChatVote,
        on_delete=models.CASCADE,
        related_name='results',
        db_column='vote_id',
        blank=True,
        null=True,
    )
    option = models.ForeignKey(
        ManagedChatVoteOption,
        on_delete=models.CASCADE,
        related_name='results',
        db_column='option_id',
        blank=True,
        null=True,
    )
    user_id = models.CharField(max_length=64, blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    chat = models.ForeignKey(
        ManagedChat,
        on_delete=models.CASCADE,
        related_name='chat_vote_results',
        db_column='chat_id',
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'aidi_managed_chat_vote_results'
        ordering = ('created_date', 'id')
        verbose_name = 'Managed chat vote result'
        verbose_name_plural = 'Managed chat vote results'

    def __str__(self):  # pragma: nocover
        return f'{self.vote_id}:{self.user_id}:{self.option_id}'


__all__ = [
    'ManagedChatVote',
    'ManagedChatVoteOption',
    'ManagedChatVoteResult',
    'managed_chat_id_generator',
]

