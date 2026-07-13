"""PostgreSQL-backed settings for the existing business-flow test suite.

The service-free smoke suite continues to use ``config.settings.test``.  This
module only replaces its in-memory SQLite database so PostgreSQL-specific
migrations and behavior are exercised without changing application code.
"""

import os

from .test import *  # noqa: F401,F403


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'trungtamtrienlam_ci'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 0,
        'OPTIONS': {
            'connect_timeout': int(os.environ.get('DB_CONNECT_TIMEOUT', '5')),
        },
        'TEST': {
            'NAME': os.environ.get('TEST_DB_NAME', 'test_trungtamtrienlam_ci'),
        },
    },
}
