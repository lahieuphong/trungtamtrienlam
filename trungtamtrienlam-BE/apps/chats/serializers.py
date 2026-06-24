from rest_framework import serializers
from .models import Chat, ChatMember, ChatMessage, ChatNote, ChatVote, ChatVoteOption, ChatVoteResult


class ChatMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMember
        fields = ['id', 'user_id', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ChatSerializer(serializers.ModelSerializer):
    members = ChatMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Chat
        fields = ['id', 'name', 'chat_type', 'avatar', 'members', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'chat', 'user_id', 'content', 'message_type', 'reply_to_id', 'created_at']
        read_only_fields = ['id', 'created_at', 'user_id']


class ChatNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatNote
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ChatVoteOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatVoteOption
        fields = ['id', 'text', 'vote_count']
        read_only_fields = ['id']

    def get_vote_count(self, obj):
        return obj.results.count()


class ChatVoteSerializer(serializers.ModelSerializer):
    options = ChatVoteOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ChatVote
        fields = ['id', 'chat', 'question', 'is_multiple', 'closed_at', 'options', 'created_at']
        read_only_fields = ['id', 'created_at']
