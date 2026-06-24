from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import EvaluationCriteria, RatingAwardTitle, Rating, RatingResult
from .serializers import (
    EvaluationCriteriaSerializer, RatingAwardTitleSerializer,
    RatingSerializer, RatingResultSerializer,
)


class EvaluationCriteriaViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriteria.objects.filter(is_deleted=False)
    serializer_class = EvaluationCriteriaSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa tiêu chí thành công')


class RatingAwardTitleViewSet(viewsets.ModelViewSet):
    queryset = RatingAwardTitle.objects.filter(is_deleted=False)
    serializer_class = RatingAwardTitleSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa danh hiệu thành công')


class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.filter(is_deleted=False)
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'department_id']

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa đợt đánh giá thành công')


class RatingResultViewSet(viewsets.ModelViewSet):
    queryset = RatingResult.objects.filter(is_deleted=False)
    serializer_class = RatingResultSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['rating', 'participant']
