from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chat_votes', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='managedchatvote',
            options={
                'ordering': ('-is_pin', '-pin_date', '-created_date', 'id'),
                'verbose_name': 'Bình chọn cuộc trò chuyện',
                'verbose_name_plural': 'Bình chọn cuộc trò chuyện',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatvoteoption',
            options={
                'ordering': ('created_date', 'id'),
                'verbose_name': 'Lựa chọn bình chọn',
                'verbose_name_plural': 'Lựa chọn bình chọn',
            },
        ),
        migrations.AlterModelOptions(
            name='managedchatvoteresult',
            options={
                'ordering': ('created_date', 'id'),
                'verbose_name': 'Kết quả bình chọn',
                'verbose_name_plural': 'Kết quả bình chọn',
            },
        ),
    ]
