from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chats', '0002_managed_chat_schema'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='managedchat',
            options={
                'ordering': ('-updated_date', '-created_date'),
                'verbose_name': 'Cuộc trò chuyện',
                'verbose_name_plural': 'Cuộc trò chuyện',
            },
        ),
    ]