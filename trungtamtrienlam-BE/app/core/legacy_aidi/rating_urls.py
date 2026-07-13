from django.urls import path

from core.legacy_aidi.rating_api import RatingsGetAvatarFrameApi


urlpatterns = [
    path('GetAvatarFrame', RatingsGetAvatarFrameApi.as_view()),
]
