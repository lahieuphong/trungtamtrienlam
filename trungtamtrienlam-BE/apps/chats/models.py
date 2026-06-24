from django.db import models
from core.models import BaseModel


class Chat(BaseModel):
    class ChatType(models.IntegerChoices):
        DIRECT = 0, 'Tin nhắn riêng'
        GROUP = 1, 'Nhóm'

    name = models.CharField(max_length=500, blank=True, null=True)
    chat_type = models.IntegerField(choices=ChatType.choices, default=ChatType.DIRECT)
    avatar = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'chats'
        verbose_name = 'Cuộc trò chuyện'
        verbose_name_plural = 'Cuộc trò chuyện'


class ChatMember(BaseModel):
    class MemberRole(models.IntegerChoices):
        MEMBER = 0, 'Thành viên'
        ADMIN = 1, 'Quản trị viên'

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='members')
    user_id = models.UUIDField(db_index=True)
    role = models.IntegerField(choices=MemberRole.choices, default=MemberRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_members'
        unique_together = ('chat', 'user_id')


class ChatMessage(BaseModel):
    class MessageType(models.IntegerChoices):
        TEXT = 0, 'Văn bản'
        FILE = 1, 'Tệp tin'
        IMAGE = 2, 'Hình ảnh'
        VOICE = 3, 'Ghi âm'
        SYSTEM = 4, 'Hệ thống'

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    user_id = models.UUIDField(db_index=True)
    content = models.TextField(blank=True, null=True)
    message_type = models.IntegerField(choices=MessageType.choices, default=MessageType.TEXT)
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
