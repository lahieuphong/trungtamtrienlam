from django.contrib import admin
from .models import District, Organization, Province, StaffFile, UserConcurrently, Ward


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_disabled', 'is_deleted']
    list_filter = ['is_disabled', 'is_deleted']
    search_fields = ['name', 'code']


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'province', 'code', 'is_disabled', 'is_deleted']
    list_filter = ['province', 'is_disabled', 'is_deleted']
    search_fields = ['name', 'code']


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'code', 'is_disabled', 'is_deleted']
    list_filter = ['district', 'is_disabled', 'is_deleted']
    search_fields = ['name', 'code']


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_deleted', 'created_at']
    list_filter = ['is_deleted']
    search_fields = ['name', 'code']


@admin.register(StaffFile)
class StaffFileAdmin(admin.ModelAdmin):
    list_display = ['staff', 'user_id', 'type_file', 'file_name', 'is_deleted', 'created_at']
    list_filter = ['type_file', 'is_deleted']
    search_fields = ['file_name', 'file', 'user_id']


@admin.register(UserConcurrently)
class UserConcurrentlyAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'department', 'organization', 'is_deleted', 'created_at']
    list_filter = ['role', 'department', 'organization', 'is_deleted']
    search_fields = ['user__username', 'user__email', 'role__name', 'department__name']