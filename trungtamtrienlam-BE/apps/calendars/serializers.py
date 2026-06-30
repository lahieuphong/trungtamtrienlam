from rest_framework import serializers
from django.utils import timezone
from .models import Calendar, CalendarJoin, CalendarFile, CalendarJob


class CalendarJoinSerializer(serializers.ModelSerializer):
    userId = serializers.UUIDField(source='user_id', required=False, allow_null=True)
    departmentId = serializers.CharField(source='department_id', required=False, allow_blank=True, allow_null=True)
    acceptType = serializers.IntegerField(source='accept_type', required=False)
    refuseContent = serializers.CharField(source='refuse_content', required=False, allow_blank=True, allow_null=True)
    acceptDated = serializers.DateTimeField(source='accept_dated', required=False, allow_null=True)
    refuseDated = serializers.DateTimeField(source='refuse_dated', required=False, allow_null=True)
    deletedDate = serializers.DateTimeField(source='deleted_date', read_only=True)
    deletedBy = serializers.CharField(source='deleted_by', read_only=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)

    class Meta:
        model = CalendarJoin
        fields = [
            'id', 'user_id', 'userId', 'departmentId', 'status', 'acceptType',
            'refuseContent', 'acceptDated', 'refuseDated', 'deletedDate',
            'deletedBy', 'isDeleted',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'user_id': {'required': False, 'allow_null': True},
            'status': {'required': False},
        }


class CalendarFileSerializer(serializers.ModelSerializer):
    fileName = serializers.CharField(source='file_name', required=False, allow_blank=True, allow_null=True)
    calendarId = serializers.UUIDField(source='calendar_id', read_only=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)

    class Meta:
        model = CalendarFile
        fields = ['id', 'fileName', 'file', 'calendarId', 'extension', 'size', 'type', 'isDeleted']
        read_only_fields = ['id', 'calendarId', 'isDeleted']


class CalendarJobSerializer(serializers.ModelSerializer):
    calendarId = serializers.UUIDField(source='calendar_id', read_only=True)
    jobId = serializers.CharField(source='job_id')
    createdDate = serializers.DateTimeField(source='created_date', read_only=True)

    class Meta:
        model = CalendarJob
        fields = ['id', 'calendarId', 'jobId', 'deadline', 'createdDate', 'status', 'type']


class CalendarSerializer(serializers.ModelSerializer):
    participants = CalendarJoinSerializer(many=True, read_only=True)
    files = CalendarFileSerializer(many=True, read_only=True)

    fromTime = serializers.DateTimeField(source='from_time', required=False, allow_null=True)
    toTime = serializers.DateTimeField(source='to_time', required=False, allow_null=True)
    joinType = serializers.IntegerField(source='join_type', required=False, allow_null=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdDate = serializers.DateTimeField(source='created_at', read_only=True)
    createdBy = serializers.CharField(source='created_by', required=False, allow_blank=True, allow_null=True)
    modifiedDate = serializers.DateTimeField(source='updated_at', read_only=True)
    modifiedBy = serializers.CharField(source='updated_by', required=False, allow_blank=True, allow_null=True)
    deletedDate = serializers.DateTimeField(source='deleted_date', read_only=True)
    deletedBy = serializers.CharField(source='deleted_by', read_only=True)
    isLocked = serializers.BooleanField(source='is_locked', required=False)
    isCanceled = serializers.BooleanField(source='is_canceled', required=False)
    cancelReason = serializers.CharField(source='cancel_reason', required=False, allow_blank=True, allow_null=True)
    cancelUndoDate = serializers.DateTimeField(source='cancel_undo_date', read_only=True)
    isNewToday = serializers.SerializerMethodField()
    typeUserJoin = serializers.SerializerMethodField()

    class Meta:
        model = Calendar
        fields = [
            'id',
            'name', 'type', 'description', 'fromTime', 'toTime', 'link', 'place', 'joinType',
            'isDeleted', 'createdDate', 'createdBy', 'modifiedDate', 'modifiedBy',
            'deletedDate', 'deletedBy', 'isLocked', 'isCanceled', 'cancelReason',
            'cancelUndoDate', 'isNewToday', 'typeUserJoin',
            'title', 'location', 'start_time', 'end_time', 'calendar_type', 'status',
            'department_id', 'is_all_day', 'color', 'participants', 'files',
        ]
        read_only_fields = [
            'id', 'isDeleted', 'createdDate', 'modifiedDate', 'deletedDate',
            'deletedBy', 'cancelUndoDate', 'isNewToday', 'typeUserJoin',
        ]
        extra_kwargs = {
            'name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'title': {'required': False, 'allow_blank': True},
            'type': {'required': False, 'allow_null': True},
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
            'start_time': {'required': False, 'allow_null': True},
            'end_time': {'required': False, 'allow_null': True},
            'calendar_type': {'required': False},
            'status': {'required': False},
            'location': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def get_isNewToday(self, obj):
        created_at = getattr(obj, 'created_at', None)
        if not created_at:
            return 0
        return 1 if timezone.localtime(created_at).date() == timezone.localdate() else 0

    def get_typeUserJoin(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        user_id = str(getattr(user, 'id', '') or '')
        if user_id and str(obj.created_by or '') == user_id:
            return 1
        if obj.join_type == Calendar.JoinType.PERSONAL:
            return 3
        if user_id and obj.participants.filter(user_id=user_id, is_deleted=False).exists():
            return 2
        return 1

    def validate(self, attrs):
        attrs = self._mirror_185_fields(attrs, instance=self.instance)
        name = attrs.get('name') or attrs.get('title')
        from_time = attrs.get('from_time') or attrs.get('start_time')
        to_time = attrs.get('to_time') or attrs.get('end_time')
        if not name:
            raise serializers.ValidationError({'name': 'Tên lịch không được để trống'})
        if not from_time:
            raise serializers.ValidationError({'fromTime': 'Thời gian bắt đầu không được để trống'})
        if not to_time:
            raise serializers.ValidationError({'toTime': 'Thời gian kết thúc không được để trống'})
        if to_time < from_time:
            raise serializers.ValidationError({'toTime': 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu'})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and getattr(user, 'is_authenticated', False):
            validated_data['created_by'] = str(user.id)
        validated_data = self._mirror_185_fields(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and getattr(user, 'is_authenticated', False):
            validated_data['updated_by'] = str(user.id)
        validated_data = self._mirror_185_fields(validated_data, instance=instance)
        return super().update(instance, validated_data)

    @staticmethod
    def _mirror_185_fields(attrs, instance=None):
        current = lambda name: getattr(instance, name, None) if instance is not None else None

        name = attrs.get('name', current('name')) or attrs.get('title', current('title'))
        title = attrs.get('title', current('title')) or name
        from_time = attrs.get('from_time', current('from_time')) or attrs.get('start_time', current('start_time'))
        start_time = attrs.get('start_time', current('start_time')) or from_time
        to_time = attrs.get('to_time', current('to_time')) or attrs.get('end_time', current('end_time'))
        end_time = attrs.get('end_time', current('end_time')) or to_time
        event_type = attrs.get('type', current('type'))
        calendar_type = attrs.get('calendar_type', current('calendar_type'))
        if event_type is None:
            event_type = calendar_type if calendar_type is not None else Calendar.EventType.MEETING
        place = attrs.get('place', current('place')) or attrs.get('location', current('location'))
        location = attrs.get('location', current('location')) or place

        attrs['name'] = name
        attrs['title'] = title
        attrs['from_time'] = from_time
        attrs['start_time'] = start_time
        attrs['to_time'] = to_time
        attrs['end_time'] = end_time
        attrs['type'] = event_type
        attrs['calendar_type'] = event_type
        attrs['place'] = place
        attrs['location'] = location
        if attrs.get('join_type') is None and current('join_type') is None:
            attrs['join_type'] = Calendar.JoinType.DEPARTMENT
        return attrs

