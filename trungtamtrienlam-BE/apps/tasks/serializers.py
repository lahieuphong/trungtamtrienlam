from rest_framework import serializers
from .models import Task, TaskUser, TaskDocument, TaskChat, TaskHistory


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskUser
        fields = ['id', 'task', 'user_id', 'role']
        read_only_fields = ['id']


class TaskDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDocument
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskChat
        fields = ['id', 'task', 'user_id', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class TaskHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
