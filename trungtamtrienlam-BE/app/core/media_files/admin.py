from django.contrib import admin
from .models import Folder, MediaFile


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'parent_id', 'is_private']


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'file_type', 'size', 'is_trashed']
    list_filter = ['file_type', 'is_trashed']
