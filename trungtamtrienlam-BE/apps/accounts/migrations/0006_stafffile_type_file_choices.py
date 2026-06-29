# Generated to display StaffFile type_file labels in Django admin.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_align_current_admin_unit_state'),
    ]

    operations = [
        migrations.AlterField(
            model_name='stafffile',
            name='type_file',
            field=models.IntegerField(
                choices=[
                    (0, 'Hình đại diện'),
                    (1, 'Chữ ký'),
                    (2, 'Chữ ký có con dấu'),
                ],
                default=0,
                verbose_name='Loại file',
            ),
        ),
    ]