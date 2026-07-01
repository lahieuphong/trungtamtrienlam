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
    list_display = ('name', 'status', 'pending_level', 'type', 'user', 'created_at')
    list_filter = ('status', 'pending_level', 'type', 'type_of_monument')
    search_fields = ('name', 'address', 'recognition_decision')
    inlines = (MonumentSectionInline, MonumentFileInline, MonumentHistoryInline)


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
