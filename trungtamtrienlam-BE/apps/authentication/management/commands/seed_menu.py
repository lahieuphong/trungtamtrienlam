"""
python manage.py seed_menu
Seed menu, permissions, roles, departments, organizations and current provinces.
Safe to re-run.
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.authentication.models import Function, Action, Role, Permission, UserRole, User
from apps.accounts.models import Province, District, Organization
from apps.accounts.vn_admin_units import CURRENT_PROVINCES
from apps.departments.models import Department

FUNCTIONS = [
    {'_key': 'dashboard', 'sort': 1, 'icon': 'dashboard', 'name': 'T\u1ed5ng quan', 'url': '/dashboard', 'parent': None},
    {'_key': 'calendar', 'sort': 2, 'icon': 'Calendar', 'name': 'Qu\u1ea3n l\u00fd l\u1ecbch', 'url': '/calendar', 'parent': None},
    {'_key': 'documents', 'sort': 3, 'icon': 'documents', 'name': 'Th\u01b0 vi\u1ec7n v\u0103n b\u1ea3n', 'url': '/documents', 'parent': None},

    {'_key': 'media', 'sort': 4, 'icon': 'Media', 'name': 'Qu\u1ea3n l\u00fd kho l\u01b0u tr\u1eef', 'url': None, 'parent': None},
    {'_key': 'media_audio', 'sort': 41, 'icon': 'Media-audio', 'name': '\u00c2m thanh', 'url': '/media/audio', 'parent': 'media'},
    {'_key': 'media_img', 'sort': 42, 'icon': 'Media-images', 'name': 'H\u00ecnh \u1ea3nh', 'url': '/media/images', 'parent': 'media'},
    {'_key': 'media_video', 'sort': 43, 'icon': 'Media-videos', 'name': 'Phim \u1ea3nh', 'url': '/media/videos', 'parent': 'media'},
    {'_key': 'media_doc', 'sort': 44, 'icon': 'Media-documents', 'name': 'T\u00e0i li\u1ec7u', 'url': '/media/documents', 'parent': 'media'},
    {'_key': 'media_3d', 'sort': 45, 'icon': 'Media-3d', 'name': '3D', 'url': '/media/3d', 'parent': 'media'},
    {'_key': 'media_share', 'sort': 46, 'icon': 'Media-share-foler', 'name': 'Chia s\u1ebb th\u01b0 m\u1ee5c', 'url': '/media/share-folder', 'parent': 'media'},
    {'_key': 'media_trash', 'sort': 47, 'icon': 'Media-trash', 'name': 'Th\u00f9ng r\u00e1c', 'url': '/media/trash', 'parent': 'media'},
    {'_key': 'archives', 'sort': 48, 'icon': 'Archives', 'name': 'T\u1ed5ng h\u1ee3p d\u1eef li\u1ec7u', 'url': '/archives', 'parent': 'media'},

    {'_key': 'tasks', 'sort': 5, 'icon': 'Tasks', 'name': 'Qu\u1ea3n l\u00fd nhi\u1ec7m v\u1ee5', 'url': None, 'parent': None},
    {'_key': 'task', 'sort': 51, 'icon': 'Task', 'name': 'Nhi\u1ec7m v\u1ee5', 'url': '/tasks/tasks', 'parent': 'tasks'},
    {'_key': 'internal', 'sort': 52, 'icon': 'internal', 'name': 'C\u00f4ng v\u0103n n\u1ed9i b\u1ed9', 'url': '/tasks/internal', 'parent': 'tasks'},
    {'_key': 'pending', 'sort': 53, 'icon': 'pendingIssuance', 'name': 'C\u00f4ng v\u0103n \u0111i \u0111\u1ebfn', 'url': '/tasks/pendingIssuance', 'parent': 'tasks'},
    {'_key': 'issued', 'sort': 54, 'icon': 'degital', 'name': 'C\u00f4ng v\u0103n ban h\u00e0nh', 'url': '/tasks/degital', 'parent': 'tasks'},

    {'_key': 'monument', 'sort': 6, 'icon': 'Monument', 'name': 'Qu\u1ea3n l\u00fd di t\u00edch', 'url': None, 'parent': None},
    {'_key': 'mon_review', 'sort': 61, 'icon': 'Mon-review', 'name': 'H\u1ed3 s\u01a1 x\u00e9t duy\u1ec7t', 'url': '/monument-profile', 'parent': 'monument'},
    {'_key': 'mon_private', 'sort': 62, 'icon': 'Monument-Private', 'name': 'H\u1ed3 s\u01a1 kh\u00f4ng c\u00f4ng khai', 'url': '/monument-profile/private', 'parent': 'monument'},
    {'_key': 'mon_all', 'sort': 63, 'icon': 'Mon-all', 'name': 'To\u00e0n b\u1ed9 h\u1ed3 s\u01a1', 'url': '/monument-profile/all', 'parent': 'monument'},
    {'_key': 'mon_public', 'sort': 64, 'icon': 'Mon-public', 'name': 'H\u1ed3 s\u01a1 c\u00f4ng khai', 'url': None, 'parent': 'monument'},
    {'_key': 'mon_menu', 'sort': 641, 'icon': 'Mon-menu', 'name': 'Qu\u1ea3n l\u00fd menu', 'url': '/websites/menu', 'parent': 'mon_public'},
    {'_key': 'mon_news', 'sort': 642, 'icon': 'Mon-news', 'name': 'Qu\u1ea3n l\u00fd tin t\u1ee9c', 'url': '/websites/news', 'parent': 'mon_public'},
    {'_key': 'mon_home', 'sort': 643, 'icon': 'Mon-home', 'name': 'Qu\u1ea3n l\u00fd trang ch\u1ee7', 'url': '/websites/home', 'parent': 'mon_public'},
    {'_key': 'mon_about', 'sort': 644, 'icon': 'Mon-about', 'name': 'Qu\u1ea3n l\u00fd gi\u1edbi thi\u1ec7u', 'url': '/websites/about-us', 'parent': 'mon_public'},
    {'_key': 'mon_config', 'sort': 645, 'icon': 'Mon-config', 'name': 'C\u1ea5u h\u00ecnh', 'url': '/websites/config', 'parent': 'mon_public'},
    {'_key': 'mon_contacts', 'sort': 646, 'icon': 'Mon-contacts', 'name': 'Danh s\u00e1ch li\u00ean h\u1ec7', 'url': '/websites/contact', 'parent': 'mon_public'},
    {'_key': 'mon_3d', 'sort': 647, 'icon': 'Mon-3d', 'name': 'Di t\u00edch 3D', 'url': '/websites/monument-3d', 'parent': 'mon_public'},

    {'_key': 'ratings', 'sort': 7, 'icon': 'Ratings', 'name': '\u0110\u00e1nh gi\u00e1 x\u1ebfp h\u1ea1ng', 'url': None, 'parent': None},
    {'_key': 'crit_set', 'sort': 71, 'icon': 'Setting-criterias', 'name': 'Thi\u1ebft l\u1eadp ti\u00eau ch\u00ed', 'url': '/ratings/setting-criterias', 'parent': 'ratings'},
    {'_key': 'award_set', 'sort': 72, 'icon': 'Setting-awards', 'name': 'Thi\u1ebft l\u1eadp danh hi\u1ec7u', 'url': '/ratings/setting-awards', 'parent': 'ratings'},
    {'_key': 'rank_set', 'sort': 73, 'icon': 'Setting-rankings', 'name': 'Thi\u1ebft l\u1eadp x\u1ebfp h\u1ea1ng', 'url': '/ratings/setting-ranking', 'parent': 'ratings'},
    {'_key': 'leaderboard', 'sort': 74, 'icon': 'rankings', 'name': 'B\u1ea3ng x\u1ebfp h\u1ea1ng', 'url': '/ratings/rankings', 'parent': 'ratings'},
    {'_key': 'awards', 'sort': 75, 'icon': 'awards', 'name': 'Danh hi\u1ec7u', 'url': '/ratings/awards', 'parent': 'ratings'},

    {'_key': 'permission', 'sort': 8, 'icon': 'Permission', 'name': 'Ph\u00e2n quy\u1ec1n ch\u1ee9c n\u0103ng', 'url': '/permissions', 'parent': None},
    {'_key': 'staff', 'sort': 9, 'icon': 'Staff', 'name': 'Qu\u1ea3n l\u00fd t\u00e0i kho\u1ea3n', 'url': '/accounts', 'parent': None},
    {'_key': 'wordprocess', 'sort': 10, 'icon': 'wordprocessing', 'name': 'V\u0103n b\u1ea3n h\u00e0nh ch\u00ednh c\u00e1 nh\u00e2n', 'url': '/templates/wordprocessing', 'parent': None},

    {'_key': 'settings', 'sort': 11, 'icon': 'Settings', 'name': 'C\u00e0i \u0111\u1eb7t h\u1ec7 th\u1ed1ng', 'url': None, 'parent': None},
    {'_key': 'set_config', 'sort': 111, 'icon': 'Set-config', 'name': 'C\u1ea5u h\u00ecnh h\u1ec7 th\u1ed1ng', 'url': '/settings/system', 'parent': 'settings'},
    {'_key': 'set_notif', 'sort': 112, 'icon': 'Set-notif', 'name': 'C\u00e0i \u0111\u1eb7t th\u00f4ng b\u00e1o', 'url': '/settings/notification', 'parent': 'settings'},
    {'_key': 'set_maint', 'sort': 113, 'icon': 'Set-maint', 'name': 'B\u1ea3o tr\u00ec h\u1ec7 th\u1ed1ng', 'url': '/settings/maintenance', 'parent': 'settings'},

    {'_key': 'templates', 'sort': 12, 'icon': 'templates', 'name': 'Bi\u1ec3u m\u1eabu & \u0111\u01a1n t\u1eeb', 'url': None, 'parent': None},
    {'_key': 'form_proc', 'sort': 121, 'icon': 'formmanagement', 'name': 'X\u1eed l\u00fd \u0111\u01a1n t\u1eeb', 'url': '/templates/formmanagement', 'parent': 'templates'},
    {'_key': 'form_mgmt', 'sort': 122, 'icon': 'form-manage', 'name': 'Qu\u1ea3n l\u00fd bi\u1ec3u m\u1eabu', 'url': '/templates', 'parent': 'templates'},
]

ACTION_SEEDS = [
    ('view', 'Xem'),
    ('add', 'Th\u00eam'),
    ('edit', 'S\u1eeda'),
    ('delete', 'X\u00f3a'),
    ('verify', 'Duy\u1ec7t'),
    ('refuse', 'Kh\u00f4ng duy\u1ec7t'),
    ('download', 'T\u1ea3i xu\u1ed1ng'),
    ('isPublic', 'C\u00f4ng khai'),
]

ROLE_SEEDS = [
    {'name': 'Admin', 'description': 'Full access', 'is_director': False, 'is_admin': True},
    {'name': 'Gi\u00e1m \u0111\u1ed1c', 'description': 'Vai tr\u00f2 l\u00e3nh \u0111\u1ea1o', 'is_director': True, 'is_admin': False},
    {'name': 'Tr\u01b0\u1edfng ph\u00f2ng', 'description': 'Qu\u1ea3n l\u00fd ph\u00f2ng ban', 'is_director': False, 'is_admin': False},
    {'name': 'Chuy\u00ean vi\u00ean', 'description': 'Nh\u00e2n s\u1ef1 nghi\u1ec7p v\u1ee5', 'is_director': False, 'is_admin': False},
]

DEPARTMENT_SEEDS = [
    {'code': 'BGD', 'name': 'Ban Gi\u00e1m \u0111\u1ed1c', 'sort_order': 1},
    {'code': 'HCTH', 'name': 'Ph\u00f2ng H\u00e0nh ch\u00ednh - T\u1ed5ng h\u1ee3p', 'sort_order': 2},
    {'code': 'NV', 'name': 'Ph\u00f2ng Nghi\u1ec7p v\u1ee5', 'sort_order': 3},
]

DISTRICT_SEEDS = [
    {'code': 'Q1', 'name': 'Qu\u1eadn 1'},
    {'code': 'GV', 'name': 'Qu\u1eadn G\u00f2 V\u1ea5p'},
    {'code': 'BT', 'name': 'Qu\u1eadn B\u00ecnh Th\u1ea1nh'},
    {'code': 'TPTD', 'name': 'Th\u00e0nh ph\u1ed1 Th\u1ee7 \u0110\u1ee9c'},
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

        Organization.objects.update_or_create(
            code='TTTTL',
            defaults={'name': 'Trung t\u00e2m Th\u00f4ng tin Tri\u1ec3n l\u00e3m', 'is_deleted': False},
        )

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
                    'is_deleted': False,
                },
            )
            roles[item['name']] = role

        admin_role = roles['Admin']
        created = 0
        for func in func_map.values():
            for action in actions.values():
                _, was_created = Permission.objects.get_or_create(
                    role=admin_role,
                    department_id='',
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
            f'new permissions: {created}, users assigned Admin role: {assigned}'
        ))
