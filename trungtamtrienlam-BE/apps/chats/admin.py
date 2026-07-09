from django.contrib import admin

from .models import ManagedChat
from .models import ManagedChatAwaitConfirm
from .models import ManagedChatFile
from .models import ManagedChatLink
from .models import ManagedChatMessage
from .models import ManagedChatPin
from .models import ManagedChatSeen
from .models import ManagedChatUser


CHAT_TYPE_LABELS = {
    1: 'Cá nhân',
    2: 'Nhóm',
}

MESSAGE_TYPE_LABELS = {
    1: 'Tin nhắn',
    2: 'Ảnh/Video',
    3: 'Liên kết',
    4: 'Tệp tin',
    5: 'Sự kiện',
    6: 'Đã thu hồi',
    7: 'Ghim',
    8: 'Bỏ ghim',
}


class ReadOnlyChatAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


def shorten(value, limit=80):
    text = str(value or '')
    if len(text) <= limit:
        return text
    return f'{text[:limit - 3]}...'


@admin.register(ManagedChat)
class ManagedChatAdmin(ReadOnlyChatAdmin):
    list_display = (
        'display_name',
        'id',
        'chat_type_label',
        'member_count',
        'message_type_label',
        'is_ai',
        'is_deleted',
        'updated_date',
    )
    list_filter = ('type', 'message_type', 'is_ai', 'is_deleted', 'updated_date')
    search_fields = ('id', 'name', 'created_by', 'updated_by', 'user_id', 'link_id')
    ordering = ('-updated_date', '-created_date')

    @admin.display(description='Tên cuộc trò chuyện', ordering='name')
    def display_name(self, obj):
        return obj.name or '(Cuộc trò chuyện cá nhân)'

    @admin.display(description='Loại', ordering='type')
    def chat_type_label(self, obj):
        return CHAT_TYPE_LABELS.get(obj.type, obj.type)

    @admin.display(description='Loại tin cuối', ordering='message_type')
    def message_type_label(self, obj):
        return MESSAGE_TYPE_LABELS.get(obj.message_type, obj.message_type)

    @admin.display(description='Thành viên')
    def member_count(self, obj):
        return ManagedChatUser.objects.filter(chat_id=obj.id).count()


@admin.register(ManagedChatUser)
class ManagedChatUserAdmin(ReadOnlyChatAdmin):
    list_display = ('id', 'chat_id', 'user_id', 'role', 'is_muted', 'created_date')
    list_filter = ('role', 'is_muted', 'created_date')
    search_fields = ('id', 'chat_id', 'user_id', 'add_by')
    ordering = ('chat_id', 'role', 'created_date')


@admin.register(ManagedChatMessage)
class ManagedChatMessageAdmin(ReadOnlyChatAdmin):
    list_display = (
        'id',
        'chat_id',
        'sender_id',
        'content_preview',
        'message_type_label',
        'is_pin',
        'is_deleted',
        'is_unsend',
        'created_date',
    )
    list_filter = ('message_type', 'is_pin', 'is_deleted', 'is_unsend', 'created_date')
    search_fields = ('id', 'chat_id', 'sender_id', 'content', 'reply_to_id', 'event_id')
    ordering = ('-created_date',)

    @admin.display(description='Nội dung')
    def content_preview(self, obj):
        return shorten(obj.content)

    @admin.display(description='Loại tin', ordering='message_type')
    def message_type_label(self, obj):
        return MESSAGE_TYPE_LABELS.get(obj.message_type, obj.message_type)


@admin.register(ManagedChatFile)
class ManagedChatFileAdmin(ReadOnlyChatAdmin):
    list_display = ('id', 'chat_id', 'message_id', 'file_name', 'extension', 'size', 'created_by', 'created_date')
    list_filter = ('extension', 'created_date')
    search_fields = ('id', 'chat_id', 'message_id', 'file', 'file_name', 'created_by')
    ordering = ('-created_date',)


@admin.register(ManagedChatLink)
class ManagedChatLinkAdmin(ReadOnlyChatAdmin):
    list_display = ('id', 'chat_id', 'message_id', 'link_preview', 'created_by', 'created_date')
    list_filter = ('created_date',)
    search_fields = ('id', 'chat_id', 'message_id', 'link', 'created_by')
    ordering = ('-created_date',)

    @admin.display(description='Liên kết')
    def link_preview(self, obj):
        return shorten(obj.link, 100)


@admin.register(ManagedChatSeen)
class ManagedChatSeenAdmin(ReadOnlyChatAdmin):
    list_display = ('id', 'chat_id', 'chat_message_id', 'user_id', 'seen_date')
    list_filter = ('seen_date',)
    search_fields = ('id', 'chat_id', 'chat_message_id', 'user_id')
    ordering = ('chat_id', 'user_id')


@admin.register(ManagedChatPin)
class ManagedChatPinAdmin(ReadOnlyChatAdmin):
    list_display = ('id', 'chat_id', 'user_id', 'pin_date')
    list_filter = ('pin_date',)
    search_fields = ('id', 'chat_id', 'user_id')
    ordering = ('-pin_date',)


@admin.register(ManagedChatAwaitConfirm)
class ManagedChatAwaitConfirmAdmin(ReadOnlyChatAdmin):
    list_display = ('id', 'chat_id', 'user_id', 'status', 'created_by', 'confirmed_by', 'created_date', 'confirmed_date')
    list_filter = ('status', 'created_date', 'confirmed_date')
    search_fields = ('id', 'chat_id', 'user_id', 'created_by', 'confirmed_by')
    ordering = ('-created_date',)
