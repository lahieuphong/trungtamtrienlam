from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role, UserRole, Function, Action, Permission


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'get_full_name', 'is_active', 'created_at']
    list_filter = ['is_active', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Thông tin thêm', {'fields': ('phone', 'avatar', 'department_id', 'position')}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'created_at']
    list_filter = ['role']


@admin.register(Function)
class FunctionAdmin(admin.ModelAdmin):
    list_display = ['name', 'url', 'sort_order']
    ordering = ['sort_order']


@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'function', 'action']
    list_filter = ['role']
