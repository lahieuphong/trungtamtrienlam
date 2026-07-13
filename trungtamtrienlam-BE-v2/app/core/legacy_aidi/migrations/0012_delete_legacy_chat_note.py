from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0011_managed_chat_pin'),
    ]

    operations = [
        migrations.DeleteModel(
            name='LegacyChatNote',
        ),
    ]
