from django.contrib import admin
from django.db.models import Count, Q
from .models import Organization, Province, StaffFile, UserConcurrently, Ward


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'unit_type', 'active_ward_count', 'is_disabled', 'is_deleted']
    list_filter = ['unit_type', 'is_disabled', 'is_deleted']
    search_fields = ['name', 'code', 'legacy_code']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            active_wards=Count('wards', filter=Q(wards__is_deleted=False, wards__is_disabled=False))
        )

    @admin.display(description='Số đơn vị cấp xã')
    def active_ward_count(self, obj):
        return obj.active_wards


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ['name', 'province', 'code', 'unit_type', 'old_district_name', 'is_disabled', 'is_deleted']
    list_filter = ['province', 'unit_type', 'is_disabled', 'is_deleted']
    search_fields = ['name', 'code', 'old_district_name']


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

