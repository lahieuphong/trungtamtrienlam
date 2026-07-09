from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.response import ResponseServer
from .models import Chat, ChatMessage, ChatNote, ChatVote, ChatVoteResult
from .serializers import (
    ChatSerializer, ChatMessageSerializer, ChatNoteSerializer,
    ChatVoteSerializer,
)


class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Chat.objects.filter(
            is_deleted=False,
            members__user_id=self.request.user.id,
        ).distinct()

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Xóa cuộc trò chuyện thành công')

    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        msgs = ChatMessage.objects.filter(chat_id=pk, is_deleted=False).order_by('created_at')
        return ResponseServer.success(data=ChatMessageSerializer(msgs, many=True).data)


class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.filter(is_deleted=False)
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['chat']

    def perform_create(self, serializer):
        serializer.save(user_id=self.request.user.id, created_by=str(self.request.user.id))

    def destroy(self, request, *args, **kwargs):
        self.get_object().soft_delete(deleted_by=request.user.id)
        return ResponseServer.success(message='Thu hồi tin nhắn thành công')


class ChatVoteViewSet(viewsets.ModelViewSet):
    queryset = ChatVote.objects.filter(is_deleted=False)
    serializer_class = ChatVoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['chat']

    @action(detail=True, methods=['post'], url_path='vote')
    def cast_vote(self, request, pk=None):
        vote = self.get_object()
        option_ids = request.data.get('option_ids', [])
        ChatVoteResult.objects.filter(vote=vote, user_id=request.user.id).delete()
        for opt_id in option_ids:
            ChatVoteResult.objects.create(vote=vote, option_id=opt_id, user_id=request.user.id)
        return ResponseServer.success(message='Bình chọn thành công')

