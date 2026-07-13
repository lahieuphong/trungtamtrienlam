from django.urls import path

from core.legacy_aidi.file_api import FileDownloadApi
from core.legacy_aidi.file_api import FileDownloadChunkApi
from core.legacy_aidi.file_api import FileGetSizeApi
from core.legacy_aidi.file_api import FileViewApi
from core.legacy_aidi.file_api import PublicTokenApi


urlpatterns = [
    path('getPublicToken', PublicTokenApi.as_view()),
    path('View', FileViewApi.as_view()),
    path('GetSize', FileGetSizeApi.as_view()),
    path('Download', FileDownloadApi.as_view()),
    path('DownloadChunk', FileDownloadChunkApi.as_view()),
]
