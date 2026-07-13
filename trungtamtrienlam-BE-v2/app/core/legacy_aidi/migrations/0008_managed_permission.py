import core.legacy_aidi.models
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0007_alter_managedmenuitem_icon_filefield'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedPermission',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_permission_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('role_id', models.CharField(max_length=64)),
                ('department_id', models.CharField(blank=True, default='', max_length=64)),
                ('function_id', models.CharField(max_length=64)),
                ('can_view', models.BooleanField(default=False)),
                ('can_add', models.BooleanField(default=False)),
                ('can_edit', models.BooleanField(default=False)),
                ('can_delete', models.BooleanField(default=False)),
                ('can_verify', models.BooleanField(blank=True, null=True)),
                ('can_refuse', models.BooleanField(blank=True, null=True)),
                ('can_download', models.BooleanField(blank=True, null=True)),
                ('is_public', models.BooleanField(blank=True, null=True)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
                ('modified_by', models.TextField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed permission',
                'verbose_name_plural': 'Managed permissions',
                'db_table': 'aidi_managed_permissions',
                'ordering': ('role_id', 'department_id', 'function_id'),
                'unique_together': {('role_id', 'department_id', 'function_id')},
            },
        ),
    ]
