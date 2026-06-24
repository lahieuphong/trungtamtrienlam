from rest_framework import serializers
from .models import Department, Staff


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'parent_id',
            'manager_id', 'sort_order', 'phone', 'email', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = ['id', 'user_id', 'department', 'staff_code', 'title', 'join_date', 'is_manager']
        read_only_fields = ['id']
