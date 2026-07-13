import json
from rest_framework import serializers
from core.departments.models import Department, Staff
from .models import Organization, StaffFile, UserConcurrently


class StaffListSerializer(serializers.ModelSerializer):
    userName = serializers.SerializerMethodField()
    fullName = serializers.SerializerMethodField()
    phoneNumber = serializers.CharField(source='phone_number', default='', allow_blank=True)
    roleName = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    staffFiles = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = ['id', 'userName', 'fullName', 'email', 'phoneNumber', 'roleName', 'status', 'staffFiles']

    def get_userName(self, obj):
        return obj.user.username if obj.user else ''

    def get_fullName(self, obj):
        return obj.full_name or (obj.user.get_full_name() if obj.user else '')

    def get_roleName(self, obj):
        if not obj.user_id:
            return ''
        uc = UserConcurrently.objects.select_related('role').filter(user_id=obj.user_id, is_deleted=False).first()
        return uc.role.name if uc and uc.role else ''

    def get_status(self, obj):
        return bool(obj.user and obj.user.is_active)

    def get_staffFiles(self, obj):
        files = StaffFile.objects.filter(staff=obj, is_deleted=False)
        result = [serialize_staff_file(f) for f in files]
        return json.dumps(result)


class StaffDetailSerializer(serializers.ModelSerializer):
    userID = serializers.SerializerMethodField()
    userName = serializers.SerializerMethodField()
    firstName = serializers.CharField(source='first_name', default='', allow_blank=True)
    lastName = serializers.CharField(source='last_name', default='', allow_blank=True)
    fullName = serializers.SerializerMethodField()
    phoneNumber = serializers.CharField(source='phone_number', default='', allow_blank=True)
    provinceID = serializers.SerializerMethodField()
    districtID = serializers.SerializerMethodField()
    wardID = serializers.SerializerMethodField()
    provinceName = serializers.SerializerMethodField()
    districtName = serializers.SerializerMethodField()
    wardName = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    staffFiles = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            'id', 'userID', 'userName', 'firstName', 'lastName', 'fullName', 'email', 'phoneNumber',
            'provinceID', 'districtID', 'wardID', 'provinceName', 'districtName', 'wardName', 'address',
            'status', 'avatar', 'sign', 'stamp', 'sign_encrypted', 'stamp_encrypted', 'email_personal', 'staffFiles',
        ]

    def get_userID(self, obj):
        return str(obj.user_id) if obj.user_id else ''

    def get_userName(self, obj):
        return obj.user.username if obj.user else ''

    def get_fullName(self, obj):
        return obj.full_name or (obj.user.get_full_name() if obj.user else '')

    def get_provinceID(self, obj):
        return str(obj.province_id) if obj.province_id else ''

    def get_districtID(self, obj):
        return str(obj.district_id) if obj.district_id else ''

    def get_wardID(self, obj):
        return str(obj.ward_id) if obj.ward_id else ''

    def get_provinceName(self, obj):
        return obj.province.name if obj.province else ''

    def get_districtName(self, obj):
        return obj.district.name if obj.district else ''

    def get_wardName(self, obj):
        return obj.ward.name if obj.ward else ''

    def get_status(self, obj):
        return bool(obj.user and obj.user.is_active)

    def get_staffFiles(self, obj):
        files = StaffFile.objects.filter(staff=obj, is_deleted=False)
        result = [serialize_staff_file(f) for f in files]
        return json.dumps(result)


class UserConcurrentlySerializer(serializers.ModelSerializer):
    roleID = serializers.SerializerMethodField()
    roleName = serializers.SerializerMethodField()
    departmentID = serializers.SerializerMethodField()
    departmentName = serializers.SerializerMethodField()
    organizationID = serializers.SerializerMethodField()
    organizationName = serializers.SerializerMethodField()
    userID = serializers.SerializerMethodField()

    class Meta:
        model = UserConcurrently
        fields = ['id', 'userID', 'roleID', 'roleName', 'departmentID', 'departmentName', 'organizationID', 'organizationName']

    def get_userID(self, obj):
        return str(obj.user_id) if obj.user_id else ''

    def get_roleID(self, obj):
        return str(obj.role_id) if obj.role_id else ''

    def get_roleName(self, obj):
        return obj.role.name if obj.role else ''

    def get_departmentID(self, obj):
        return str(obj.department_id) if obj.department_id else ''

    def get_departmentName(self, obj):
        return obj.department.name if obj.department else ''

    def get_organizationID(self, obj):
        return str(obj.organization_id) if obj.organization_id else ''

    def get_organizationName(self, obj):
        return obj.organization.name if obj.organization else ''


def serialize_staff_file(file_obj):
    return {
        'ID': str(file_obj.id),
        'StaffID': str(file_obj.staff_id) if file_obj.staff_id else '',
        'TypeFile': file_obj.type_file,
        'File': file_obj.file or '',
        'FileName': file_obj.file_name or '',
        'Extension': file_obj.extension or '',
        'Size': file_obj.size,
        'Type': file_obj.type,
    }