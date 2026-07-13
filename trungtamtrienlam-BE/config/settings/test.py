"""Service-free settings used by the local and CI smoke-test suites."""

from pathlib import Path
from tempfile import gettempdir

from .base import *  # noqa: F401,F403


DEBUG = False
SECRET_KEY = 'django-test-key-not-for-production'
ALLOWED_HOSTS = ['localhost', 'testserver']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    },
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'trungtamtrienlam-tests',
    },
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

CELERY_BROKER_URL = 'memory://'
CELERY_RESULT_BACKEND = 'cache+memory://'
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

MEDIA_ROOT = Path(gettempdir()) / 'trungtamtrienlam-test-media'
