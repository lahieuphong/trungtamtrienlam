from django.contrib import admin
from .models import EvaluationCriteria, RatingAwardTitle, Rating, RatingParticipant, RatingResult


@admin.register(EvaluationCriteria)
class EvaluationCriteriaAdmin(admin.ModelAdmin):
    list_display = ['name', 'max_score', 'weight']


@admin.register(RatingAwardTitle)
class RatingAwardTitleAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_score', 'max_score']


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'start_date', 'end_date']
    list_filter = ['status']
