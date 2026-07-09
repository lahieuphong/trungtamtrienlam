from django.urls import path

from apps.chat_notes.api import ChatNoteCreateApi
from apps.chat_notes.api import ChatNoteDeleteApi
from apps.chat_notes.api import ChatNoteDetailApi
from apps.chat_notes.api import ChatNoteListApi
from apps.chat_notes.api import ChatNotePinOrUnpinApi
from apps.chat_notes.api import ChatNoteUpdateApi


urlpatterns = [
    path('GetList', ChatNoteListApi.as_view()),
    path('GetDetail', ChatNoteDetailApi.as_view()),
    path('CreateNote', ChatNoteCreateApi.as_view()),
    path('UpdateNote', ChatNoteUpdateApi.as_view()),
    path('DeleteNote', ChatNoteDeleteApi.as_view()),
    path('PinOrUnpin', ChatNotePinOrUnpinApi.as_view()),
]

