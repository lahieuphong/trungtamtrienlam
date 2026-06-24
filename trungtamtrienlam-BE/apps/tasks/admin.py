from django.contrib import admin
from .models import Task, TaskUser, TaskDocument, TaskChat, TaskHistory


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'task_type', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'task_type']
    search_fields = ['title']
