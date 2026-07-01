from django.contrib import admin
from .models import EvaluationCriteria, RatingAwardTitle, Rating, RatingParticipant, RatingResult


@admin.register(EvaluationCriteria)
class EvaluationCriteriaAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'max_score', 'weight']


@admin.register(RatingAwardTitle)
class RatingAwardTitleAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'min_score', 'max_score']


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'status', 'start_date', 'end_date']
    list_filter = ['status']
