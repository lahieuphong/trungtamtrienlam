from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chat_notes', '0001_aidi_managed_chat_notes'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='managedchatnote',
            options={
                'ordering': ('-is_pinned', '-pin_date', '-created_date', 'id'),
                'verbose_name': 'Ghi chú cuộc trò chuyện',
                'verbose_name_plural': 'Ghi chú cuộc trò chuyện',
            },
        ),
    ]
