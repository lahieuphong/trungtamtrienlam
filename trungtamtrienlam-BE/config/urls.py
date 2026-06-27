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

    # Quản lý tài khoản
    path('api/accounts/', include('apps.accounts.urls')),

    # Phòng ban & nhân sự
    path('api/departments/', include('apps.departments.urls')),

    # Công việc
    path('api/tasks/', include('apps.tasks.urls')),

    # Văn bản
    path('api/documents/', include('apps.documents.urls')),

    # Lưu trữ hồ sơ
    path('api/archives/', include('apps.archives.urls')),

    # Lịch làm việc
    path('api/calendars/', include('apps.calendars.urls')),

    # Tin nhắn nội bộ
    path('api/chats/', include('apps.chats.urls')),

    # Quản lý file media
    path('api/media/', include('apps.media_files.urls')),

    # Đánh giá thi đua
    path('api/ratings/', include('apps.ratings.urls')),

    # Mẫu biểu
    path('api/templates/', include('apps.templates_app.urls')),

    # Thông báo
    path('api/notifications/', include('apps.notifications.urls')),

    # Cài đặt hệ thống
    path('api/settings/', include('apps.settings_app.urls')),

    # Sao lưu & phục hồi
    path('api/backup/', include('apps.backup.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)