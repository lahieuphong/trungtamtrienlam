from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_stafffile_type_file_choices'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='province',
            name='legacy_code',
        ),
    ]
