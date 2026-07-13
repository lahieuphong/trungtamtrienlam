# Generated for Django-managed AIDI departments.

from django.db import migrations
from django.db import models

import core.legacy_aidi.models


DEFAULT_DEPARTMENTS = [
    {
        'id': 'dept-ban-giam-doc',
        'name': 'Ban Gi\u00e1m \u0110\u1ed1c',
        'is_deleted': False,
        'is_poad': False,
    },
    {
        'id': 'dept-hanh-chinh',
        'name': 'Ph\u00f2ng H\u00e0nh Ch\u00ednh',
        'is_deleted': False,
        'is_poad': False,
    },
    {
        'id': 'dept-thiet-ke-3d',
        'name': 'Ph\u00f2ng Thi\u1ebft K\u1ebf 3D',
        'is_deleted': False,
        'is_poad': False,
    },
    {
        'id': 'dept-nghiep-vu',
        'name': 'Ph\u00f2ng Nghi\u1ec7p V\u1ee5',
        'is_deleted': False,
        'is_poad': False,
    },
]


def seed_default_departments(apps, schema_editor):
    ManagedDepartment = apps.get_model('legacy_aidi', 'ManagedDepartment')
    for department in DEFAULT_DEPARTMENTS:
        ManagedDepartment.objects.get_or_create(id=department['id'], defaults=department)


def delete_default_departments(apps, schema_editor):
    ManagedDepartment = apps.get_model('legacy_aidi', 'ManagedDepartment')
    ManagedDepartment.objects.filter(
        id__in=[department['id'] for department in DEFAULT_DEPARTMENTS],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('legacy_aidi', '0001_managed_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedDepartment',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_department_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('is_deleted', models.BooleanField(blank=True, null=True)),
                ('is_poad', models.BooleanField(default=False)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
                ('modified_by', models.TextField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed department',
                'verbose_name_plural': 'Managed departments',
                'db_table': 'aidi_managed_departments',
                'ordering': ('name',),
            },
        ),
        migrations.RunPython(seed_default_departments, delete_default_departments),
    ]
