from django.contrib import admin

from .models import ManagedChatRemind
from .models import ManagedChatRemindJob
from .models import ManagedChatRemindUser


class ReadOnlyManagedChatRemindAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ManagedChatRemind)
class ManagedChatRemindAdmin(ReadOnlyManagedChatRemindAdmin):
    list_display = ('id', 'chat_id', 'remind_name', 'remind_time', 'repeat_type', 'count_join', 'count_not_join', 'is_deleted', 'created_date')
    list_filter = ('repeat_type', 'is_deleted', 'remind_time', 'created_date')
    search_fields = ('id', 'chat_id', 'remind_name', 'remind_content', 'created_by')
    ordering = ('-remind_time', '-created_date', 'id')


@admin.register(ManagedChatRemindJob)
class ManagedChatRemindJobAdmin(ReadOnlyManagedChatRemindAdmin):
    list_display = ('id', 'chat_remind_id', 'job_id', 'status', 'type', 'time', 'created_date')
    list_filter = ('status', 'type', 'time', 'created_date')
    search_fields = ('id', 'chat_remind_id', 'job_id')
    ordering = ('time', 'id')


@admin.register(ManagedChatRemindUser)
class ManagedChatRemindUserAdmin(ReadOnlyManagedChatRemindAdmin):
    list_display = ('id', 'chat_id', 'chat_remind_id', 'user_id', 'type', 'created_by', 'created_date', 'modified_date')
    list_filter = ('type', 'created_date', 'modified_date')
    search_fields = ('id', 'chat_id', 'chat_remind_id', 'user_id', 'created_by')
    ordering = ('created_date', 'id')
