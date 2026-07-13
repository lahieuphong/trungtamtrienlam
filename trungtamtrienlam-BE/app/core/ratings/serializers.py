from rest_framework import serializers
from .models import EvaluationCriteria, RatingAwardTitle, Rating, RatingParticipant, RatingResult


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriteria
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RatingAwardTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatingAwardTitle
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class RatingResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatingResult
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
