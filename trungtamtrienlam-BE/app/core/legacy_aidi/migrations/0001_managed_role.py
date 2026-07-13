# Generated for Django-managed AIDI roles.

from django.db import migrations
from django.db import models

import core.legacy_aidi.models


DEFAULT_ROLES = [
    {
        'id': '214B33E0-C91C-4DD5-B439-70513D442833',
        'name': 'Phụ Trách Giám Đốc Mảng In 3D',
        'is_admin': False,
        'is_director': True,
        'is_disabled': None,
        'is_deleted': None,
        'level': 2,
        'can_receive_task': False,
        'can_assign_task': True,
        'can_see_department_tasks': False,
        'is_vice_director': False,
    },
    {
        'id': '2e3a949f-eb02-424b-ba32-758be16045c9',
        'name': 'Trưởng phòng',
        'is_admin': False,
        'is_director': None,
        'is_disabled': None,
        'is_deleted': None,
        'level': 3,
        'can_receive_task': True,
        'can_assign_task': True,
        'can_see_department_tasks': True,
        'is_vice_director': False,
    },
    {
        'id': '68257468-8c07-4b93-ba3d-7f3ae8bcf1b3',
        'name': 'Giám đốc',
        'is_admin': False,
        'is_director': True,
        'is_disabled': None,
        'is_deleted': None,
        'level': 2,
        'can_receive_task': False,
        'can_assign_task': True,
        'can_see_department_tasks': False,
        'is_vice_director': False,
    },
    {
        'id': '776b553d-bd21-4dfc-8dc9-1bff5b9d80e1',
        'name': 'Nhân viên',
        'is_admin': False,
        'is_director': None,
        'is_disabled': None,
        'is_deleted': None,
        'level': 4,
        'can_receive_task': True,
        'can_assign_task': False,
        'can_see_department_tasks': False,
        'is_vice_director': False,
    },
]


def seed_default_roles(apps, schema_editor):
    ManagedRole = apps.get_model('legacy_aidi', 'ManagedRole')
    for role in DEFAULT_ROLES:
        ManagedRole.objects.get_or_create(id=role['id'], defaults=role)


def delete_default_roles(apps, schema_editor):
    ManagedRole = apps.get_model('legacy_aidi', 'ManagedRole')
    ManagedRole.objects.filter(id__in=[role['id'] for role in DEFAULT_ROLES]).delete()


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='ManagedRole',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_role_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('is_admin', models.BooleanField(default=False)),
                ('is_director', models.BooleanField(blank=True, null=True)),
                ('is_disabled', models.BooleanField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(blank=True, null=True)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
                ('modified_by', models.TextField(blank=True, null=True)),
                ('level', models.IntegerField(default=4)),
                ('can_receive_task', models.BooleanField(default=True)),
                ('can_assign_task', models.BooleanField(default=False)),
                ('can_see_department_tasks', models.BooleanField(default=False)),
                ('is_vice_director', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Managed role',
                'verbose_name_plural': 'Managed roles',
                'db_table': 'aidi_managed_roles',
                'ordering': ('level', 'name'),
            },
        ),
        migrations.RunPython(seed_default_roles, delete_default_roles),
    ]
