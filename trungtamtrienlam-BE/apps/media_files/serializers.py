from rest_framework import serializers
from .models import Folder, MediaFile


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent_id', 'is_private', 'department_id', 'created_at', 'created_by']
        read_only_fields = ['id', 'created_at']


class MediaFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaFile
        fields = [
            'id', 'name', 'original_name', 'path', 'size', 'extension',
            'file_type', 'folder', 'is_private', 'is_trashed', 'created_at', 'created_by',
        ]
        read_only_fields = ['id', 'created_at']
