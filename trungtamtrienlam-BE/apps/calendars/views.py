from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Calendar, CalendarJoin
from .serializers import CalendarSerializer, CalendarJoinSerializer


class CalendarViewSet(viewsets.ModelViewSet):
    queryset = Calendar.objects.filter(is_deleted=False)
    serializer_class = CalendarSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['calendar_type', 'status', 'department_id']
    search_fields = ['title']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa lịch thành công')

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        instance = self.get_object()
        instance.status = Calendar.Status.CONFIRMED
        instance.save(update_fields=['status', 'updated_at'])
        return ResponseServer.success(message='Xác nhận lịch thành công')

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        instance = self.get_object()
        join_status = request.data.get('status', CalendarJoin.JoinStatus.ACCEPTED)
        obj, _ = CalendarJoin.objects.update_or_create(
            calendar=instance, user_id=request.user.id,
            defaults={'status': join_status},
        )
        return ResponseServer.success(data=CalendarJoinSerializer(obj).data)
