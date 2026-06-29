import uuid

import django.db.models.deletion
from django.db import migrations, models


ACTION_CODES = ('view', 'add', 'edit', 'delete', 'verify', 'refuse', 'download', 'isPublic')
VIEW_ACTIONS = ('view',)
CRUD_ACTIONS = ('view', 'add', 'edit', 'delete')
VIEW_EDIT_ACTIONS = ('view', 'edit')

ALLOWED_ACTIONS_BY_ICON = {
    'dashboard': VIEW_ACTIONS,
    'Calendar': CRUD_ACTIONS,
    'documents': VIEW_ACTIONS,
    'Media': VIEW_ACTIONS,
    'Media-audio': CRUD_ACTIONS,
    'Media-images': CRUD_ACTIONS,
    'Media-videos': CRUD_ACTIONS,
    'Media-documents': CRUD_ACTIONS,
    'Media-3d': CRUD_ACTIONS,
    'Media-share-foler': CRUD_ACTIONS,
    'Media-trash': CRUD_ACTIONS,
    'Archives': CRUD_ACTIONS,
    'Tasks': VIEW_ACTIONS,
    'Task': CRUD_ACTIONS,
    'internal': ('view', 'add', 'download'),
    'pendingIssuance': ('view', 'download'),
    'degital': ('view', 'download'),
    'Monument': VIEW_ACTIONS,
    'Mon-review': ('view', 'verify', 'refuse', 'isPublic'),
    'Monument-Private': ('view', 'add'),
    'Mon-all': ('view', 'edit', 'delete'),
    'Mon-public': VIEW_ACTIONS,
    'Mon-menu': VIEW_ACTIONS,
    'Mon-news': VIEW_ACTIONS,
    'Mon-home': VIEW_ACTIONS,
    'Mon-about': VIEW_ACTIONS,
    'Mon-config': VIEW_ACTIONS,
    'Mon-contacts': VIEW_ACTIONS,
    'Mon-3d': ('view', 'add'),
    'Ratings': VIEW_ACTIONS,
    'Setting-criterias': VIEW_EDIT_ACTIONS,
    'Setting-awards': CRUD_ACTIONS,
    'Setting-rankings': CRUD_ACTIONS,
    'rankings': VIEW_ACTIONS,
    'awards': VIEW_EDIT_ACTIONS,
    'Permission': VIEW_EDIT_ACTIONS,
    'Staff': CRUD_ACTIONS,
    'wordprocessing': VIEW_ACTIONS,
    'Settings': VIEW_EDIT_ACTIONS,
    'Set-config': VIEW_ACTIONS,
    'Set-notif': VIEW_ACTIONS,
    'Set-maint': CRUD_ACTIONS,
    'templates': VIEW_ACTIONS,
    'formmanagement': ('view', 'add', 'edit', 'delete', 'verify'),
    'form-manage': CRUD_ACTIONS,
}


def is_uuid(value):
    if not value:
        return False
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def copy_permission_department_scope(apps, schema_editor):
    Department = apps.get_model('departments', 'Department')
    Permission = apps.get_model('authentication', 'Permission')

    valid_department_ids = {str(item) for item in Department.objects.values_list('id', flat=True)}
    seen = set()

    for permission in Permission.objects.all().order_by('id'):
        raw_department_id = str(getattr(permission, 'department_id', '') or '').strip()
        department_id = raw_department_id if is_uuid(raw_department_id) and raw_department_id in valid_department_ids else None
        key = (str(permission.role_id), department_id or '', str(permission.function_id), str(permission.action_id))

        if key in seen:
            permission.delete()
            continue

        seen.add(key)
        permission.department_ref_id = department_id
        permission.save(update_fields=['department_ref'])


def seed_function_actions(apps, schema_editor):
    Action = apps.get_model('authentication', 'Action')
    Function = apps.get_model('authentication', 'Function')
    FunctionAction = apps.get_model('authentication', 'FunctionAction')

    actions_by_code = {action.code: action for action in Action.objects.all()}
    for function in Function.objects.filter(is_deleted=False):
        allowed_actions = ALLOWED_ACTIONS_BY_ICON.get(function.icon or '', ACTION_CODES)
        for action_code in allowed_actions:
            action = actions_by_code.get(action_code)
            if action:
                FunctionAction.objects.get_or_create(function=function, action=action)


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0003_staff_indexes'),
        ('authentication', '0010_prune_inapplicable_permissions'),
    ]

    operations = [
        migrations.CreateModel(
            name='FunctionAction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='function_actions', to='authentication.action')),
                ('function', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='function_actions', to='authentication.function')),
            ],
            options={
                'verbose_name': 'Hành động theo chức năng',
                'verbose_name_plural': 'Hành động theo chức năng',
                'db_table': 'function_actions',
                'unique_together': {('function', 'action')},
            },
        ),
        migrations.RunPython(seed_function_actions, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='permission',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='permission',
            name='department_ref',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='+', to='departments.department'),
        ),
        migrations.RunPython(copy_permission_department_scope, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='permission',
            name='department_id',
        ),
        migrations.RenameField(
            model_name='permission',
            old_name='department_ref',
            new_name='department',
        ),
        migrations.AlterField(
            model_name='permission',
            name='department',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='permissions', to='departments.department'),
        ),
        migrations.AddConstraint(
            model_name='permission',
            constraint=models.UniqueConstraint(fields=('role', 'function', 'action'), condition=models.Q(department__isnull=True), name='uniq_permission_global_scope'),
        ),
        migrations.AddConstraint(
            model_name='permission',
            constraint=models.UniqueConstraint(fields=('role', 'department', 'function', 'action'), condition=models.Q(department__isnull=False), name='uniq_permission_department_scope'),
        ),
    ]