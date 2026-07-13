from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Folder, MediaFile
from .serializers import FolderSerializer, MediaFileSerializer


class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.filter(is_deleted=False)
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['parent_id', 'department_id']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa thư mục thành công')


class MediaFileViewSet(viewsets.ModelViewSet):
    serializer_class = MediaFileSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['folder', 'file_type', 'is_private', 'is_trashed']
    search_fields = ['name', 'original_name']

    def get_queryset(self):
        return MediaFile.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_trashed = True
        instance.save(update_fields=['is_trashed', 'updated_at'])
        return ResponseServer.success(message='Chuyển vào thùng rác thành công')

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_trashed = False
        instance.save(update_fields=['is_trashed', 'updated_at'])
        return ResponseServer.success(message='Khôi phục tệp tin thành công')

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa vĩnh viễn thành công')
