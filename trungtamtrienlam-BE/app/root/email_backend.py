import ssl

from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend as SMTPEmailBackend
from django.utils.functional import cached_property


class EmailBackend(SMTPEmailBackend):
    @cached_property
    def ssl_context(self):
        if getattr(settings, 'EMAIL_TLS_VERIFY', True):
            return super().ssl_context
        return ssl._create_unverified_context()
