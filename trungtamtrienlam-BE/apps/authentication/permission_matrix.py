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


def get_allowed_actions_for_function(function):
    return ALLOWED_ACTIONS_BY_ICON.get(function.icon or '', ACTION_CODES)


def is_action_allowed_for_function(function, action_code):
    return action_code in get_allowed_actions_for_function(function)
