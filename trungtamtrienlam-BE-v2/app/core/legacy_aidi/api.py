from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.legacy_aidi.permissions import get_legacy_auth_context


class PermissionByUserApi(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        context = get_legacy_auth_context(request.user)
        permission_info = context.get('permissionInfo', [])
        return Response({
            'status': 200,
            'data': {
                'data': {
                    'data': permission_info,
                },
                'roleInfo': context.get('roleInfo') or {},
                'userInfo': context.get('userInfo') or {},
            },
        })
