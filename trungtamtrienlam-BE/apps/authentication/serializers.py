from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Role, UserRole, Function, Action, Permission


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    provinceID = serializers.SerializerMethodField()
    districtID = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'avatar', 'department_id', 'position', 'is_active',
            'provinceID', 'districtID', 'address',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_provinceID(self, obj):
        return str(obj.province_id) if obj.province_id else ''

    def get_districtID(self, obj):
        return str(obj.district_id) if obj.district_id else ''


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'phone', 'department_id', 'position', 'province_id', 'district_id',
            'address',
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'phone', 'avatar',
            'department_id', 'position', 'province_id', 'district_id',
            'address',
        ]


class RoleSerializer(serializers.ModelSerializer):
    isDirector = serializers.BooleanField(source='is_director', read_only=True)
    isAdmin = serializers.BooleanField(source='is_admin', read_only=True)
    isViceDirector = serializers.BooleanField(source='is_vice_director', read_only=True)
    canReceiveTask = serializers.BooleanField(source='can_receive_task', read_only=True)
    canAssignTask = serializers.BooleanField(source='can_assign_task', read_only=True)
    canSeeDepartmentTasks = serializers.BooleanField(source='can_see_department_tasks', read_only=True)

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'description', 'is_director', 'is_admin', 'is_disabled',
            'level', 'can_receive_task', 'can_assign_task', 'can_see_department_tasks', 'is_vice_director',
            'isDirector', 'isAdmin', 'isViceDirector', 'canReceiveTask', 'canAssignTask', 'canSeeDepartmentTasks',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FunctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Function
        fields = ['id', 'name', 'url', 'icon', 'parent_id', 'sort_order']
        read_only_fields = ['id']


class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = ['id', 'name', 'code']
        read_only_fields = ['id']


class PermissionSerializer(serializers.ModelSerializer):
    departmentID = serializers.CharField(source='department_id', required=False, allow_blank=True)
    roleName = serializers.CharField(source='role.name', read_only=True)
    functionName = serializers.CharField(source='function.name', read_only=True)
    actionCode = serializers.CharField(source='action.code', read_only=True)

    class Meta:
        model = Permission
        fields = [
            'id', 'role', 'roleName', 'department_id', 'departmentID',
            'function', 'functionName', 'action', 'actionCode',
        ]
