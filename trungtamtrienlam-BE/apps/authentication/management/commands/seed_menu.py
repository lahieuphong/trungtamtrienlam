"""
python manage.py seed_menu
Seeds the full menu function tree + Admin role with all-view permissions.
Safe to re-run (uses get_or_create).
"""

import uuid
from django.core.management.base import BaseCommand
from apps.authentication.models import Function, Action, Role, Permission, UserRole, User

FUNCTIONS = [
    # ── Level 0 root items ────────────────────────────────────────────────
    {'_key': 'dashboard',     'sort': 1,  'icon': 'dashboard',   'name': 'Tổng quan',                   'url': '/dashboard',              'parent': None},
    {'_key': 'calendar',      'sort': 2,  'icon': 'Calendar',    'name': 'Quản lý lịch',                'url': '/calendar',               'parent': None},
    {'_key': 'documents',     'sort': 3,  'icon': 'documents',   'name': 'Thư viện văn bản',            'url': '/documents',              'parent': None},

    # ── Quản lý kho lưu trữ ──────────────────────────────────────────────
    {'_key': 'media',         'sort': 4,  'icon': 'Media',           'name': 'Quản lý kho lưu trữ',        'url': None,                  'parent': None},
    {'_key': 'media_audio',   'sort': 41, 'icon': 'Media-audio',     'name': 'Âm thanh',                   'url': '/media/audio',        'parent': 'media'},
    {'_key': 'media_img',     'sort': 42, 'icon': 'Media-images',    'name': 'Hình ảnh',                   'url': '/media/images',       'parent': 'media'},
    {'_key': 'media_video',   'sort': 43, 'icon': 'Media-videos',    'name': 'Phim ảnh',                   'url': '/media/videos',       'parent': 'media'},
    {'_key': 'media_doc',     'sort': 44, 'icon': 'Media-documents', 'name': 'Tài liệu',                   'url': '/media/documents',    'parent': 'media'},
    {'_key': 'media_3d',      'sort': 45, 'icon': 'Media-3d',        'name': '3D',                         'url': '/media/3d',           'parent': 'media'},
    {'_key': 'media_share',   'sort': 46, 'icon': 'Media-share-foler','name': 'Chia sẻ thư mục',           'url': '/media/share-folder', 'parent': 'media'},
    {'_key': 'media_trash',   'sort': 47, 'icon': 'Media-trash',     'name': 'Thùng rác',                  'url': '/media/trash',        'parent': 'media'},
    {'_key': 'archives',      'sort': 48, 'icon': 'Archives',        'name': 'Tổng hợp dữ liệu',           'url': '/archives',           'parent': 'media'},

    # ── Quản lý nhiệm vụ ─────────────────────────────────────────────────
    {'_key': 'tasks',         'sort': 5,  'icon': 'Tasks',           'name': 'Quản lý nhiệm vụ',           'url': None,                  'parent': None},
    {'_key': 'task',          'sort': 51, 'icon': 'Task',            'name': 'Nhiệm vụ',                   'url': '/tasks/tasks',        'parent': 'tasks'},
    {'_key': 'internal',      'sort': 52, 'icon': 'internal',        'name': 'Công văn nội bộ',            'url': '/tasks/internal',     'parent': 'tasks'},
    {'_key': 'pending',       'sort': 53, 'icon': 'pendingIssuance', 'name': 'Công văn đi đến',            'url': '/tasks/pendingIssuance','parent': 'tasks'},
    {'_key': 'issued',        'sort': 54, 'icon': 'degital',         'name': 'Công văn ban hành',          'url': '/tasks/degital',      'parent': 'tasks'},

    # ── Quản lý di tích ──────────────────────────────────────────────────
    {'_key': 'monument',      'sort': 6,  'icon': 'Monument',        'name': 'Quản lý di tích',            'url': None,                  'parent': None},
    {'_key': 'mon_review',    'sort': 61, 'icon': 'Mon-review',      'name': 'Hồ sơ xét duyệt',           'url': '/monument-profile',   'parent': 'monument'},
    {'_key': 'mon_private',   'sort': 62, 'icon': 'Monument-Private','name': 'Hồ sơ không công khai',     'url': '/monument-profile/private','parent': 'monument'},
    {'_key': 'mon_all',       'sort': 63, 'icon': 'Mon-all',         'name': 'Toàn bộ hồ sơ',             'url': '/monument-profile/all','parent': 'monument'},
    {'_key': 'mon_public',    'sort': 64, 'icon': 'Mon-public',      'name': 'Hồ sơ công khai',           'url': None,                  'parent': 'monument'},
    {'_key': 'mon_menu',      'sort': 641,'icon': 'Mon-menu',        'name': 'Quản lý menu',               'url': '/websites/menu',      'parent': 'mon_public'},
    {'_key': 'mon_news',      'sort': 642,'icon': 'Mon-news',        'name': 'Quản lý tin tức',            'url': '/websites/news',      'parent': 'mon_public'},
    {'_key': 'mon_home',      'sort': 643,'icon': 'Mon-home',        'name': 'Quản lý trang chủ',         'url': '/websites/home',      'parent': 'mon_public'},
    {'_key': 'mon_about',     'sort': 644,'icon': 'Mon-about',       'name': 'Quản lý giới thiệu',        'url': '/websites/about-us',  'parent': 'mon_public'},
    {'_key': 'mon_config',    'sort': 645,'icon': 'Mon-config',      'name': 'Cấu hình',                  'url': '/websites/config',    'parent': 'mon_public'},
    {'_key': 'mon_contacts',  'sort': 646,'icon': 'Mon-contacts',    'name': 'Danh sách liên hệ',         'url': '/websites/contact',   'parent': 'mon_public'},
    {'_key': 'mon_3d',        'sort': 647,'icon': 'Mon-3d',          'name': 'Di tích-3D',                'url': '/websites/monument-3d','parent': 'mon_public'},

    # ── Đánh giá xếp hạng ────────────────────────────────────────────────
    {'_key': 'ratings',       'sort': 7,  'icon': 'Ratings',         'name': 'Đánh giá xếp hạng',         'url': None,                  'parent': None},
    {'_key': 'crit_set',      'sort': 71, 'icon': 'Setting-criterias','name': 'Thiết lập tiêu chí',       'url': '/ratings/setting-criterias','parent': 'ratings'},
    {'_key': 'award_set',     'sort': 72, 'icon': 'Setting-awards',  'name': 'Thiết lập danh hiệu',       'url': '/ratings/setting-awards','parent': 'ratings'},
    {'_key': 'rank_set',      'sort': 73, 'icon': 'Setting-rankings','name': 'Thiết lập xếp hạng',        'url': '/ratings/setting-ranking','parent': 'ratings'},
    {'_key': 'leaderboard',   'sort': 74, 'icon': 'rankings',        'name': 'Bảng xếp hạng',             'url': '/ratings/rankings',   'parent': 'ratings'},
    {'_key': 'awards',        'sort': 75, 'icon': 'awards',          'name': 'Danh hiệu',                 'url': '/ratings/awards',     'parent': 'ratings'},

    # ── Standalone items ──────────────────────────────────────────────────
    {'_key': 'permission',    'sort': 8,  'icon': 'Permission',      'name': 'Phân quyền chức năng',      'url': '/permissions',        'parent': None},
    {'_key': 'staff',         'sort': 9,  'icon': 'Staff',           'name': 'Quản lý tài khoản',         'url': '/accounts',           'parent': None},
    {'_key': 'wordprocess',   'sort': 10, 'icon': 'wordprocessing',  'name': 'Văn bản hành chính cá nhân','url': '/templates/wordprocessing','parent': None},

    # ── Cài đặt hệ thống ─────────────────────────────────────────────────
    {'_key': 'settings',      'sort': 11, 'icon': 'Settings',        'name': 'Cài đặt hệ thống',          'url': None,                  'parent': None},
    {'_key': 'set_config',    'sort': 111,'icon': 'Set-config',      'name': 'Cấu hình hệ thống',         'url': '/settings/system',    'parent': 'settings'},
    {'_key': 'set_notif',     'sort': 112,'icon': 'Set-notif',       'name': 'Cài đặt thông báo',         'url': '/settings/notification','parent': 'settings'},
    {'_key': 'set_maint',     'sort': 113,'icon': 'Set-maint',       'name': 'Bảo trì hệ thống',          'url': '/settings/maintenance','parent': 'settings'},

    # ── Biểu mẫu & Đơn từ ────────────────────────────────────────────────
    {'_key': 'templates',     'sort': 12, 'icon': 'templates',       'name': 'Biểu mẫu & Đơn từ',         'url': None,                  'parent': None},
    {'_key': 'form_proc',     'sort': 121,'icon': 'formmanagement',  'name': 'Xử lý đơn từ',              'url': '/templates/formmanagement','parent': 'templates'},
    {'_key': 'form_mgmt',     'sort': 122,'icon': 'form-manage',     'name': 'Quản lý biểu mẫu',          'url': '/templates',          'parent': 'templates'},
]


class Command(BaseCommand):
    help = 'Seed menu function tree + Admin role with all-view permissions'

    def handle(self, *args, **options):
        # 1. Create / ensure "view" Action
        view_action, _ = Action.objects.get_or_create(
            code='view',
            defaults={'name': 'Xem'},
        )

        # 2. Create Function tree (two passes: root first, then children)
        func_map = {}  # _key → Function instance

        def _upsert(item, parent_obj):
            func, _ = Function.objects.update_or_create(
                icon=item['icon'],
                defaults={
                    'name': item['name'],
                    'url': item['url'],
                    'parent_id': parent_obj.pk if parent_obj else None,
                    'sort_order': item['sort'],
                },
            )
            func_map[item['_key']] = func
            return func

        # Pass 1 – roots
        for item in FUNCTIONS:
            if item['parent'] is None:
                _upsert(item, None)

        # Pass 2 – children (may be 2 levels deep, so loop until stable)
        remaining = [i for i in FUNCTIONS if i['parent'] is not None]
        max_passes = 5
        for _ in range(max_passes):
            unresolved = []
            for item in remaining:
                if item['parent'] in func_map:
                    _upsert(item, func_map[item['parent']])
                else:
                    unresolved.append(item)
            remaining = unresolved
            if not remaining:
                break

        if remaining:
            self.stdout.write(self.style.WARNING(
                f'{len(remaining)} functions could not be resolved (parent not found): '
                + ', '.join(i["_key"] for i in remaining)
            ))

        # 3. Create Admin role
        admin_role, _ = Role.objects.get_or_create(
            name='Admin',
            defaults={'description': 'Full access'},
        )

        # 4. Grant Admin view-permission on all functions
        created = 0
        for func in func_map.values():
            _, was_created = Permission.objects.get_or_create(
                role=admin_role, function=func, action=view_action,
            )
            if was_created:
                created += 1

        # 5. Assign Admin role to all superusers
        assigned = 0
        for su in User.objects.filter(is_superuser=True, is_deleted=False):
            _, was_created = UserRole.objects.get_or_create(user=su, role=admin_role)
            if was_created:
                assigned += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Functions: {len(func_map)}, new permissions: {created}, '
            f'superusers assigned Admin role: {assigned}'
        ))
