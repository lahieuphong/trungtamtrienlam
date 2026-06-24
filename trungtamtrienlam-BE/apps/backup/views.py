from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from core.response import ResponseServer
from .models import BackupLog, RestoreLog
from .serializers import BackupLogSerializer, RestoreLogSerializer
from .tasks import run_backup, run_restore


class BackupLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BackupLog.objects.all()
    serializer_class = BackupLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_fields = ['backup_type', 'status']

    @action(detail=False, methods=['post'], url_path='run')
    def run(self, request):
        run_backup.delay(
            backup_type=BackupLog.BackupType.MANUAL,
            created_by=str(request.user.id),
        )
        return ResponseServer.success(message='Đang thực hiện backup, vui lòng chờ...')

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        run_restore.delay(
            backup_log_id=str(pk),
            created_by=str(request.user.id),
        )
        return ResponseServer.success(message='Đang phục hồi dữ liệu, vui lòng chờ...')


class RestoreLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RestoreLog.objects.all()
    serializer_class = RestoreLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
