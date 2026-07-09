from django.contrib import admin

from .models import ManagedChatVote
from .models import ManagedChatVoteOption
from .models import ManagedChatVoteResult


class ReadOnlyManagedChatVoteAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ManagedChatVote)
class ManagedChatVoteAdmin(ReadOnlyManagedChatVoteAdmin):
    list_display = ('id', 'chat_id', 'vote_name', 'created_by', 'is_multi', 'is_completed', 'is_deleted', 'is_pin', 'created_date')
    list_filter = ('is_multi', 'is_completed', 'is_deleted', 'is_pin', 'created_date', 'date_end')
    search_fields = ('id', 'chat_id', 'vote_name', 'created_by')
    ordering = ('-is_pin', '-pin_date', '-created_date', 'id')


@admin.register(ManagedChatVoteOption)
class ManagedChatVoteOptionAdmin(ReadOnlyManagedChatVoteAdmin):
    list_display = ('id', 'vote_id', 'chat_id', 'option_name', 'created_by', 'created_date')
    list_filter = ('created_date',)
    search_fields = ('id', 'vote_id', 'chat_id', 'option_name', 'created_by')
    ordering = ('created_date', 'id')


@admin.register(ManagedChatVoteResult)
class ManagedChatVoteResultAdmin(ReadOnlyManagedChatVoteAdmin):
    list_display = ('id', 'vote_id', 'option_id', 'chat_id', 'user_id', 'created_by', 'created_date')
    list_filter = ('created_date',)
    search_fields = ('id', 'vote_id', 'option_id', 'chat_id', 'user_id', 'created_by')
    ordering = ('created_date', 'id')
