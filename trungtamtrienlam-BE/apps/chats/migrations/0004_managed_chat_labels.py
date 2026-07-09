from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chats', '0003_admin_labels'),
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
        migrations.AlterModelOptions(
            name='managedchatuser',
            options={
                'ordering': ('chat_id', 'role', 'created_date'),
                'verbose_name': 'Thành viên cuộc trò chuyện',
                'verbose_name_plural': 'Thành viên cuộc trò chuyện',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatmessage',
            options={
                'ordering': ('created_date',),
                'verbose_name': 'Tin nhắn cuộc trò chuyện',
                'verbose_name_plural': 'Tin nhắn cuộc trò chuyện',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatfile',
            options={
                'ordering': ('created_date',),
                'verbose_name': 'Tệp đính kèm tin nhắn',
                'verbose_name_plural': 'Tệp đính kèm tin nhắn',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatlink',
            options={
                'ordering': ('created_date',),
                'verbose_name': 'Liên kết tin nhắn',
                'verbose_name_plural': 'Liên kết tin nhắn',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatseen',
            options={
                'ordering': ('chat_id', 'user_id'),
                'verbose_name': 'Lượt đọc tin nhắn',
                'verbose_name_plural': 'Lượt đọc tin nhắn',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatpin',
            options={
                'ordering': ('-pin_date',),
                'verbose_name': 'Ghim cuộc trò chuyện',
                'verbose_name_plural': 'Ghim cuộc trò chuyện',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatawaitconfirm',
            options={
                'ordering': ('-created_date',),
                'verbose_name': 'Yêu cầu tham gia cuộc trò chuyện',
                'verbose_name_plural': 'Yêu cầu tham gia cuộc trò chuyện',
            },
        ),
    ]
