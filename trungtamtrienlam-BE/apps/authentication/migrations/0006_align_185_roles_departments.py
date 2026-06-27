from django.db import migrations


ROLE_SEEDS = [
    {'name': 'Admin', 'description': 'Full access', 'level': 0, 'is_director': False, 'is_vice_director': False, 'is_admin': True, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Trưởng phòng', 'description': 'Quản lý phòng ban', 'level': 1, 'is_director': False, 'is_vice_director': False, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Giám đốc', 'description': 'Vai trò lãnh đạo', 'level': 2, 'is_director': True, 'is_vice_director': False, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Phó giám đốc', 'description': 'Vai trò phó lãnh đạo', 'level': 3, 'is_director': False, 'is_vice_director': True, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': True, 'can_see_department_tasks': True},
    {'name': 'Nhân viên', 'description': 'Nhân sự nghiệp vụ', 'level': 4, 'is_director': False, 'is_vice_director': False, 'is_admin': False, 'can_receive_task': True, 'can_assign_task': False, 'can_see_department_tasks': False},
]

DEPARTMENT_SEEDS = [
    {'code': 'HCTH', 'name': 'Phòng Hành Chính Tổng hợp', 'sort_order': 1},
    {'code': 'TBDT', 'name': 'Phòng Tu Bổ Di Tích', 'sort_order': 2},
    {'code': 'LHSDT', 'name': 'Phòng Lập Hồ Sơ Di Tích', 'sort_order': 3},
]


def align_185_roles_departments(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')
    Department = apps.get_model('departments', 'Department')

    if not Role.objects.filter(name='Nhân viên').exists():
        Role.objects.filter(name='Chuyên viên').update(name='Nhân viên')
    else:
        Role.objects.filter(name='Chuyên viên').update(is_disabled=True)

    for item in ROLE_SEEDS:
        Role.objects.update_or_create(
            name=item['name'],
            defaults={
                'description': item['description'],
                'level': item['level'],
                'is_director': item['is_director'],
                'is_vice_director': item['is_vice_director'],
                'is_admin': item['is_admin'],
                'can_receive_task': item['can_receive_task'],
                'can_assign_task': item['can_assign_task'],
                'can_see_department_tasks': item['can_see_department_tasks'],
                'is_disabled': False,
                'is_deleted': False,
            },
        )

    if Department.objects.filter(code='NV').exists() and not Department.objects.filter(code='TBDT').exists():
        Department.objects.filter(code='NV').update(code='TBDT')

    Department.objects.filter(code='BGD').update(is_deleted=True)

    for item in DEPARTMENT_SEEDS:
        Department.objects.update_or_create(
            code=item['code'],
            defaults={
                'name': item['name'],
                'description': item['name'],
                'sort_order': item['sort_order'],
                'is_deleted': False,
            },
        )


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0003_staff_indexes'),
        ('authentication', '0005_user_ward_id'),
    ]

    operations = [
        migrations.RunPython(align_185_roles_departments, reverse_noop),
    ]