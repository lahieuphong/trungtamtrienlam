from django.contrib import admin
from .models import Calendar, CalendarJoin, CalendarFile, CalendarJob


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'join_type', 'from_time', 'to_time', 'is_canceled', 'is_locked']
    list_filter = ['type', 'join_type', 'is_canceled', 'is_locked']
    search_fields = ['name', 'title', 'description', 'place', 'location']


@admin.register(CalendarJoin)
class CalendarJoinAdmin(admin.ModelAdmin):
    list_display = ['calendar', 'user_id', 'department_id', 'accept_type', 'accept_dated', 'refuse_dated']
    list_filter = ['accept_type']
    search_fields = ['department_id', 'refuse_content']


@admin.register(CalendarFile)
class CalendarFileAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'calendar', 'extension', 'size', 'type']
    list_filter = ['type', 'extension']
    search_fields = ['file_name', 'file']


@admin.register(CalendarJob)
class CalendarJobAdmin(admin.ModelAdmin):
    list_display = ['calendar', 'job_id', 'deadline', 'status', 'type', 'created_date']
    list_filter = ['status', 'type']
    search_fields = ['job_id']
