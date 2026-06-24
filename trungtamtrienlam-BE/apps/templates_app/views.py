from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Template
from .serializers import TemplateSerializer


class TemplateViewSet(viewsets.ModelViewSet):
    queryset = Template.objects.filter(is_deleted=False, is_active=True)
    serializer_class = TemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['template_type', 'department_id']
    search_fields = ['name']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa mẫu biểu thành công')
