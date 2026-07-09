from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chat_reminds', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='managedchatremind',
            options={
                'ordering': ('-remind_time', '-created_date', 'id'),
                'verbose_name': 'Nhắc hẹn cuộc trò chuyện',
                'verbose_name_plural': 'Nhắc hẹn cuộc trò chuyện',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatremindjob',
            options={
                'ordering': ('time', 'id'),
                'verbose_name': 'Lịch chạy nhắc hẹn',
                'verbose_name_plural': 'Lịch chạy nhắc hẹn',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatreminduser',
            options={
                'ordering': ('created_date', 'id'),
                'verbose_name': 'Người tham gia nhắc hẹn',
                'verbose_name_plural': 'Người tham gia nhắc hẹn',
            },
        ),
    ]
