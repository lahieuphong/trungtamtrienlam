import apps.chats.models
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
            name='ManagedChatVote',
            fields=[
                ('id', models.CharField(default=apps.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('vote_name', models.CharField(blank=True, max_length=255, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('date_end', models.DateTimeField(blank=True, null=True)),
                ('is_multi', models.BooleanField(blank=True, null=True)),
                ('remind_vote', models.BooleanField(blank=True, null=True)),
                ('is_completed', models.BooleanField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(blank=True, null=True)),
                ('is_pin', models.BooleanField(blank=True, null=True)),
                ('pin_date', models.DateTimeField(blank=True, null=True)),
                ('chat', models.ForeignKey(blank=True, db_column='chat_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_votes', to='chats.managedchat')),
            ],
            options={
                'verbose_name': 'Managed chat vote',
                'verbose_name_plural': 'Managed chat votes',
                'db_table': 'aidi_managed_chat_votes',
                'ordering': ('-is_pin', '-pin_date', '-created_date', 'id'),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatVoteOption',
            fields=[
                ('id', models.CharField(default=apps.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('option_name', models.CharField(blank=True, max_length=255, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('chat', models.ForeignKey(blank=True, db_column='chat_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_vote_options', to='chats.managedchat')),
                ('vote', models.ForeignKey(blank=True, db_column='vote_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='options', to='chat_votes.managedchatvote')),
            ],
            options={
                'verbose_name': 'Managed chat vote option',
                'verbose_name_plural': 'Managed chat vote options',
                'db_table': 'aidi_managed_chat_vote_options',
                'ordering': ('created_date', 'id'),
            },
        ),
        migrations.CreateModel(
            name='ManagedChatVoteResult',
            fields=[
                ('id', models.CharField(default=apps.chats.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
                ('user_id', models.CharField(blank=True, max_length=64, null=True)),
                ('created_date', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('chat', models.ForeignKey(blank=True, db_column='chat_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='chat_vote_results', to='chats.managedchat')),
                ('option', models.ForeignKey(blank=True, db_column='option_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='results', to='chat_votes.managedchatvoteoption')),
                ('vote', models.ForeignKey(blank=True, db_column='vote_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='results', to='chat_votes.managedchatvote')),
            ],
            options={
                'verbose_name': 'Managed chat vote result',
                'verbose_name_plural': 'Managed chat vote results',
                'db_table': 'aidi_managed_chat_vote_results',
                'ordering': ('created_date', 'id'),
            },
        ),
    ]


