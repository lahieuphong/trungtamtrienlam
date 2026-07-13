from django.test import SimpleTestCase
from django.urls import resolve, reverse


class RouteSmokeTests(SimpleTestCase):
    def test_liveness_probe_returns_service_status_without_dependencies(self):
        response = self.client.get(reverse('healthcheck'))

        self.assertEqual(200, response.status_code)
        self.assertEqual(
            {
                'status': 'ok',
                'service': 'trungtamtrienlam-backend',
            },
            response.json(),
        )

    def test_readiness_probe_route_exists(self):
        path = reverse('readiness')

        self.assertEqual('/readiness/', path)
        self.assertEqual('readiness', resolve(path).url_name)

    def test_named_api_routes_keep_their_public_paths(self):
        expected_routes = {
            'auth-login': '/api/auth/login/',
            'legacy-permissions-get': '/api/Permissions/get',
            'staff-getlist': '/api/accounts/staff/getlist/',
            'department-list': '/api/departments/departments/',
            'task-list': '/api/tasks/',
            'monument-get-list': '/api/Monument/GetList',
            'notification-list': '/api/notifications/',
            'backup-log-list': '/api/backup/logs/',
        }

        for route_name, expected_path in expected_routes.items():
            with self.subTest(route_name=route_name):
                self.assertEqual(expected_path, reverse(route_name))
                self.assertEqual(route_name, resolve(expected_path).url_name)

    def test_prod_compatible_chat_mount_is_resolvable(self):
        match = resolve('/api/Chat/GetList')

        self.assertEqual('ChatListApi', match.func.view_class.__name__)
