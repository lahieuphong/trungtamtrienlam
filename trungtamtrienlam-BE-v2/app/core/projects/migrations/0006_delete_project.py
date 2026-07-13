from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0005_project_project_video'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Project',
        ),
    ]
