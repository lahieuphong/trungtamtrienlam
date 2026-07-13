import core.legacy_aidi.models
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0011_managed_chat_pin'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedChatAwaitConfirm',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_id', models.CharField(max_length=64)),
                ('user_id', models.CharField(max_length=64)),
                ('status', models.IntegerField(default=1)),
                ('created_by', models.CharField(blank=True, default='', max_length=64)),
                ('confirmed_by', models.CharField(blank=True, default='', max_length=64)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('confirmed_date', models.DateTimeField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(auto_now=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat await confirm',
                'verbose_name_plural': 'Managed chat await confirms',
                'db_table': 'aidi_managed_chat_await_confirms',
                'ordering': ('-created_date',),
            },
        ),
    ]
