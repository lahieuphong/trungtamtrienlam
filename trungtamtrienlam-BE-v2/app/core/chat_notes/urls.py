from django.urls import path

from core.chat_notes.api import ChatNoteCreateApi
from core.chat_notes.api import ChatNoteDeleteApi
from core.chat_notes.api import ChatNoteDetailApi
from core.chat_notes.api import ChatNoteListApi
from core.chat_notes.api import ChatNotePinOrUnpinApi
from core.chat_notes.api import ChatNoteUpdateApi


urlpatterns = [
    path('GetList', ChatNoteListApi.as_view()),
    path('GetDetail', ChatNoteDetailApi.as_view()),
    path('CreateNote', ChatNoteCreateApi.as_view()),
    path('UpdateNote', ChatNoteUpdateApi.as_view()),
    path('DeleteNote', ChatNoteDeleteApi.as_view()),
    path('PinOrUnpin', ChatNotePinOrUnpinApi.as_view()),
]

