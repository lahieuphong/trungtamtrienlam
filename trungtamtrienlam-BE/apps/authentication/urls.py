from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'functions', views.FunctionViewSet, basename='function')
router.register(r'actions', views.ActionViewSet, basename='action')
router.register(r'function-actions', views.FunctionActionViewSet, basename='function-action')
router.register(r'permissions', views.PermissionViewSet, basename='permission')

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='auth-reset-password'),
    path('permissions/by-user/', views.UserMenuPermissionsView.as_view(), name='user-menu-permissions'),
    path('permissions/matrix/', views.PermissionMatrixView.as_view(), name='permission-matrix'),
    path('permissions/toggle/', views.PermissionToggleView.as_view(), name='permission-toggle'),
    path('permissions/set-all/', views.PermissionSetAllView.as_view(), name='permission-set-all'),
    path('permissions/clone/', views.PermissionCloneView.as_view(), name='permission-clone'),
    path('', include(router.urls)),
]
