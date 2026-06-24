from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Document, DocumentFile
from .serializers import DocumentSerializer, DocumentFileSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.filter(is_deleted=False)
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'document_type', 'department_id']
    search_fields = ['title', 'number']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa văn bản thành công')

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        instance = self.get_object()
        instance.status = request.data.get('status')
        instance.save(update_fields=['status', 'updated_at', 'updated_by'])
        return ResponseServer.success(message='Cập nhật trạng thái thành công')
