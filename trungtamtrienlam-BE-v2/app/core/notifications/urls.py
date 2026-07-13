from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')
router.register(r'push-subscriptions', views.PushSubscriptionView, basename='push-subscription')

urlpatterns = [path('', include(router.urls))]
