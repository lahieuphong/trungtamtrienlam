from django.contrib import admin
from .models import Calendar, CalendarJoin, CalendarFile, CalendarJob


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'join_type', 'from_time', 'to_time', 'is_canceled', 'is_locked']
    list_filter = ['type', 'join_type', 'is_canceled', 'is_locked']
    search_fields = ['id', 'name', 'title', 'description', 'place', 'location']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(CalendarJoin)
class CalendarJoinAdmin(admin.ModelAdmin):
    list_display = ['id', 'calendar_id_display', 'user_id', 'department_id', 'accept_type', 'accept_dated', 'refuse_dated']
    list_filter = ['accept_type']
    search_fields = ['id', 'calendar__id', 'user_id', 'department_id', 'refuse_content']
    readonly_fields = ['id', 'created_at', 'updated_at']

    @admin.display(description='Mã lịch')
    def calendar_id_display(self, obj):
        return obj.calendar_id


@admin.register(CalendarFile)
class CalendarFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'calendar_id_display', 'file_name', 'extension', 'size', 'type']
    list_filter = ['type', 'extension']
    search_fields = ['id', 'calendar__id', 'file_name', 'file']
    readonly_fields = ['id', 'created_at', 'updated_at']

    @admin.display(description='Mã lịch')
    def calendar_id_display(self, obj):
        return obj.calendar_id


@admin.register(CalendarJob)
class CalendarJobAdmin(admin.ModelAdmin):
    list_display = ['calendar_id_display', 'job_id', 'deadline', 'status', 'type', 'created_date']
    list_filter = ['status', 'type']
    search_fields = ['calendar__id', 'job_id']
    readonly_fields = ['id', 'created_date']

    @admin.display(description='Mã lịch')
    def calendar_id_display(self, obj):
        return obj.calendar_id
