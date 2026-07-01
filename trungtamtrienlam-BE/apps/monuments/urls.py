from django.urls import path

from .views import (
    MonumentCreateView,
    MonumentDeleteView,
    MonumentDetailView,
    MonumentListView,
    MonumentPublishView,
    MonumentRedoView,
    MonumentRefuseView,
    MonumentRequestView,
    MonumentUpdateView,
    MonumentVerifyView,
)

urlpatterns = [
    path('GetList', MonumentListView.as_view(), name='monument-get-list'),
    path('Get', MonumentDetailView.as_view(), name='monument-get'),
    path('Create', MonumentCreateView.as_view(), name='monument-create'),
    path('Update', MonumentUpdateView.as_view(), name='monument-update'),
    path('Delete', MonumentDeleteView.as_view(), name='monument-delete'),
    path('Request/<uuid:pk>', MonumentRequestView.as_view(), name='monument-request'),
    path('Verify/<uuid:pk>', MonumentVerifyView.as_view(), name='monument-verify'),
    path('Redo', MonumentRedoView.as_view(), name='monument-redo'),
    path('Refuse', MonumentRefuseView.as_view(), name='monument-refuse'),
    path('Publish/<uuid:pk>', MonumentPublishView.as_view(), name='monument-publish'),
]
