from datetime import datetime, time

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from core.response import ResponseServer
from .models import Calendar, CalendarJoin
from .serializers import CalendarSerializer, CalendarJoinSerializer


ALL_EVENT_TYPES = 10
OFFICE_JOIN_TYPE = 0
PERSONAL_FILTER_JOIN_TYPE = 1


class CalendarViewSet(viewsets.ModelViewSet):
    queryset = Calendar.objects.filter(is_deleted=False)
    serializer_class = CalendarSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['calendar_type', 'type', 'status', 'department_id', 'join_type']
    search_fields = ['title', 'name', 'description', 'place', 'location']

    def get_queryset(self):
        queryset = Calendar.objects.filter(is_deleted=False)
        params = self.request.query_params

        event_type = params.get('type') or params.get('calendar_type')
        if event_type not in (None, '', str(ALL_EVENT_TYPES)):
            try:
                queryset = queryset.filter(type=int(event_type))
            except (TypeError, ValueError):
                pass

        join_type = params.get('joinType') or params.get('join_type')
        if join_type not in (None, ''):
            try:
                join_type = int(join_type)
                if join_type == PERSONAL_FILTER_JOIN_TYPE:
                    queryset = queryset.filter(join_type=Calendar.JoinType.PERSONAL)
                elif join_type == OFFICE_JOIN_TYPE:
                    queryset = queryset.exclude(join_type=Calendar.JoinType.PERSONAL)
            except (TypeError, ValueError):
                pass

        return queryset.order_by('from_time', 'start_time')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return ResponseServer.created(self.get_serializer(instance).data, message='Tạo lịch thành công')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return ResponseServer.success(self.get_serializer(instance).data, message='Cập nhật lịch thành công')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self._soft_delete(instance, request)
        return ResponseServer.success(message='Xóa lịch thành công')

    @action(detail=False, methods=['get'], url_path='GetCalendarDay')
    def get_calendar_day(self, request):
        day = self._parse_day(request.query_params.get('day'))
        queryset = self.get_queryset()
        if day:
            start_dt = self._aware_datetime(datetime.combine(day, time.min))
            end_dt = self._aware_datetime(datetime.combine(day, time.max))
            queryset = queryset.filter(
                Q(from_time__lte=end_dt, to_time__gte=start_dt) |
                Q(start_time__lte=end_dt, end_time__gte=start_dt)
            )
        return self._calendar_list_response(queryset)

    @action(detail=False, methods=['get'], url_path='GetCalendarWeek')
    def get_calendar_week(self, request):
        from_dt = self._parse_datetime_param(request.query_params.get('fromDate'))
        to_dt = self._parse_datetime_param(request.query_params.get('toDate'))
        queryset = self.get_queryset()
        if from_dt and to_dt:
            queryset = queryset.filter(
                Q(from_time__lte=to_dt, to_time__gte=from_dt) |
                Q(start_time__lte=to_dt, end_time__gte=from_dt)
            )
        return self._calendar_list_response(queryset)

    @action(detail=False, methods=['get'], url_path='GetCalendarMonth')
    def get_calendar_month(self, request):
        queryset = self.get_queryset()
        try:
            year = int(request.query_params.get('year'))
            month = int(request.query_params.get('month'))
            start_dt = self._aware_datetime(datetime(year, month, 1, 0, 0, 0))
            if month == 12:
                end_dt = self._aware_datetime(datetime(year + 1, 1, 1, 0, 0, 0))
            else:
                end_dt = self._aware_datetime(datetime(year, month + 1, 1, 0, 0, 0))
            queryset = queryset.filter(
                Q(from_time__lt=end_dt, to_time__gte=start_dt) |
                Q(start_time__lt=end_dt, end_time__gte=start_dt)
            )
        except (TypeError, ValueError):
            pass
        return self._calendar_list_response(queryset)

    @action(detail=False, methods=['get'], url_path='Detail')
    def detail_185(self, request):
        instance = self._get_instance_from_payload(request.query_params)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        serializer = self.get_serializer(instance)
        joins = instance.participants.filter(is_deleted=False)
        joined = joins.filter(accept_type=CalendarJoin.JoinStatus.ACCEPTED)
        refused = joins.filter(accept_type=CalendarJoin.JoinStatus.DECLINED)
        not_yet = joins.filter(accept_type=CalendarJoin.JoinStatus.PENDING)
        return ResponseServer.success(data={
            'data': {
                'calendar': serializer.data,
                'calendarJoineds': CalendarJoinSerializer(joined, many=True).data,
                'calendarRefuses': CalendarJoinSerializer(refused, many=True).data,
                'calendarNotYets': CalendarJoinSerializer(not_yet, many=True).data,
            }
        })

    @action(detail=False, methods=['post'], url_path='Create')
    def create_185(self, request):
        return self.create(request)

    @action(detail=False, methods=['post'], url_path='Update')
    def update_185(self, request):
        instance = self._get_instance_from_payload(request.data)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return ResponseServer.success(self.get_serializer(instance).data, message='Cập nhật lịch thành công')

    @action(detail=False, methods=['post'], url_path='Delete')
    def delete_185(self, request):
        instance = self._get_instance_from_payload(request.data)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        self._soft_delete(instance, request)
        return ResponseServer.success(message='Xóa lịch thành công')

    @action(detail=False, methods=['patch'], url_path='ChangeEventTime')
    def change_event_time(self, request):
        instance = self._get_instance_from_payload(request.data)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        from_time = self._parse_datetime_param(request.data.get('fromTime') or request.data.get('from_time'))
        to_time = self._parse_datetime_param(request.data.get('toTime') or request.data.get('to_time'))
        if not from_time or not to_time:
            return ResponseServer.failure('Thời gian không hợp lệ')
        instance.from_time = from_time
        instance.start_time = from_time
        instance.to_time = to_time
        instance.end_time = to_time
        instance.save(update_fields=['from_time', 'start_time', 'to_time', 'end_time', 'updated_at'])
        return ResponseServer.success(self.get_serializer(instance).data, message='Cập nhật thời gian lịch thành công')

    @action(detail=False, methods=['patch'], url_path='Cancel')
    def cancel(self, request):
        instance = self._get_instance_from_payload(request.data)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        instance.is_canceled = True
        instance.status = Calendar.Status.CANCELLED
        instance.cancel_reason = request.data.get('cancelReason') or request.data.get('cancel_reason') or ''
        instance.save(update_fields=['is_canceled', 'status', 'cancel_reason', 'updated_at'])
        return ResponseServer.success(self.get_serializer(instance).data, message='Đã hủy lịch')

    @action(detail=False, methods=['patch'], url_path='UndoCancel')
    def undo_cancel(self, request):
        instance = self._get_instance_from_payload(request.data)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        instance.is_canceled = False
        instance.status = Calendar.Status.PENDING
        instance.cancel_reason = None
        instance.cancel_undo_date = timezone.now()
        instance.save(update_fields=['is_canceled', 'status', 'cancel_reason', 'cancel_undo_date', 'updated_at'])
        return ResponseServer.success(self.get_serializer(instance).data, message='Đã khôi phục lịch')

    @action(detail=False, methods=['patch'], url_path='Lock')
    def lock(self, request):
        instance = self._get_instance_from_payload(request.data)
        if not instance:
            return ResponseServer.not_found('Không tìm thấy lịch')
        instance.is_locked = True
        instance.save(update_fields=['is_locked', 'updated_at'])
        return ResponseServer.success(self.get_serializer(instance).data, message='Đã khóa lịch')

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        instance = self.get_object()
        instance.status = Calendar.Status.CONFIRMED
        instance.save(update_fields=['status', 'updated_at'])
        return ResponseServer.success(message='Xác nhận lịch thành công')

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        instance = self.get_object()
        join_status = request.data.get('status', request.data.get('acceptType', CalendarJoin.JoinStatus.ACCEPTED))
        obj, _ = CalendarJoin.objects.update_or_create(
            calendar=instance,
            user_id=request.user.id,
            defaults={'status': join_status, 'accept_type': join_status},
        )
        return ResponseServer.success(data=CalendarJoinSerializer(obj).data)

    def _calendar_list_response(self, queryset):
        serializer = self.get_serializer(queryset, many=True)
        return ResponseServer.success(data={'data': {'calendars': serializer.data}})

    def _get_instance_from_payload(self, payload):
        calendar_id = payload.get('id') or payload.get('ID') or payload.get('calendarId')
        if not calendar_id:
            return None
        return Calendar.objects.filter(id=calendar_id, is_deleted=False).first()

    def _soft_delete(self, instance, request):
        instance.is_deleted = True
        instance.deleted_date = timezone.now()
        instance.deleted_by = str(getattr(request.user, 'id', '') or '')
        instance.save(update_fields=['is_deleted', 'deleted_date', 'deleted_by', 'updated_at'])

    @staticmethod
    def _parse_day(value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value.date()
        parsed_dt = parse_datetime(str(value))
        if parsed_dt:
            return parsed_dt.date()
        return parse_date(str(value))

    @classmethod
    def _parse_datetime_param(cls, value):
        if not value:
            return None
        if isinstance(value, datetime):
            return cls._aware_datetime(value)
        parsed_dt = parse_datetime(str(value))
        if parsed_dt:
            return cls._aware_datetime(parsed_dt)
        parsed_day = parse_date(str(value))
        if parsed_day:
            return cls._aware_datetime(datetime.combine(parsed_day, time.min))
        return None

    @staticmethod
    def _aware_datetime(value):
        if timezone.is_naive(value):
            return timezone.make_aware(value, timezone.get_current_timezone())
        return value
