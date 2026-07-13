from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ('legacy_aidi', '0005_legacyaction_legacyactioninfunction_legacyalert_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='managedmenuitem',
            name='icon',
            field=models.ImageField(blank=True, max_length=500, null=True, upload_to='legacy_aidi/menu_icons/'),
        ),
    ]
