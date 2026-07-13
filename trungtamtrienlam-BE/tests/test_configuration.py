from django.conf import settings
from django.test import SimpleTestCase


class TestSettingsSmokeTests(SimpleTestCase):
    def test_test_database_is_in_memory_sqlite(self):
        database = settings.DATABASES['default']

        self.assertEqual('django.db.backends.sqlite3', database['ENGINE'])
        self.assertEqual(':memory:', database['NAME'])

    def test_external_runtime_services_are_replaced_in_tests(self):
        self.assertEqual(
            'channels.layers.InMemoryChannelLayer',
            settings.CHANNEL_LAYERS['default']['BACKEND'],
        )
        self.assertEqual('memory://', settings.CELERY_BROKER_URL)
        self.assertTrue(settings.CELERY_TASK_ALWAYS_EAGER)
        self.assertEqual('django.core.mail.backends.locmem.EmailBackend', settings.EMAIL_BACKEND)
