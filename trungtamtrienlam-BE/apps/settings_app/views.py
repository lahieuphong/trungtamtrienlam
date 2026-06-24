from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from core.response import ResponseServer
from .models import SystemConfig, SettingNotification
from .serializers import SystemConfigSerializer, SettingNotificationSerializer


class SystemConfigViewSet(viewsets.ModelViewSet):
    queryset = SystemConfig.objects.filter(is_deleted=False)
    serializer_class = SystemConfigSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    search_fields = ['key', 'group']


class SettingNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = SettingNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SettingNotification.objects.filter(user_id=self.request.user.id)

    def perform_create(self, serializer):
        SettingNotification.objects.filter(user_id=self.request.user.id).delete()
        serializer.save(user_id=self.request.user.id)

    @action(detail=False, methods=['get', 'put'], url_path='mine')
    def my_settings(self, request):
        obj, _ = SettingNotification.objects.get_or_create(user_id=request.user.id)
        if request.method == 'PUT':
            serializer = self.get_serializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return ResponseServer.success(data=serializer.data, message='Lưu cài đặt thành công')
        return ResponseServer.success(data=self.get_serializer(obj).data)
