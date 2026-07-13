from celery import Celery
from django.test import SimpleTestCase

from config import celery_app


class CeleryBootstrapSmokeTests(SimpleTestCase):
    def test_project_exports_the_configured_celery_application(self):
        self.assertIsInstance(celery_app, Celery)
        self.assertEqual('trungtamtrienlam', celery_app.main)
