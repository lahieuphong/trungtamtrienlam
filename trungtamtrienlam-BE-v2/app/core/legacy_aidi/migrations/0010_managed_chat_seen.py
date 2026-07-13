import core.legacy_aidi.models
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0009_managed_chat'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedChatSeen',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_id', models.CharField(max_length=64)),
                ('chat_message_id', models.CharField(blank=True, default='', max_length=64)),
                ('user_id', models.CharField(max_length=64)),
                ('seen_date', models.DateTimeField(auto_now=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat seen',
                'verbose_name_plural': 'Managed chat seen',
                'db_table': 'aidi_managed_chat_seen',
                'ordering': ('chat_id', 'user_id'),
                'unique_together': {('chat_id', 'user_id')},
            },
        ),
    ]
