import uuid

from django.db import models

from core.models import BaseModel


def managed_chat_id_generator():
    return str(uuid.uuid4())


# Existing chat models are kept so the original 0001 migration/state remains non-destructive.
class Chat(BaseModel):
    CHAT_TYPE_CHOICES = (
        (0, 'Tin nhắn riêng'),
        (1, 'Nhóm'),
    )

    name = models.CharField(max_length=500, blank=True, null=True)
    chat_type = models.IntegerField(choices=CHAT_TYPE_CHOICES, default=0)
    avatar = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'chats'
        verbose_name = 'Cuộc trò chuyện'


class ChatMember(BaseModel):
    MEMBER_ROLE_CHOICES = (
        (0, 'Thành viên'),
        (1, 'Quản trị viên'),
    )

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='members')
    user_id = models.UUIDField(db_index=True)
    role = models.IntegerField(choices=MEMBER_ROLE_CHOICES, default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_members'
        unique_together = ('chat', 'user_id')


class ChatMessage(BaseModel):
    MESSAGE_TYPE_CHOICES = (
        (0, 'Văn bản'),
        (1, 'Tệp tin'),
        (2, 'Hình ảnh'),
        (3, 'Ghi âm'),
        (4, 'Hệ thống'),
    )

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    user_id = models.UUIDField(db_index=True)
    content = models.TextField(blank=True, null=True)
    message_type = models.IntegerField(choices=MESSAGE_TYPE_CHOICES, default=0)
    reply_to_id = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']


class ChatNote(BaseModel):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='notes')
    user_id = models.UUIDField()
    title = models.CharField(max_length=500)
    content = models.TextField()

    class Meta:
        db_table = 'chat_notes'


class ChatVote(BaseModel):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='votes')
    user_id = models.UUIDField()
    question = models.CharField(max_length=500)
    is_multiple = models.BooleanField(default=False)
    closed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'chat_votes'


class ChatVoteOption(models.Model):
    vote = models.ForeignKey(ChatVote, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=500)

    class Meta:
        db_table = 'chat_vote_options'


class ChatVoteResult(models.Model):
    vote = models.ForeignKey(ChatVote, on_delete=models.CASCADE, related_name='results')
    option = models.ForeignKey(ChatVoteOption, on_delete=models.CASCADE)
    user_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_vote_results'
        unique_together = ('vote', 'user_id', 'option')


class ManagedChat(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    private_key = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
    )
    name = models.CharField(max_length=255, blank=True, default='')
    type = models.IntegerField(default=1)
    avatar = models.CharField(max_length=500, blank=True, default='')
    created_by = models.CharField(max_length=64, blank=True, default='')
    updated_by = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    is_ai = models.BooleanField(default=False)
    user_id = models.CharField(max_length=64, blank=True, default='')
    event_type = models.IntegerField(blank=True, null=True)
    pin_date = models.DateTimeField(blank=True, null=True)
    link_id = models.CharField(max_length=255, blank=True, default='')
    message_type = models.IntegerField(default=1)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'aidi_managed_chats'
        ordering = ('-updated_date', '-created_date')
        verbose_name = 'Cuộc trò chuyện'
        verbose_name_plural = 'Cuộc trò chuyện'

    def __str__(self):
        return self.name or self.id


class ManagedChatUser(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    user_id = models.CharField(max_length=64)
    role = models.IntegerField(default=3)
    add_by = models.CharField(max_length=64, blank=True, default='')
    is_muted = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_users'
        ordering = ('chat_id', 'role', 'created_date')
        unique_together = ('chat_id', 'user_id')
        verbose_name = 'Thành viên cuộc trò chuyện'
        verbose_name_plural = 'Thành viên cuộc trò chuyện'

    def __str__(self):
        return f'{self.chat_id}:{self.user_id}'


class ManagedChatMessage(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    sender_id = models.CharField(max_length=64)
    message_type = models.IntegerField(default=1)
    reply_to_id = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    is_unsend = models.BooleanField(default=False)
    content = models.TextField(blank=True, default='')
    chat_id = models.CharField(max_length=64)
    event_id = models.CharField(max_length=64, blank=True, default='')
    event_type = models.IntegerField(blank=True, null=True)
    is_pin = models.BooleanField(default=False)
    list_user_join_remind = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'aidi_managed_chat_messages'
        ordering = ('created_date',)
        verbose_name = 'Tin nhắn cuộc trò chuyện'
        verbose_name_plural = 'Tin nhắn cuộc trò chuyện'

    def __str__(self):
        return f'{self.chat_id}:{self.sender_id}:{self.created_date}'


class ManagedChatFile(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    message_id = models.CharField(max_length=64)
    file = models.CharField(max_length=500)
    file_name = models.CharField(max_length=255, blank=True, default='')
    size = models.FloatField(default=0)
    extension = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        db_table = 'aidi_managed_chat_files'
        ordering = ('created_date',)
        verbose_name = 'Tệp đính kèm tin nhắn'
        verbose_name_plural = 'Tệp đính kèm tin nhắn'

    def __str__(self):
        return self.file_name or self.file


class ManagedChatLink(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    message_id = models.CharField(max_length=64)
    link = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        db_table = 'aidi_managed_chat_links'
        ordering = ('created_date',)
        verbose_name = 'Liên kết tin nhắn'
        verbose_name_plural = 'Liên kết tin nhắn'

    def __str__(self):
        return self.link


class ManagedChatSeen(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    chat_message_id = models.CharField(max_length=64, blank=True, default='')
    user_id = models.CharField(max_length=64)
    seen_date = models.DateTimeField(auto_now=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_seen'
        ordering = ('chat_id', 'user_id')
        unique_together = ('chat_id', 'user_id')
        verbose_name = 'Lượt đọc tin nhắn'
        verbose_name_plural = 'Lượt đọc tin nhắn'

    def __str__(self):
        return f'{self.chat_id}:{self.user_id}'


class ManagedChatPin(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    user_id = models.CharField(max_length=64)
    pin_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_pins'
        ordering = ('-pin_date',)
        unique_together = ('chat_id', 'user_id')
        verbose_name = 'Ghim cuộc trò chuyện'
        verbose_name_plural = 'Ghim cuộc trò chuyện'

    def __str__(self):
        return f'{self.chat_id}:{self.user_id}'


class ManagedChatAwaitConfirm(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    user_id = models.CharField(max_length=64)
    status = models.IntegerField(default=1)
    created_by = models.CharField(max_length=64, blank=True, default='')
    confirmed_by = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    confirmed_date = models.DateTimeField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_await_confirms'
        ordering = ('-created_date',)
        verbose_name = 'Yêu cầu tham gia cuộc trò chuyện'
        verbose_name_plural = 'Yêu cầu tham gia cuộc trò chuyện'

    def __str__(self):
        return f'{self.chat_id}:{self.user_id}:{self.status}'


__all__ = [
    'Chat',
    'ChatMember',
    'ChatMessage',
    'ChatNote',
    'ChatVote',
    'ChatVoteOption',
    'ChatVoteResult',
    'ManagedChat',
    'ManagedChatUser',
    'ManagedChatMessage',
    'ManagedChatFile',
    'ManagedChatLink',
    'ManagedChatSeen',
    'ManagedChatPin',
    'ManagedChatAwaitConfirm',
    'managed_chat_id_generator',
]
