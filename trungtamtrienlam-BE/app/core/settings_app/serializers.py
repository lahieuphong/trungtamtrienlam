from rest_framework import serializers
from .models import SystemConfig, SettingNotification


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ['id', 'key', 'value', 'description', 'group']
        read_only_fields = ['id']


class SettingNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SettingNotification
        fields = [
            'id', 'user_id', 'email_enabled', 'push_enabled',
            'task_notify', 'document_notify', 'calendar_notify', 'chat_notify',
        ]
        read_only_fields = ['id', 'user_id']
