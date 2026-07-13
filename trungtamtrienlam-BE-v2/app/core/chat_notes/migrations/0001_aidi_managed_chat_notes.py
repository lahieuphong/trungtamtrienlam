import core.chats.models
import django.db.models.deletion
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('chats', '0002_managed_chat_schema'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedChatNote',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('note', models.TextField(blank=True, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(blank=True, null=True)),
                ('is_pinned', models.BooleanField(blank=True, null=True)),
                ('pin_date', models.DateTimeField(blank=True, null=True)),
                ('chat', models.ForeignKey(blank=True, db_column='chat_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_notes', to='chats.managedchat')),
            ],
            options={
                'verbose_name': 'Managed chat note',
                'verbose_name_plural': 'Managed chat notes',
                'db_table': 'aidi_managed_chat_notes',
                'ordering': ('-is_pinned', '-pin_date', '-created_date', 'id'),
            },
        ),
    ]


