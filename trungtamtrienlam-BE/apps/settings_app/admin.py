from django.contrib import admin
from .models import SystemConfig, SettingNotification


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ['key', 'group', 'value']
    search_fields = ['key']
    list_filter = ['group']
