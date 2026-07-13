'''Celery application bootstrap for workers and the Beat scheduler.'''

import os

from celery import Celery


# Preserve the project's current development default while allowing deploy
# commands to select another settings module through the environment.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('trungtamtrienlam')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
