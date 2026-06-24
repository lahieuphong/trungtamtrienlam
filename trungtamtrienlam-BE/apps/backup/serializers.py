from rest_framework import serializers
from .models import BackupLog, RestoreLog


class BackupLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class RestoreLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestoreLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
