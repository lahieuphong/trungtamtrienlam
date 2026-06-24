import json
from rest_framework import serializers
from apps.authentication.models import User, Role
from apps.departments.models import Department
from .models import Province, District, Organization, StaffFile, UserConcurrently


class StaffListSerializer(serializers.ModelSerializer):
    """Serializer cho danh sách staff — format y chang 185."""
    userName = serializers.CharField(source='username')
    fullName = serializers.SerializerMethodField()
    phoneNumber = serializers.CharField(source='phone', default='')
    roleName = serializers.SerializerMethodField()
    status = serializers.BooleanField(source='is_active')
    staffFiles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'userName', 'fullName', 'email', 'phoneNumber', 'roleName', 'status', 'staffFiles']

    def get_fullName(self, obj):
        return f'{obj.last_name} {obj.first_name}'.strip() or obj.username

    def get_roleName(self, obj):
        uc = UserConcurrently.objects.filter(user_id=str(obj.id), is_deleted=False).first()
        if not uc or not uc.role_id:
            return ''
        role = Role.objects.filter(id=uc.role_id).first()
        return role.name if role else ''

    def get_staffFiles(self, obj):
        files = StaffFile.objects.filter(user_id=str(obj.id), is_deleted=False)
        result = [
            {
                'TypeFile': f.type_file,
                'File': f.file or '',
                'FileName': f.file_name or '',
                'Extension': f.extension or '',
                'Size': f.size,
            }
            for f in files
        ]
        return json.dumps(result)


class StaffDetailSerializer(serializers.ModelSerializer):
    """Serializer cho chi tiết staff — format y chang 185."""
    userName = serializers.CharField(source='username')
    firstName = serializers.CharField(source='first_name', default='')
    lastName = serializers.CharField(source='last_name', default='')
    phoneNumber = serializers.CharField(source='phone', default='')
    provinceName = serializers.SerializerMethodField()
    districtName = serializers.SerializerMethodField()
    status = serializers.BooleanField(source='is_active')
    staffFiles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'userName', 'firstName', 'lastName', 'email', 'phoneNumber',
            'provinceName', 'districtName', 'address',
            'status', 'staffFiles',
        ]

    def get_provinceName(self, obj):
        if not obj.province_id:
            return ''
        prov = Province.objects.filter(id=obj.province_id).first()
        return prov.name if prov else ''

    def get_districtName(self, obj):
        if not obj.district_id:
            return ''
        dist = District.objects.filter(id=obj.district_id).first()
        return dist.name if dist else ''

    def get_staffFiles(self, obj):
        files = StaffFile.objects.filter(user_id=str(obj.id), is_deleted=False)
        result = [
            {
                'TypeFile': f.type_file,
                'File': f.file or '',
                'FileName': f.file_name or '',
                'Extension': f.extension or '',
                'Size': f.size,
            }
            for f in files
        ]
        return json.dumps(result)


class UserConcurrentlySerializer(serializers.ModelSerializer):
    roleID = serializers.CharField(source='role_id', default='')
    roleName = serializers.SerializerMethodField()
    departmentID = serializers.CharField(source='department_id', default='')
    departmentName = serializers.SerializerMethodField()
    organizationID = serializers.CharField(source='organization_id', default='')
    organizationName = serializers.SerializerMethodField()
    userID = serializers.CharField(source='user_id', default='')

    class Meta:
        model = UserConcurrently
        fields = ['id', 'userID', 'roleID', 'roleName', 'departmentID', 'departmentName', 'organizationID', 'organizationName']

    def get_roleName(self, obj):
        if not obj.role_id:
            return ''
        role = Role.objects.filter(id=obj.role_id).first()
        return role.name if role else ''

    def get_departmentName(self, obj):
        if not obj.department_id:
            return ''
        dept = Department.objects.filter(id=obj.department_id).first()
        return dept.name if dept else ''

    def get_organizationName(self, obj):
        if not obj.organization_id:
            return ''
        org = Organization.objects.filter(id=obj.organization_id).first()
        return org.name if org else ''
