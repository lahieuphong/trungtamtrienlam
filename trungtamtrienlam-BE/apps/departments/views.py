from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Department, Staff
from .serializers import DepartmentSerializer, StaffSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_deleted=False)
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'code']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa phòng ban thành công')

    @action(detail=False, methods=['get'], url_path='dropdown')
    def dropdown(self, request):
        data = self.get_queryset().values('id', 'name', 'code', 'parent_id')
        return ResponseServer.success(data=list(data))

    @action(detail=True, methods=['get'], url_path='staffs')
    def get_staffs(self, request, pk=None):
        staffs = Staff.objects.filter(department_id=pk, is_deleted=False)
        return ResponseServer.success(data=StaffSerializer(staffs, many=True).data)


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.filter(is_deleted=False)
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['department']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa nhân sự thành công')
