from django.contrib import admin
from .models import Calendar, CalendarJoin


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ['title', 'calendar_type', 'status', 'start_time', 'end_time']
    list_filter = ['calendar_type', 'status']
