from rest_framework import serializers
from django.utils import timezone
from .models import Calendar, CalendarJoin, CalendarFile, CalendarJob
from core.accounts.models import StaffFile, UserConcurrently
from core.authentication.models import User
from core.departments.models import Staff

def current_minute():
    current = timezone.now()
    return current.replace(second=0, microsecond=0)


def ensure_aware(value):
    if value and timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def is_calendar_time_locked(obj):
    start_time = ensure_aware(getattr(obj, 'from_time', None) or getattr(obj, 'start_time', None))
    return bool(start_time and start_time < current_minute())


def get_creator_user(created_by):
    if not created_by:
        return None
    try:
        return User.objects.filter(id=created_by, is_deleted=False).first()
    except (TypeError, ValueError):
        return None


def get_creator_staff(user):
    if not user:
        return None
    return Staff.objects.select_related('user').filter(user=user, is_deleted=False).first()


def get_creator_role(user):
    if not user:
        return ''
    assignment = UserConcurrently.objects.select_related('role').filter(user=user, is_deleted=False).first()
    if assignment and assignment.role:
        return assignment.role.name or ''
    return user.position or ''


def get_creator_avatar(user, staff):
    if staff:
        avatar_file = StaffFile.objects.filter(staff=staff, type_file=0, is_deleted=False).order_by('-created_at').first()
        if avatar_file and avatar_file.file:
            return avatar_file.file
        if staff.avatar:
            return staff.avatar
    return getattr(user, 'avatar', None) or ''

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
    isLocked = serializers.SerializerMethodField()
    isCanceled = serializers.BooleanField(source='is_canceled', required=False)
    cancelReason = serializers.CharField(source='cancel_reason', required=False, allow_blank=True, allow_null=True)
    cancelUndoDate = serializers.DateTimeField(source='cancel_undo_date', read_only=True)
    isNewToday = serializers.SerializerMethodField()
    typeUserJoin = serializers.SerializerMethodField()
    createdByName = serializers.SerializerMethodField()
    createdByRole = serializers.SerializerMethodField()
    createdByAvatar = serializers.SerializerMethodField()

    class Meta:
        model = Calendar
        fields = [
            'id',
            'name', 'type', 'description', 'fromTime', 'toTime', 'link', 'place', 'joinType',
            'isDeleted', 'createdDate', 'createdBy', 'modifiedDate', 'modifiedBy',
            'deletedDate', 'deletedBy', 'isLocked', 'isCanceled', 'cancelReason',
            'cancelUndoDate', 'isNewToday', 'typeUserJoin', 'createdByName', 'createdByRole', 'createdByAvatar',
            'title', 'location', 'start_time', 'end_time', 'calendar_type', 'status',
            'department_id', 'is_all_day', 'color', 'participants', 'files',
        ]
        read_only_fields = [
            'id', 'isDeleted', 'createdDate', 'modifiedDate', 'deletedDate',
            'deletedBy', 'cancelUndoDate', 'isNewToday', 'typeUserJoin', 'createdByName', 'createdByRole', 'createdByAvatar',
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

    def get_isLocked(self, obj):
        return bool(obj.is_locked or is_calendar_time_locked(obj))

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

    def _creator_profile(self, obj):
        cache = self.context.setdefault('_calendar_creator_cache', {})
        creator_id = str(obj.created_by or '')
        if not creator_id:
            return {'name': '', 'role': '', 'avatar': ''}
        if creator_id in cache:
            return cache[creator_id]

        user = get_creator_user(creator_id)
        staff = get_creator_staff(user)
        name = (staff.full_name if staff else '') or (user.get_full_name() if user else '')
        profile = {
            'name': name,
            'role': (staff.title if staff and staff.title else '') or get_creator_role(user),
            'avatar': get_creator_avatar(user, staff),
        }
        cache[creator_id] = profile
        return profile

    def get_createdByName(self, obj):
        return self._creator_profile(obj)['name']

    def get_createdByRole(self, obj):
        return self._creator_profile(obj)['role']

    def get_createdByAvatar(self, obj):
        return self._creator_profile(obj)['avatar']

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
        from_time = ensure_aware(from_time)
        to_time = ensure_aware(to_time)
        if to_time <= from_time:
            raise serializers.ValidationError({'toTime': 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu'})
        if from_time < current_minute():
            raise serializers.ValidationError({'fromTime': 'Không thể đặt lịch ở thời gian trong quá khứ'})
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

