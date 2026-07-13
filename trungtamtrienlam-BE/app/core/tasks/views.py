from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Task, TaskUser, TaskDocument, TaskChat, TaskHistory
from .serializers import (
    TaskSerializer, TaskUserSerializer, TaskDocumentSerializer,
    TaskChatSerializer, TaskHistorySerializer,
)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.filter(is_deleted=False)
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'priority', 'task_type', 'department_id']
    search_fields = ['title']

    def perform_create(self, serializer):
        serializer.save(created_by=str(self.request.user.id), assigned_by=self.request.user.id)

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa công việc thành công')

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        histories = TaskHistory.objects.filter(task_id=pk)
        return ResponseServer.success(data=TaskHistorySerializer(histories, many=True).data)

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        instance = self.get_object()
        new_status = request.data.get('status')
        instance.status = new_status
        instance.save(update_fields=['status', 'updated_at'])
        TaskHistory.objects.create(task=instance, action=f'Đổi trạng thái → {new_status}', performed_by=request.user.id)
        return ResponseServer.success(message='Cập nhật trạng thái thành công')


class TaskDocumentViewSet(viewsets.ModelViewSet):
    queryset = TaskDocument.objects.filter(is_deleted=False)
    serializer_class = TaskDocumentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['task', 'status']


class TaskChatViewSet(viewsets.ModelViewSet):
    queryset = TaskChat.objects.filter(is_deleted=False)
    serializer_class = TaskChatSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['task']

    def perform_create(self, serializer):
        serializer.save(user_id=self.request.user.id, created_by=str(self.request.user.id))
