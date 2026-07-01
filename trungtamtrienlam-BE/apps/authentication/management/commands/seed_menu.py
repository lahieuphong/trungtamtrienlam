"""
python manage.py seed_menu
Seed menu, permissions, roles, departments, organizations and current provinces.
Safe to re-run.
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.authentication.models import Function, Action, FunctionAction, Role, Permission, UserRole, User
from apps.authentication.permission_matrix import get_allowed_actions_for_function, get_default_actions_for_function
from apps.accounts.models import Province, District, Organization
from apps.accounts.vn_admin_units import CURRENT_PROVINCES
from apps.departments.models import Department

FUNCTIONS = [
    {'_key': 'dashboard', 'sort': 1, 'icon': 'dashboard', 'name': 'Tổng quan', 'url': '/dashboard', 'parent': None},
    {'_key': 'calendar', 'sort': 2, 'icon': 'Calendar', 'name': 'Quản lý lịch', 'url': '/calendar', 'parent': None},
    {'_key': 'documents', 'sort': 3, 'icon': 'documents', 'name': 'Thư viện văn bản', 'url': '/documents', 'parent': None},

    {'_key': 'media', 'sort': 4, 'icon': 'Media', 'name': 'Quản lý kho lưu trữ', 'url': None, 'parent': None},
    {'_key': 'media_audio', 'sort': 41, 'icon': 'Media-audio', 'name': 'Âm thanh', 'url': '/media/audio', 'parent': 'media'},
    {'_key': 'media_img', 'sort': 42, 'icon': 'Media-images', 'name': 'Hình ảnh', 'url': '/media/images', 'parent': 'media'},
    {'_key': 'media_video', 'sort': 43, 'icon': 'Media-videos', 'name': 'Phim ảnh', 'url': '/media/videos', 'parent': 'media'},
    {'_key': 'media_doc', 'sort': 44, 'icon': 'Media-documents', 'name': 'Tài liệu', 'url': '/media/documents', 'parent': 'media'},
    {'_key': 'media_3d', 'sort': 45, 'icon': 'Media-3d', 'name': '3D', 'url': '/media/3d', 'parent': 'media'},
    {'_key': 'media_share', 'sort': 46, 'icon': 'Media-share-foler', 'name': 'Chia sẻ thư mục', 'url': '/media/share-folder', 'parent': 'media'},
    {'_key': 'media_trash', 'sort': 47, 'icon': 'Media-trash', 'name': 'Thùng rác', 'url': '/media/trash', 'parent': 'media'},
    {'_key': 'archives', 'sort': 48, 'icon': 'Archives', 'name': 'Tổng hợp dữ liệu', 'url': '/archives', 'parent': 'media'},

    {'_key': 'tasks', 'sort': 5, 'icon': 'Tasks', 'name': 'Quản lý nhiệm vụ', 'url': None, 'parent': None},
    {'_key': 'task', 'sort': 51, 'icon': 'Task', 'name': 'Nhiệm vụ', 'url': '/tasks/tasks', 'parent': 'tasks'},
    {'_key': 'internal', 'sort': 52, 'icon': 'internal', 'name': 'Công văn nội bộ', 'url': '/tasks/internal', 'parent': 'tasks'},
    {'_key': 'pending', 'sort': 53, 'icon': 'pendingIssuance', 'name': 'Công văn đi đến', 'url': '/tasks/pendingIssuance', 'parent': 'tasks'},
    {'_key': 'issued', 'sort': 54, 'icon': 'degital', 'name': 'Công văn ban hành', 'url': '/tasks/degital', 'parent': 'tasks'},

    {'_key': 'monument', 'sort': 6, 'icon': 'Monument', 'name': 'Quản lý di tích', 'url': None, 'parent': None},
    {'_key': 'mon_review', 'sort': 61, 'icon': 'Mon-review', 'name': 'Hồ sơ xét duyệt', 'url': '/monument-profile', 'parent': 'monument'},
    {'_key': 'mon_private', 'sort': 62, 'icon': 'Monument-Private', 'name': 'Hồ sơ không công khai', 'url': '/monument-profile/private', 'parent': 'monument'},
    {'_key': 'mon_all', 'sort': 63, 'icon': 'Mon-all', 'name': 'Toàn bộ hồ sơ', 'url': '/monument-profile/all', 'parent': 'monument'},
    {'_key': 'mon_public', 'sort': 64, 'icon': 'Mon-public', 'name': 'Hồ sơ công khai', 'url': None, 'parent': 'monument'},
    {'_key': 'mon_menu', 'sort': 641, 'icon': 'Mon-menu', 'name': 'Quản lý menu', 'url': '/websites/menu', 'parent': 'mon_public'},
    {'_key': 'mon_news', 'sort': 642, 'icon': 'Mon-news', 'name': 'Quản lý tin tức', 'url': '/websites/news', 'parent': 'mon_public'},
    {'_key': 'mon_home', 'sort': 643, 'icon': 'Mon-home', 'name': 'Quản lý trang chủ', 'url': '/websites/home', 'parent': 'mon_public'},
    {'_key': 'mon_about', 'sort': 644, 'icon': 'Mon-about', 'name': 'Quản lý giới thiệu', 'url': '/websites/about-us', 'parent': 'mon_public'},
    {'_key': 'mon_config', 'sort': 645, 'icon': 'Mon-config', 'name': 'Cấu hình', 'url': '/websites/config', 'parent': 'mon_public'},
    {'_key': 'mon_contacts', 'sort': 646, 'icon': 'Mon-contacts', 'name': 'Danh sách liên hệ', 'url': '/websites/contact', 'parent': 'mon_public'},
    {'_key': 'mon_3d', 'sort': 647, 'icon': 'Mon-3d', 'name': 'Di tích 3D', 'url': '/websites/monument-profile/create/public', 'parent': 'mon_public'},

    {'_key': 'ratings', 'sort': 7, 'icon': 'Ratings', 'name': 'Đánh giá xếp hạng', 'url': None, 'parent': None},
    {'_key': 'crit_set', 'sort': 71, 'icon': 'Setting-criterias', 'name': 'Thiết lập tiêu chí', 'url': '/ratings/setting-criterias', 'parent': 'ratings'},
    {'_key': 'award_set', 'sort': 72, 'icon': 'Setting-awards', 'name': 'Thiết lập danh hiệu', 'url': '/ratings/setting-awards', 'parent': 'ratings'},
    {'_key': 'rank_set', 'sort': 73, 'icon': 'Setting-rankings', 'name': 'Thiết lập xếp hạng', 'url': '/ratings/setting-ranking', 'parent': 'ratings'},
    {'_key': 'leaderboard', 'sort': 74, 'icon': 'rankings', 'name': 'Bảng xếp hạng', 'url': '/ratings/rankings', 'parent': 'ratings'},
    {'_key': 'awards', 'sort': 75, 'icon': 'awards', 'name': 'Danh hiệu', 'url': '/ratings/awards', 'parent': 'ratings'},

    {'_key': 'permission', 'sort': 8, 'icon': 'Permission', 'name': 'Phân quyền chức năng', 'url': '/permissions', 'parent': None},
    {'_key': 'staff', 'sort': 9, 'icon': 'Staff', 'name': 'Quản lý tài khoản', 'url': '/accounts', 'parent': None},
    {'_key': 'wordprocess', 'sort': 10, 'icon': 'wordprocessing', 'name': 'Văn bản hành chính cá nhân', 'url': '/templates/wordprocessing', 'parent': None},

    {'_key': 'settings', 'sort': 11, 'icon': 'Settings', 'name': 'Cài đặt hệ thống', 'url': None, 'parent': None},
    {'_key': 'set_config', 'sort': 111, 'icon': 'Set-config', 'name': 'Cấu hình hệ thống', 'url': '/settings/system', 'parent': 'settings'},
    {'_key': 'set_notif', 'sort': 112, 'icon': 'Set-notif', 'name': 'Cài đặt thông báo', 'url': '/settings/notification', 'parent': 'settings'},
    {'_key': 'set_maint', 'sort': 113, 'icon': 'Set-maint', 'name': 'Bảo trì hệ thống', 'url': '/settings/maintenance', 'parent': 'settings'},

    {'_key': 'templates', 'sort': 12, 'icon': 'templates', 'name': 'Biểu mẫu & đơn từ', 'url': None, 'parent': None},
    {'_key': 'form_proc', 'sort': 121, 'icon': 'formmanagement', 'name': 'Xử lý đơn từ', 'url': '/templates/formmanagement', 'parent': 'templates'},
    {'_key': 'form_mgmt', 'sort': 122, 'icon': 'form-manage', 'name': 'Quản lý biểu mẫu', 'url': '/templates', 'parent': 'templates'},
]

ACTION_SEEDS = [
    ('view', 'Xem'),
    ('add', 'Thêm'),
    ('edit', 'Sửa'),
    ('delete', 'Xóa'),
    ('verify', 'Duyệt'),
    ('refuse', 'Không duyệt'),
    ('download', 'Tải xuống'),
    ('isPublic', 'Công khai'),
]

ROLE_SEEDS = [
    {'name': 'Admin', 'description': 'Full access', 'level': 0, 'is_director': False, 'is_vice_director': False, 'is_admin': True, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Trưởng phòng', 'description': 'Quản lý phòng ban', 'level': 3, 'is_director': False, 'is_vice_director': False, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Giám đốc', 'description': 'Vai trò lãnh đạo', 'level': 1, 'is_director': True, 'is_vice_director': False, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Phó giám đốc', 'description': 'Vai trò phó lãnh đạo', 'level': 2, 'is_director': False, 'is_vice_director': True, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Nhân viên', 'description': 'Nhân sự nghiệp vụ', 'level': 4, 'is_director': False, 'is_vice_director': False, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': False, 'can_see_department_tasks': False},
]
DEPARTMENT_SEEDS = [
    {'code': 'HCTH', 'name': 'Phòng Hành Chính Tổng hợp', 'sort_order': 1},
    {'code': 'TBDT', 'name': 'Phòng Tu Bổ Di Tích', 'sort_order': 2},
    {'code': 'LHSDT', 'name': 'Phòng Lập Hồ Sơ Di Tích', 'sort_order': 3},
]

DISTRICT_SEEDS = [
    {'code': 'Q1', 'name': 'Quận 1'},
    {'code': 'GV', 'name': 'Quận Gò Vấp'},
    {'code': 'BT', 'name': 'Quận Bình Thạnh'},
    {'code': 'TPTD', 'name': 'Thành phố Thủ Đức'},
]


class Command(BaseCommand):
    help = 'Seed menu, permissions, roles, departments, organizations and current provinces'

    def handle(self, *args, **options):
        actions = {}
        for code, name in ACTION_SEEDS:
            action, _ = Action.objects.update_or_create(
                code=code,
                defaults={'name': name},
            )
            actions[code] = action

        func_map = {}

        def _upsert(item, parent_obj):
            func, _ = Function.objects.update_or_create(
                icon=item['icon'],
                defaults={
                    'name': item['name'],
                    'url': item['url'],
                    'parent_id': parent_obj.pk if parent_obj else None,
                    'sort_order': item['sort'],
                    'is_deleted': False,
                },
            )
            func_map[item['_key']] = func
            return func

        for item in FUNCTIONS:
            if item['parent'] is None:
                _upsert(item, None)

        remaining = [item for item in FUNCTIONS if item['parent'] is not None]
        for _ in range(5):
            unresolved = []
            for item in remaining:
                parent = func_map.get(item['parent'])
                if parent:
                    _upsert(item, parent)
                else:
                    unresolved.append(item)
            remaining = unresolved
            if not remaining:
                break

        if remaining:
            self.stdout.write(self.style.WARNING(
                f'{len(remaining)} functions could not be resolved: '
                + ', '.join(item['_key'] for item in remaining)
            ))

        for func in func_map.values():
            allowed_actions = set(get_default_actions_for_function(func))
            FunctionAction.objects.filter(function=func).exclude(action__code__in=allowed_actions).delete()
            for action_code in allowed_actions:
                action = actions.get(action_code)
                if action:
                    FunctionAction.objects.get_or_create(function=func, action=action)

        Organization.objects.update_or_create(
            code='TTTTL',
            defaults={'name': 'Trung tâm Thông tin Triển lãm', 'is_deleted': False},
        )

        Department.objects.filter(code__in=['BGD', 'NV']).update(is_deleted=True)

        for item in DEPARTMENT_SEEDS:
            Department.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'sort_order': item['sort_order'],
                    'description': item['name'],
                    'is_deleted': False,
                },
            )

        province_by_code = {}
        for item in CURRENT_PROVINCES:
            province, _ = Province.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'unit_type': item['unit_type'],
                    'is_disabled': False,
                    'is_deleted': False,
                },
            )
            province_by_code[item['code']] = province

        hcm = province_by_code.get('79')
        if hcm:
            for item in DISTRICT_SEEDS:
                District.objects.update_or_create(
                    code=item['code'],
                    province=hcm,
                    defaults={
                        'name': item['name'],
                        'is_legacy': True,
                        'is_disabled': True,
                        'is_deleted': False,
                    },
                )

        roles = {}
        for item in ROLE_SEEDS:
            role, _ = Role.objects.update_or_create(
                name=item['name'],
                defaults={
                    'description': item['description'],
                    'is_director': item['is_director'],
                    'is_admin': item['is_admin'],
                    'is_vice_director': item['is_vice_director'],
                    'level': item['level'],
                    'can_receive_task': item['can_receive_task'],
                    'can_assign_task': item['can_assign_task'],
                    'can_see_department_tasks': item['can_see_department_tasks'],
                    'is_disabled': False,
                    'is_deleted': False,
                },
            )
            roles[item['name']] = role

        Role.objects.filter(name='Chuyên viên').update(is_disabled=True)

        pruned = 0
        for func in Function.objects.filter(is_deleted=False):
            deleted_count, _ = Permission.objects.filter(function=func).exclude(
                action__code__in=get_allowed_actions_for_function(func)
            ).delete()
            pruned += deleted_count

        admin_role = roles['Admin']
        created = 0
        for func in func_map.values():
            for action_code in get_allowed_actions_for_function(func):
                action = actions.get(action_code)
                if not action:
                    continue
                _, was_created = Permission.objects.get_or_create(
                    role=admin_role,
                    department=None,
                    function=func,
                    action=action,
                )
                if was_created:
                    created += 1

        assigned = 0
        admin_users = User.objects.filter(is_deleted=False).filter(
            Q(is_superuser=True) | Q(is_staff=True) | Q(username__iexact='admin')
        )
        for user in admin_users:
            _, was_created = UserRole.objects.get_or_create(user=user, role=admin_role)
            if was_created:
                assigned += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Functions: {len(func_map)}, actions: {len(actions)}, '
            f'new permissions: {created}, pruned permissions: {pruned}, '
            f'users assigned Admin role: {assigned}'
        ))
