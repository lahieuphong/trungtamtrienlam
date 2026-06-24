from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.authentication import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth + Users + Roles + Permissions
    path('api/auth/', include('apps.authentication.urls')),
    path('api/Permissions/get', auth_views.PermissionMatrixView.as_view(), name='legacy-permissions-get'),
    path('api/Permissions/update', auth_views.PermissionToggleView.as_view(), name='legacy-permissions-update'),
    path('api/Permissions/Clone', auth_views.PermissionCloneView.as_view(), name='legacy-permissions-clone'),
    path('api/Permissions/GetByUserID', auth_views.UserMenuPermissionsView.as_view(), name='legacy-permissions-by-user'),

    # Quáº£n lÃ½ tÃ i khoáº£n
    path('api/accounts/', include('apps.accounts.urls')),

    # PhÃ²ng ban & nhÃ¢n sá»±
    path('api/departments/', include('apps.departments.urls')),

    # CÃ´ng viá»‡c
    path('api/tasks/', include('apps.tasks.urls')),

    # VÄƒn báº£n
    path('api/documents/', include('apps.documents.urls')),

    # LÆ°u trá»¯ há»“ sÆ¡
    path('api/archives/', include('apps.archives.urls')),

    # Lá»‹ch lÃ m viá»‡c
    path('api/calendars/', include('apps.calendars.urls')),

    # Tin nháº¯n ná»™i bá»™
    path('api/chats/', include('apps.chats.urls')),

    # Quáº£n lÃ½ file media
    path('api/media/', include('apps.media_files.urls')),

    # ÄÃ¡nh giÃ¡ thi Ä‘ua
    path('api/ratings/', include('apps.ratings.urls')),

    # Máº«u biá»ƒu
    path('api/templates/', include('apps.templates_app.urls')),

    # ThÃ´ng bÃ¡o
    path('api/notifications/', include('apps.notifications.urls')),

    # CÃ i Ä‘áº·t há»‡ thá»‘ng
    path('api/settings/', include('apps.settings_app.urls')),

    # Sao lÆ°u & phá»¥c há»“i
    path('api/backup/', include('apps.backup.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

