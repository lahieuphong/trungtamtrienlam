# Generated for Django-managed AIDI staff creation.

from django.conf import settings
from django.db import migrations
from django.db import models
import django.db.models.deletion

import core.legacy_aidi.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('legacy_aidi', '0002_managed_department'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedStaffProfile',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_staff_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('province_id', models.CharField(blank=True, default='', max_length=64)),
                ('district_id', models.CharField(blank=True, default='', max_length=64)),
                ('ward_id', models.CharField(blank=True, default='', max_length=64)),
                ('address', models.TextField(blank=True, default='')),
                ('avatar', models.CharField(blank=True, default='', max_length=500)),
                ('sign', models.CharField(blank=True, default='', max_length=500)),
                ('stamp', models.CharField(blank=True, default='', max_length=500)),
                ('sign_encrypted', models.TextField(blank=True, default='')),
                ('stamp_encrypted', models.TextField(blank=True, default='')),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
                ('modified_by', models.TextField(blank=True, null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='managed_staff_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Managed staff profile',
                'verbose_name_plural': 'Managed staff profiles',
                'db_table': 'aidi_managed_staff_profiles',
                'ordering': ('user__username',),
            },
        ),
        migrations.CreateModel(
            name='ManagedStaffPosition',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_staff_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('role_id', models.CharField(max_length=64)),
                ('department_id', models.CharField(max_length=64)),
                ('organization_id', models.CharField(blank=True, default='', max_length=64)),
                ('is_default', models.BooleanField(default=False)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
                ('modified_by', models.TextField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='managed_staff_positions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Managed staff position',
                'verbose_name_plural': 'Managed staff positions',
                'db_table': 'aidi_managed_staff_positions',
                'ordering': ('user_id', '-is_default', 'created_date'),
            },
        ),
    ]
