from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='PaymentOrder',
        ),
    ]
