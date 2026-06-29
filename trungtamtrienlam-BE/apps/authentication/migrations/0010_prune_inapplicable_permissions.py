from django.db import migrations


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


def prune_inapplicable_permissions(apps, schema_editor):
    Function = apps.get_model('authentication', 'Function')
    Permission = apps.get_model('authentication', 'Permission')

    for function in Function.objects.all():
        allowed_actions = ALLOWED_ACTIONS_BY_ICON.get(function.icon or '', ACTION_CODES)
        Permission.objects.filter(function_id=function.id).exclude(action__code__in=allowed_actions).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0009_align_role_levels_by_hierarchy'),
    ]

    operations = [
        migrations.RunPython(prune_inapplicable_permissions, migrations.RunPython.noop),
    ]
