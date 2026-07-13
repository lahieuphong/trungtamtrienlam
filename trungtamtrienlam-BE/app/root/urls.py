from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.authentication import views as auth_views
from core.health import healthcheck, readiness


# Keep admin branding stable regardless of app auto-discovery import order.
admin.site.site_header = 'Admin'
admin.site.site_title = 'Admin'
admin.site.index_title = 'Admin'

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication, users, roles and permissions
    path('api/auth/', include('core.authentication.urls')),
    path('api/Permissions/get', auth_views.PermissionMatrixView.as_view(), name='legacy-permissions-get'),
    path('api/Permissions/update', auth_views.PermissionToggleView.as_view(), name='legacy-permissions-update'),
    path('api/Permissions/Clone', auth_views.PermissionCloneView.as_view(), name='legacy-permissions-clone'),
    path('api/Permissions/GetByUserID', auth_views.UserMenuPermissionsView.as_view(), name='legacy-permissions-by-user'),

    path('api/accounts/', include('core.accounts.urls')),
    path('api/departments/', include('core.departments.urls')),
    path('api/tasks/', include('core.tasks.urls')),
    path('api/documents/', include('core.documents.urls')),
    path('api/archives/', include('core.archives.urls')),
    path('api/calendars/', include('core.calendars.urls')),

    # Chat routes, including the production-compatible casing.
    path('api/chats/', include('core.chats.urls')),
    path('api/Chat/', include('core.chats.urls')),
    path('api/ChatNote/', include('core.chat_notes.urls')),
    path('api/ChatVote/', include('core.chat_votes.urls')),
    path('api/ChatRemind/', include('core.chat_reminds.urls')),
    path('api/user/', include('core.chats.user_urls')),

    path('api/media/', include('core.media_files.urls')),
    path('api/ratings/', include('core.ratings.urls')),
    path('api/Monument/', include('core.monuments.urls')),
    path('api/templates/', include('core.templates_app.urls')),
    path('api/notifications/', include('core.notifications.urls')),
    path('api/settings/', include('core.settings_app.urls')),
    path('api/backup/', include('core.backup.urls')),

    # Container/orchestrator probes.
    path('healthcheck/', healthcheck, name='healthcheck'),
    path('readiness/', readiness, name='readiness'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
