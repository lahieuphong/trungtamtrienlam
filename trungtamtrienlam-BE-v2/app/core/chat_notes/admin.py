from django.contrib import admin

from .models import ManagedChatNote


class ReadOnlyManagedChatNoteAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ManagedChatNote)
class ManagedChatNoteAdmin(ReadOnlyManagedChatNoteAdmin):
    list_display = ('id', 'chat_id', 'note_preview', 'created_by', 'is_pinned', 'is_deleted', 'created_date', 'pin_date')
    list_filter = ('is_pinned', 'is_deleted', 'created_date', 'pin_date')
    search_fields = ('id', 'chat_id', 'note', 'created_by')
    ordering = ('-is_pinned', '-pin_date', '-created_date', 'id')

    @admin.display(description='Ghi chú')
    def note_preview(self, obj):
        text = str(obj.note or '')
        return text if len(text) <= 80 else f'{text[:77]}...'
