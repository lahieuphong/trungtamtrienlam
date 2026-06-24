from rest_framework import serializers
from .models import Calendar, CalendarJoin


class CalendarJoinSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarJoin
        fields = ['id', 'user_id', 'status']
        read_only_fields = ['id']


class CalendarSerializer(serializers.ModelSerializer):
    participants = CalendarJoinSerializer(many=True, read_only=True)

    class Meta:
        model = Calendar
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
