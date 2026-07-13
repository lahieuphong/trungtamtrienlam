from django.apps import apps
from django.contrib import admin
from django.contrib.admin.sites import AlreadyRegistered
from django.db import DatabaseError
from django.db import connection
from django.db import models
from django.utils.html import format_html

from core.legacy_aidi.models import ManagedDepartment
from core.legacy_aidi.models import ManagedChatAwaitConfirm
from core.legacy_aidi.models import ManagedMenuItem
from core.legacy_aidi.models import ManagedPermission
from core.legacy_aidi.models import ManagedRole
from core.legacy_aidi.models import ManagedStaffPosition
from core.legacy_aidi.models import ManagedStaffProfile


PROJECT_APP_LABELS = {
    'accounts',
    'legacy_aidi',
    'payments',
    'projects',
}


MENU_ICON_HELP_TEXT = 'Upload file ảnh icon cho menu. Khuyến nghị dùng SVG/PNG kích thước vuông.'


def _table_exists(model):
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except DatabaseError:
        return False


def _list_display_for(model):
    fields = [field.name for field in model._meta.fields[:8]]
    return tuple(fields) or ('__str__',)


def _readonly_fields_for(model):
    return tuple(field.name for field in model._meta.fields)


def _search_fields_for(model):
    text_fields = (
        models.CharField,
        models.EmailField,
        models.SlugField,
        models.TextField,
    )
    fields = [
        field.name
        for field in model._meta.fields
        if isinstance(field, text_fields)
    ]
    return tuple(fields[:8])


def _list_filter_for(model):
    filter_types = (
        models.BooleanField,
        models.NullBooleanField,
        models.DateField,
        models.DateTimeField,
    )
    fields = [
        field.name
        for field in model._meta.fields
        if isinstance(field, filter_types)
    ]
    return tuple(fields[:8])


class ReadOnlyProjectModelAdmin(admin.ModelAdmin):
    actions = None
    list_per_page = 25
    show_full_result_count = False

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_staff

    def get_queryset(self, request):
        if not _table_exists(self.model):
            return self.model._default_manager.none()
        return super().get_queryset(request)


@admin.register(ManagedRole)
class ManagedRoleAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'level',
        'is_admin',
        'is_director',
        'can_receive_task',
        'can_assign_task',
        'can_see_department_tasks',
        'is_disabled',
        'is_deleted',
    )
    list_filter = (
        'is_admin',
        'is_director',
        'can_receive_task',
        'can_assign_task',
        'can_see_department_tasks',
        'is_disabled',
        'is_deleted',
    )
    search_fields = ('id', 'name')
    readonly_fields = ('id', 'created_date', 'modified_date')
    fields = (
        'id',
        'name',
        'level',
        'is_admin',
        'is_director',
        'is_vice_director',
        'can_receive_task',
        'can_assign_task',
        'can_see_department_tasks',
        'is_disabled',
        'is_deleted',
        'created_by',
        'modified_by',
        'created_date',
        'modified_date',
    )
    ordering = ('level', 'name')


@admin.register(ManagedDepartment)
class ManagedDepartmentAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'is_poad',
        'is_deleted',
        'created_date',
        'modified_date',
    )
    list_filter = ('is_poad', 'is_deleted')
    search_fields = ('id', 'name')
    readonly_fields = ('id', 'created_date', 'modified_date')
    fields = (
        'id',
        'name',
        'is_poad',
        'is_deleted',
        'created_by',
        'modified_by',
        'created_date',
        'modified_date',
    )
    ordering = ('name',)


@admin.register(ManagedStaffProfile)
class ManagedStaffProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'province_id',
        'district_id',
        'address',
        'created_date',
        'modified_date',
    )
    search_fields = ('id', 'user__username', 'user__email', 'user__name', 'address')
    readonly_fields = ('id', 'created_date', 'modified_date')
    fields = (
        'id',
        'user',
        'province_id',
        'district_id',
        'ward_id',
        'address',
        'avatar',
        'sign',
        'stamp',
        'sign_encrypted',
        'stamp_encrypted',
        'created_by',
        'modified_by',
        'created_date',
        'modified_date',
    )
    ordering = ('user__username',)


@admin.register(ManagedStaffPosition)
class ManagedStaffPositionAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'role_id',
        'department_id',
        'organization_id',
        'is_default',
        'created_date',
    )
    list_filter = ('is_default',)
    search_fields = ('id', 'user__username', 'role_id', 'department_id', 'organization_id')
    readonly_fields = ('id', 'created_date', 'modified_date')
    fields = (
        'id',
        'user',
        'role_id',
        'department_id',
        'organization_id',
        'is_default',
        'created_by',
        'modified_by',
        'created_date',
        'modified_date',
    )
    ordering = ('user__username', '-is_default', 'created_date')


@admin.register(ManagedMenuItem)
class ManagedMenuItemAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'icon_preview',
        'function_id',
        'unique_key',
        'path',
        'parent_id',
        'sort_order',
        'is_disabled',
        'is_deleted',
    )
    list_filter = ('is_disabled', 'is_deleted')
    search_fields = ('id', 'function_id', 'name', 'unique_key', 'path', 'parent_id', 'icon')
    readonly_fields = ('id', 'icon_preview', 'created_date', 'modified_date')
    fields = (
        'id',
        'function_id',
        'name',
        'unique_key',
        'unique_code',
        'path',
        'url',
        'parent_id',
        'icon',
        'icon_preview',
        'sort_order',
        'is_disabled',
        'is_deleted',
        'created_by',
        'modified_by',
        'created_date',
        'modified_date',
    )
    ordering = ('sort_order', 'name')

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)
        if db_field.name == 'icon':
            formfield.help_text = MENU_ICON_HELP_TEXT
        return formfield

    @admin.display(description='Icon')
    def icon_preview(self, obj):
        icon = obj.normalized_icon() if obj else ''
        if not icon:
            return '-'

        return format_html(
            '<span style="display:inline-flex;align-items:center;gap:8px;">'
            '<img src="{}" alt="icon" style="width:24px;height:24px;object-fit:contain;" />'
            '<code>{}</code>'
            '</span>',
            icon,
            icon,
        )


@admin.register(ManagedPermission)
class ManagedPermissionAdmin(admin.ModelAdmin):
    list_display = (
        'role_id',
        'department_id',
        'function_id',
        'can_view',
        'can_add',
        'can_edit',
        'can_delete',
        'can_verify',
        'can_refuse',
        'can_download',
        'is_public',
    )
    list_filter = (
        'can_view',
        'can_add',
        'can_edit',
        'can_delete',
        'can_verify',
        'can_refuse',
        'can_download',
        'is_public',
    )
    search_fields = ('id', 'role_id', 'department_id', 'function_id')
    readonly_fields = ('id', 'created_date', 'modified_date')
    fields = (
        'id',
        'role_id',
        'department_id',
        'function_id',
        'can_view',
        'can_add',
        'can_edit',
        'can_delete',
        'can_verify',
        'can_refuse',
        'can_download',
        'is_public',
        'created_by',
        'modified_by',
        'created_date',
        'modified_date',
    )
    ordering = ('role_id', 'department_id', 'function_id')


@admin.register(ManagedChatAwaitConfirm)
class ManagedChatAwaitConfirmAdmin(admin.ModelAdmin):
    list_display = (
        'chat_id',
        'user_id',
        'status',
        'created_by',
        'confirmed_by',
        'created_date',
        'confirmed_date',
    )
    list_filter = ('status', 'created_date', 'confirmed_date')
    search_fields = ('id', 'chat_id', 'user_id', 'created_by', 'confirmed_by')
    readonly_fields = ('id', 'created_date', 'modified_date')
    fields = (
        'id',
        'chat_id',
        'user_id',
        'status',
        'created_by',
        'confirmed_by',
        'created_date',
        'confirmed_date',
        'modified_date',
    )
    ordering = ('-created_date',)


def _admin_for(model):
    attrs = {
        'list_display': _list_display_for(model),
        'readonly_fields': _readonly_fields_for(model),
        'search_fields': _search_fields_for(model),
        'list_filter': _list_filter_for(model),
        'ordering': (),
    }
    name = f'{model.__name__}Admin'
    return type(name, (ReadOnlyProjectModelAdmin,), attrs)


for model in apps.get_models():
    if model._meta.app_label not in PROJECT_APP_LABELS:
        continue

    try:
        admin.site.register(model, _admin_for(model))
    except AlreadyRegistered:
        pass
