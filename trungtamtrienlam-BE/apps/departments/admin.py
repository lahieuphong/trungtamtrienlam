from django.contrib import admin
from .models import Department, Staff


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'code', 'sort_order', 'is_poad', 'is_deleted']
    list_filter = ['is_poad', 'is_deleted']
    search_fields = ['name', 'code']


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'user', 'department', 'email', 'phone_number', 'is_deleted']
    list_filter = ['department', 'is_manager', 'is_deleted']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number', 'user__username']
