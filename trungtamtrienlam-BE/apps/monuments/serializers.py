from rest_framework import serializers

from .models import Monument, MonumentFile, MonumentHistory, MonumentSection


PENDING_LEVEL_NAMES = {
    3: 'Trưởng phòng',
    2: 'Phó giám đốc',
    1: 'Giám đốc',
}


STATUS_NAMES = {
    Monument.Status.DRAFT: 'Soạn thảo',
    Monument.Status.PENDING_APPROVAL: 'Chờ duyệt',
    Monument.Status.APPROVED: 'Đã duyệt',
    Monument.Status.NOT_APPROVED: 'Không duyệt',
    Monument.Status.REDO: 'Trả lại',
    Monument.Status.PUBLISHED: 'Đã xuất bản',
}


def _file_path(file_field):
    if not file_field:
        return None
    try:
        return file_field.name
    except ValueError:
        return None


def serialize_monument_file(item):
    return {
        'id': str(item.id),
        'monumentID': str(item.monument_id),
        'fileName': item.file_name,
        'name': item.file_name,
        'size': item.size,
        'link': _file_path(item.file),
        'path': _file_path(item.file),
        'extension': item.extension,
        'type': item.type,
        'mode': item.mode,
        'createdDate': item.created_at,
    }


def serialize_monument_section(item):
    return {
        'id': str(item.id),
        'monumentID': str(item.monument_id),
        'content': item.content or '',
        'type': item.type,
        'order': item.order,
        'fileName': item.file_name,
        'fileSize': item.file_size,
        'fileLink': _file_path(item.file),
        'fileExtension': item.file_extension,
        'fileType': item.file_type,
    }


def serialize_monument_history(item):
    return {
        'id': str(item.id),
        'monumentID': str(item.monument_id),
        'requestedBy': str(item.requested_by_id) if item.requested_by_id else None,
        'confirmedBy': str(item.confirmed_by_id) if item.confirmed_by_id else None,
        'requestedDate': item.requested_date,
        'confirmedDate': item.confirmed_date,
        'status': item.status,
        'level': item.level,
        'levelName': PENDING_LEVEL_NAMES.get(item.level),
        'reason': item.reason,
        'createdDate': item.created_at,
    }


def serialize_monument(item, avatar=None):
    return {
        'id': str(item.id),
        'name': item.name,
        'recognitionDecision': item.recognition_decision,
        'address': item.address,
        'description': item.description or '',
        'yearOfConstruction': item.year_of_construction,
        'rating': item.rating,
        'location': item.location,
        'typeOfMonument': item.type_of_monument,
        'priorityMode': item.priority_mode,
        'status': item.status,
        'statusName': STATUS_NAMES.get(item.status, ''),
        'type': item.type,
        'userID': str(item.user_id),
        'createdBy': item.created_by,
        'createdDate': item.created_at,
        'modifiedDate': item.updated_at,
        'pendingLevel': item.pending_level,
        'pendingLevelName': PENDING_LEVEL_NAMES.get(item.pending_level),
        'reason': item.reason,
        'avatar': avatar,
    }


class MonumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Monument
        fields = '__all__'


class MonumentFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonumentFile
        fields = '__all__'


class MonumentSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonumentSection
        fields = '__all__'


class MonumentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MonumentHistory
        fields = '__all__'
