from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_role_185_fields_roledepartment'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='ward_id',
            field=models.UUIDField(blank=True, null=True),
        ),
    ]
