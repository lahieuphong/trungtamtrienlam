import core.legacy_aidi.models
from django.db import migrations
from django.db import models


MENU_ITEMS = [
    {'function_id': 'dashboard', 'name': 'Tổng quan', 'unique_key': 'dashboard', 'path': '/dashboard', 'parent_id': '', 'sort_order': 1},
    {'function_id': 'Calendar', 'name': 'Quản lý lịch', 'unique_key': 'Calendar', 'path': '/calendar', 'parent_id': '', 'sort_order': 2},
    {'function_id': 'Media', 'name': 'Quản lý kho lưu trữ', 'unique_key': 'Media', 'path': '/media', 'parent_id': '', 'sort_order': 3},
    {'function_id': 'MediaFolders', 'name': 'Thư mục', 'unique_key': 'MediaFolders', 'path': '/media/folders', 'parent_id': 'Media', 'sort_order': 31},
    {'function_id': 'MediaDocuments', 'name': 'Tài liệu', 'unique_key': 'MediaDocuments', 'path': '/media/documents', 'parent_id': 'Media', 'sort_order': 32},
    {'function_id': 'MediaImages', 'name': 'Hình ảnh', 'unique_key': 'MediaImages', 'path': '/media/images', 'parent_id': 'Media', 'sort_order': 33},
    {'function_id': 'MediaVideos', 'name': 'Video', 'unique_key': 'MediaVideos', 'path': '/media/videos', 'parent_id': 'Media', 'sort_order': 34},
    {'function_id': 'Tasks', 'name': 'Quản lý nhiệm vụ', 'unique_key': 'Tasks', 'path': '/tasks/tasks', 'parent_id': '', 'sort_order': 4},
    {'function_id': 'TasksAssigned', 'name': 'Nhiệm vụ', 'unique_key': 'TasksAssigned', 'path': '/tasks/tasks', 'parent_id': 'Tasks', 'sort_order': 41},
    {'function_id': 'TasksInternal', 'name': 'Nội bộ', 'unique_key': 'TasksInternal', 'path': '/tasks/internal', 'parent_id': 'Tasks', 'sort_order': 42},
    {'function_id': 'TasksDigital', 'name': 'Số hóa', 'unique_key': 'TasksDigital', 'path': '/tasks/degital', 'parent_id': 'Tasks', 'sort_order': 43},
    {'function_id': 'TasksPendingIssuance', 'name': 'Chờ ban hành', 'unique_key': 'TasksPendingIssuance', 'path': '/tasks/pendingIssuance', 'parent_id': 'Tasks', 'sort_order': 44},
    {'function_id': 'Ratings', 'name': 'Đánh giá xếp hạng', 'unique_key': 'Ratings', 'path': '/ratings', 'parent_id': '', 'sort_order': 5},
    {'function_id': 'RatingsAwards', 'name': 'Danh hiệu', 'unique_key': 'RatingsAwards', 'path': '/ratings/awards', 'parent_id': 'Ratings', 'sort_order': 51},
    {'function_id': 'RatingsRankings', 'name': 'Xếp hạng', 'unique_key': 'RatingsRankings', 'path': '/ratings/rankings', 'parent_id': 'Ratings', 'sort_order': 52},
    {'function_id': 'RatingsCriterias', 'name': 'Tiêu chí', 'unique_key': 'RatingsCriterias', 'path': '/ratings/criterias', 'parent_id': 'Ratings', 'sort_order': 53},
    {'function_id': 'Permission', 'name': 'Phân quyền chức năng', 'unique_key': 'Permission', 'path': '/permissions', 'parent_id': '', 'sort_order': 6},
    {'function_id': 'Staff', 'name': 'Quản lý tài khoản', 'unique_key': 'Staff', 'path': '/accounts', 'parent_id': '', 'sort_order': 7},
    {'function_id': 'documents', 'name': 'Văn bản hành chính cá nhân', 'unique_key': 'documents', 'path': '/documents', 'parent_id': '', 'sort_order': 8},
    {'function_id': 'Settings', 'name': 'Cài đặt hệ thống', 'unique_key': 'Settings', 'path': '/settings', 'parent_id': '', 'sort_order': 9},
    {'function_id': 'SettingsSystem', 'name': 'Hệ thống', 'unique_key': 'SettingsSystem', 'path': '/settings/system', 'parent_id': 'Settings', 'sort_order': 91},
    {'function_id': 'SettingsMaintenance', 'name': 'Bảo trì', 'unique_key': 'SettingsMaintenance', 'path': '/settings/maintenance', 'parent_id': 'Settings', 'sort_order': 92},
    {'function_id': 'SettingsBackup', 'name': 'Sao lưu', 'unique_key': 'SettingsBackup', 'path': '/settings/backup', 'parent_id': 'Settings', 'sort_order': 93},
    {'function_id': 'templates', 'name': 'Biểu mẫu & Đơn từ', 'unique_key': 'templates', 'path': '/templates', 'parent_id': '', 'sort_order': 10},
    {'function_id': 'TemplateWordProcessing', 'name': 'Văn bản trình ký', 'unique_key': 'TemplateWordProcessing', 'path': '/templates/wordprocessing', 'parent_id': 'templates', 'sort_order': 101},
    {'function_id': 'TemplateFormManagement', 'name': 'Quản lý biểu mẫu', 'unique_key': 'TemplateFormManagement', 'path': '/templates/formmanagement', 'parent_id': 'templates', 'sort_order': 102},
]


def seed_menu_items(apps, schema_editor):
    ManagedMenuItem = apps.get_model('legacy_aidi', 'ManagedMenuItem')
    for item in MENU_ITEMS:
        ManagedMenuItem.objects.update_or_create(
            function_id=item['function_id'],
            defaults={
                'id': item['function_id'],
                'name': item['name'],
                'unique_key': item['unique_key'],
                'unique_code': item['unique_key'],
                'path': item['path'],
                'url': item['path'],
                'parent_id': item['parent_id'],
                'sort_order': item['sort_order'],
                'is_disabled': False,
                'is_deleted': False,
            },
        )


def unseed_menu_items(apps, schema_editor):
    ManagedMenuItem = apps.get_model('legacy_aidi', 'ManagedMenuItem')
    ManagedMenuItem.objects.filter(function_id__in=[item['function_id'] for item in MENU_ITEMS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0003_managed_staff_profile_position'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedMenuItem',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_menu_item_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('function_id', models.CharField(max_length=64, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('unique_key', models.CharField(max_length=255)),
                ('unique_code', models.CharField(blank=True, default='', max_length=255)),
                ('path', models.CharField(blank=True, default='', max_length=500)),
                ('url', models.CharField(blank=True, default='', max_length=500)),
                ('parent_id', models.CharField(blank=True, default='', max_length=64)),
                ('icon', models.CharField(blank=True, default='', max_length=255)),
                ('sort_order', models.IntegerField(default=0)),
                ('is_disabled', models.BooleanField(default=False)),
                ('is_deleted', models.BooleanField(default=False)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
                ('modified_by', models.TextField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed menu item',
                'verbose_name_plural': 'Managed menu items',
                'db_table': 'aidi_managed_menu_items',
                'ordering': ('sort_order', 'name'),
            },
        ),
        migrations.RunPython(seed_menu_items, unseed_menu_items),
    ]
