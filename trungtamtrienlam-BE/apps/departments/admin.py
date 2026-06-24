from django.contrib import admin
from .models import Department, Staff


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'sort_order']
    search_fields = ['name', 'code']


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'department', 'title', 'is_manager']
    list_filter = ['department', 'is_manager']
