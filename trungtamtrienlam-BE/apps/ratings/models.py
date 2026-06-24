from django.db import models
from core.models import BaseModel


class EvaluationCriteria(BaseModel):
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    max_score = models.FloatField(default=10.0)
    weight = models.FloatField(default=1.0)
    parent_id = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'evaluation_criterias'
        verbose_name = 'Tiêu chí đánh giá'
        verbose_name_plural = 'Tiêu chí đánh giá'


class RatingAwardTitle(BaseModel):
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    min_score = models.FloatField(default=0)
    max_score = models.FloatField(default=100)

    class Meta:
        db_table = 'rating_award_titles'
        verbose_name = 'Danh hiệu'
        verbose_name_plural = 'Danh hiệu'


class Rating(BaseModel):
    class Status(models.IntegerChoices):
        DRAFT = 0, 'Nháp'
        IN_PROGRESS = 1, 'Đang thực hiện'
        COMPLETED = 2, 'Hoàn thành'

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.IntegerField(choices=Status.choices, default=Status.DRAFT)
    department_id = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'ratings'
        verbose_name = 'Đợt đánh giá'
        verbose_name_plural = 'Đợt đánh giá'


class RatingParticipant(BaseModel):
    rating = models.ForeignKey(Rating, on_delete=models.CASCADE, related_name='participants')
    user_id = models.UUIDField(db_index=True)
    department_id = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'rating_participants'
        unique_together = ('rating', 'user_id')


class RatingResult(BaseModel):
    rating = models.ForeignKey(Rating, on_delete=models.CASCADE, related_name='results')
    participant = models.ForeignKey(RatingParticipant, on_delete=models.CASCADE)
    criteria = models.ForeignKey(EvaluationCriteria, on_delete=models.CASCADE)
    score = models.FloatField(default=0)
    note = models.TextField(blank=True, null=True)
    rated_by = models.UUIDField()

    class Meta:
        db_table = 'rating_results'
        unique_together = ('rating', 'participant', 'criteria', 'rated_by')
