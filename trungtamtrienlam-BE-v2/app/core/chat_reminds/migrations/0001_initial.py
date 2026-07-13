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
            name='ManagedChatRemind',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('remind_name', models.CharField(blank=True, max_length=255, null=True)),
                ('remind_content', models.TextField(blank=True, null=True)),
                ('chat', models.ForeignKey(blank=True, db_column='chat_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_reminds', to='chats.managedchat')),
                ('remind_time', models.DateTimeField(blank=True, null=True)),
                ('repeat_type', models.IntegerField(blank=True, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(blank=True, null=True)),
                ('count_join', models.IntegerField(blank=True, null=True)),
                ('count_not_join', models.IntegerField(blank=True, null=True)),
                ('user_join', models.TextField(blank=True, null=True)),
                ('user_not_join', models.TextField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat remind',
                'verbose_name_plural': 'Managed chat reminds',
                'db_table': 'aidi_managed_chat_reminds',
                'ordering': ('-remind_time', '-created_date', 'id'),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatRemindJob',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat_remind', models.ForeignKey(blank=True, db_column='chat_remind_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='jobs', to='chat_reminds.managedchatremind')),
                ('job_id', models.CharField(blank=True, max_length=255, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('status', models.IntegerField(blank=True, null=True)),
                ('type', models.IntegerField(blank=True, null=True)),
                ('time', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat remind job',
                'verbose_name_plural': 'Managed chat remind jobs',
                'db_table': 'aidi_managed_chat_remind_jobs',
                'ordering': ('time', 'id'),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatRemindUser',
            fields=[
                ('id', models.CharField(default=core.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('chat', models.ForeignKey(blank=True, db_column='chat_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_remind_users', to='chats.managedchat')),
                ('chat_remind', models.ForeignKey(blank=True, db_column='chat_remind_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='users', to='chat_reminds.managedchatremind')),
                ('user_id', models.CharField(blank=True, max_length=64, null=True)),
                ('type', models.BooleanField(blank=True, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('modified_date', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Managed chat remind user',
                'verbose_name_plural': 'Managed chat remind users',
                'db_table': 'aidi_managed_chat_remind_users',
                'ordering': ('created_date', 'id'),
            },
        ),
    ]


