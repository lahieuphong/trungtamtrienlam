from django.contrib import admin
from .models import BackupLog, RestoreLog


@admin.register(BackupLog)
class BackupLogAdmin(admin.ModelAdmin):
    list_display = ['title', 'backup_type', 'status', 'size_kb', 'created_at']
    list_filter = ['backup_type', 'status']


@admin.register(RestoreLog)
class RestoreLogAdmin(admin.ModelAdmin):
    list_display = ['title', 'database_name', 'status', 'created_at']
    list_filter = ['status']
