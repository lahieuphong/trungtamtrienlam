from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Archive
from .serializers import ArchiveSerializer


class ArchiveViewSet(viewsets.ModelViewSet):
    queryset = Archive.objects.filter(is_deleted=False)
    serializer_class = ArchiveSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'code']
    filterset_fields = ['department_id', 'year']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa hồ sơ thành công')
