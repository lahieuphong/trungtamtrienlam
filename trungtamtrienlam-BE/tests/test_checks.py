from django.core.checks import ERROR, run_checks
from django.test import SimpleTestCase


class DjangoChecksSmokeTests(SimpleTestCase):
    def test_django_system_checks_have_no_errors(self):
        errors = [message for message in run_checks() if message.level >= ERROR]

        self.assertEqual([], errors, '\n'.join(str(error) for error in errors))
