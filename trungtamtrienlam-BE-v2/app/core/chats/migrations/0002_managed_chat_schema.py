import core.chats.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chats', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedChat',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('name', models.CharField(blank=True, default='', max_length=255)),
                ('type', models.IntegerField(default=1)),
                ('avatar', models.CharField(blank=True, default='', max_length=500)),
                ('created_by', models.CharField(blank=True, default='', max_length=64)),
                ('updated_by', models.CharField(blank=True, default='', max_length=64)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('updated_date', models.DateTimeField(auto_now=True, null=True)),
                ('is_ai', models.BooleanField(default=False)),
                ('user_id', models.CharField(blank=True, default='', max_length=64)),
                ('event_type', models.IntegerField(blank=True, null=True)),
                ('pin_date', models.DateTimeField(blank=True, null=True)),
                ('link_id', models.CharField(blank=True, default='', max_length=255)),
                ('message_type', models.IntegerField(default=1)),
                ('is_deleted', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Managed chat',
                'verbose_name_plural': 'Managed chats',
                'db_table': 'aidi_managed_chats',
                'ordering': ('-updated_date', '-created_date'),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatAwaitConfirm',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
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
        migrations.CreateModel(
            name='ManagedChatFile',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_id', models.CharField(max_length=64)),
                ('message_id', models.CharField(max_length=64)),
                ('file', models.CharField(max_length=500)),
                ('file_name', models.CharField(blank=True, default='', max_length=255)),
                ('size', models.FloatField(default=0)),
                ('extension', models.CharField(blank=True, default='', max_length=64)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.CharField(blank=True, default='', max_length=64)),
            ],
            options={
                'verbose_name': 'Managed chat file',
                'verbose_name_plural': 'Managed chat files',
                'db_table': 'aidi_managed_chat_files',
                'ordering': ('created_date',),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatLink',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_id', models.CharField(max_length=64)),
                ('message_id', models.CharField(max_length=64)),
                ('link', models.TextField()),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('created_by', models.CharField(blank=True, default='', max_length=64)),
            ],
            options={
                'verbose_name': 'Managed chat link',
                'verbose_name_plural': 'Managed chat links',
                'db_table': 'aidi_managed_chat_links',
                'ordering': ('created_date',),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatMessage',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('sender_id', models.CharField(max_length=64)),
                ('message_type', models.IntegerField(default=1)),
                ('reply_to_id', models.CharField(blank=True, default='', max_length=64)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('is_unsend', models.BooleanField(default=False)),
                ('content', models.TextField(blank=True, default='')),
                ('chat_id', models.CharField(max_length=64)),
                ('event_id', models.CharField(blank=True, default='', max_length=64)),
                ('event_type', models.IntegerField(blank=True, null=True)),
                ('is_pin', models.BooleanField(default=False)),
                ('list_user_join_remind', models.TextField(blank=True, default='')),
            ],
            options={
                'verbose_name': 'Managed chat message',
                'verbose_name_plural': 'Managed chat messages',
                'db_table': 'aidi_managed_chat_messages',
                'ordering': ('created_date',),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatSeen',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
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
        migrations.CreateModel(
            name='ManagedChatPin',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_id', models.CharField(max_length=64)),
                ('user_id', models.CharField(max_length=64)),
                ('pin_date', models.DateTimeField(auto_now_add=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat pin',
                'verbose_name_plural': 'Managed chat pins',
                'db_table': 'aidi_managed_chat_pins',
                'ordering': ('-pin_date',),
                'unique_together': {('chat_id', 'user_id')},
            },
        ),
        migrations.CreateModel(
            name='ManagedChatUser',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_id', models.CharField(max_length=64)),
                ('user_id', models.CharField(max_length=64)),
                ('role', models.IntegerField(default=3)),
                ('add_by', models.CharField(blank=True, default='', max_length=64)),
                ('is_muted', models.BooleanField(default=False)),
                ('created_date', models.DateTimeField(auto_now_add=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat user',
                'verbose_name_plural': 'Managed chat users',
                'db_table': 'aidi_managed_chat_users',
                'ordering': ('chat_id', 'role', 'created_date'),
                'unique_together': {('chat_id', 'user_id')},
            },
        ),
    ]
