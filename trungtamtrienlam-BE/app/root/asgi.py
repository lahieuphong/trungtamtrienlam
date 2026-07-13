import os

from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter
from django.conf import settings
from django.core.asgi import get_asgi_application
from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'root.settings')

django_asgi_app = get_asgi_application()
if settings.DEBUG:
    django_asgi_app = ASGIStaticFilesHandler(django_asgi_app)

from core.chats.auth import JwtOrTokenAuthMiddlewareStack  # noqa: E402
from core.chats.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JwtOrTokenAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns),
    ),
})
