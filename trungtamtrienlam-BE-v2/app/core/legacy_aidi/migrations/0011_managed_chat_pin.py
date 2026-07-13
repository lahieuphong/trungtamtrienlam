import core.legacy_aidi.models
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0010_managed_chat_seen'),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedChatPin',
            fields=[
                ('id', models.CharField(default=core.legacy_aidi.models.managed_chat_id_generator, max_length=64, primary_key=True, serialize=False)),
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
    ]
