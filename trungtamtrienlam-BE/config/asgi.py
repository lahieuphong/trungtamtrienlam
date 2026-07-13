import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

from channels.routing import ProtocolTypeRouter, URLRouter
from django.conf import settings
from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()
if settings.DEBUG:
    django_asgi_app = ASGIStaticFilesHandler(django_asgi_app)

from apps.chats.auth import JwtOrTokenAuthMiddlewareStack
from apps.chats.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JwtOrTokenAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
