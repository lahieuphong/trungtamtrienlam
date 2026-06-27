from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role, RoleDepartment, UserRole, Function, Action, Permission


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'username', 'email', 'phone', 'get_full_name', 'department_id',
        'province_id', 'district_id', 'is_staff', 'is_active', 'is_deleted',
        'created_at',
    ]
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'is_deleted']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = UserAdmin.fieldsets + (
        ('Thông tin tài khoản mở rộng', {
            'fields': (
                'phone', 'avatar', 'department_id', 'position',
                'province_id', 'district_id', 'address', 'is_deleted',
                'created_at', 'updated_at',
            )
        }),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'level', 'is_director', 'is_vice_director', 'is_admin', 'is_disabled',
        'can_receive_task', 'can_assign_task', 'can_see_department_tasks', 'is_deleted', 'created_at',
    ]
    list_filter = ['is_director', 'is_vice_director', 'is_admin', 'is_disabled', 'is_deleted']
    search_fields = ['name']


@admin.register(RoleDepartment)
class RoleDepartmentAdmin(admin.ModelAdmin):
    list_display = ['role', 'department']
    list_filter = ['role', 'department']
    search_fields = ['role__name', 'department__name']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['user__username', 'user__email', 'role__name']


@admin.register(Function)
class FunctionAdmin(admin.ModelAdmin):
    list_display = ['name', 'url', 'icon', 'parent_id', 'sort_order', 'is_deleted']
    list_filter = ['is_deleted']
    search_fields = ['name', 'url', 'icon']
    ordering = ['sort_order']


@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    search_fields = ['name', 'code']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'department_id', 'function', 'action']
    list_filter = ['role', 'action', 'department_id']
    search_fields = ['role__name', 'function__name', 'action__code']