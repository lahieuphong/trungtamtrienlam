from django.contrib import admin
from .models import Chat, ChatMember, ChatMessage, ChatNote, ChatVote


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['name', 'chat_type', 'created_at']
    list_filter = ['chat_type']
