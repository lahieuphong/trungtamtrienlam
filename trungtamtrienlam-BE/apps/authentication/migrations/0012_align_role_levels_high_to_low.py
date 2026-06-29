from django.db import migrations


def align_role_levels_high_to_low(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')

    Role.objects.filter(is_admin=True, is_deleted=False).update(level=0)
    Role.objects.filter(is_director=True, is_admin=False, is_deleted=False).update(level=1)
    Role.objects.filter(is_vice_director=True, is_admin=False, is_director=False, is_deleted=False).update(level=2)
    Role.objects.filter(
        is_admin=False,
        is_director=False,
        is_vice_director=False,
        can_assign_task=True,
        can_see_department_tasks=True,
        is_deleted=False,
    ).update(level=3)
    Role.objects.filter(
        is_admin=False,
        is_director=False,
        is_vice_director=False,
        can_assign_task=False,
        can_see_department_tasks=False,
        is_deleted=False,
    ).update(level=4)


def reverse_role_levels_like_185(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')

    Role.objects.filter(is_admin=True, is_deleted=False).update(level=0)
    Role.objects.filter(
        is_admin=False,
        is_director=False,
        is_vice_director=False,
        can_assign_task=True,
        can_see_department_tasks=True,
        is_deleted=False,
    ).update(level=1)
    Role.objects.filter(is_director=True, is_admin=False, is_deleted=False).update(level=2)
    Role.objects.filter(is_vice_director=True, is_admin=False, is_director=False, is_deleted=False).update(level=3)
    Role.objects.filter(
        is_admin=False,
        is_director=False,
        is_vice_director=False,
        can_assign_task=False,
        can_see_department_tasks=False,
        is_deleted=False,
    ).update(level=4)


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0011_normalize_permission_scope'),
    ]

    operations = [
        migrations.RunPython(align_role_levels_high_to_low, reverse_role_levels_like_185),
    ]