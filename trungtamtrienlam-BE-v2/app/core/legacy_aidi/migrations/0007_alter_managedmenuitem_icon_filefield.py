from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0006_alter_managedmenuitem_icon'),
    ]

    operations = [
        migrations.AlterField(
            model_name='managedmenuitem',
            name='icon',
            field=models.FileField(blank=True, max_length=500, null=True, upload_to='legacy_aidi/menu_icons/'),
        ),
    ]
