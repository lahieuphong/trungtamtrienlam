import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django_asgi_app = get_asgi_application()

from apps.chats.auth import JwtOrTokenAuthMiddlewareStack
from apps.chats.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JwtOrTokenAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
