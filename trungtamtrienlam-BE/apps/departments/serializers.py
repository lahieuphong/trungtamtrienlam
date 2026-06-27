from rest_framework import serializers
from .models import Department, Staff


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'parent_id',
            'manager_id', 'sort_order', 'phone', 'email', 'is_poad', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class StaffSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Staff
        fields = [
            'id', 'user', 'user_id', 'department', 'staff_code', 'title', 'join_date', 'is_manager',
            'first_name', 'last_name', 'full_name', 'phone_number', 'email', 'province', 'district', 'ward', 'address',
            'avatar', 'sign', 'stamp', 'email_personal',
        ]
        read_only_fields = ['id', 'user_id', 'full_name']