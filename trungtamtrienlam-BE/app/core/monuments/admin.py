from django.contrib import admin

from .models import Monument, MonumentFile, MonumentHistory, MonumentSection


class MonumentFileInline(admin.TabularInline):
    model = MonumentFile
    extra = 0


class MonumentSectionInline(admin.TabularInline):
    model = MonumentSection
    extra = 0


class MonumentHistoryInline(admin.TabularInline):
    model = MonumentHistory
    extra = 0


@admin.register(Monument)
class MonumentAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'pending_level_display', 'type', 'user', 'created_at')
    list_filter = ('status', 'pending_level', 'type', 'type_of_monument')
    search_fields = ('name', 'address', 'recognition_decision')
    inlines = (MonumentSectionInline, MonumentFileInline, MonumentHistoryInline)

    @admin.display(ordering='pending_level', description='Pending level')
    def pending_level_display(self, obj):
        if obj.pending_level == 3:
            return '3 - Trưởng phòng'
        if obj.pending_level == 2:
            return '2 - Phó giám đốc'
        if obj.pending_level == 1:
            return '1 - Giám đốc'
        return 'Không chờ duyệt'


@admin.register(MonumentFile)
class MonumentFileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'monument', 'mode', 'extension', 'created_at')
    list_filter = ('mode', 'type')


@admin.register(MonumentSection)
class MonumentSectionAdmin(admin.ModelAdmin):
    list_display = ('monument', 'type', 'order', 'file_name')
    list_filter = ('type',)


@admin.register(MonumentHistory)
class MonumentHistoryAdmin(admin.ModelAdmin):
    list_display = ('monument', 'status', 'level', 'requested_by', 'confirmed_by', 'created_at')
    list_filter = ('status', 'level')
