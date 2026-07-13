from django.urls import path

from core.chat_votes.api import ChatVoteCreateApi
from core.chat_votes.api import ChatVoteCreateOptionsApi
from core.chat_votes.api import ChatVoteDeleteApi
from core.chat_votes.api import ChatVoteListApi
from core.chat_votes.api import ChatVotePinOrUnpinApi
from core.chat_votes.api import ChatVoteResultApi
from core.chat_votes.api import ChatVoteSubmitApi


urlpatterns = [
    path('GetList', ChatVoteListApi.as_view()),
    path('CreateVote', ChatVoteCreateApi.as_view()),
    path('DeleteVote', ChatVoteDeleteApi.as_view()),
    path('PinOrUnpin', ChatVotePinOrUnpinApi.as_view()),
    path('Vote', ChatVoteSubmitApi.as_view()),
    path('GetVoteResult', ChatVoteResultApi.as_view()),
    path('CreateOptions', ChatVoteCreateOptionsApi.as_view()),
]

