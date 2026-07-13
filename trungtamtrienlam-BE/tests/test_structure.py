from pathlib import Path
from unittest import TestCase


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class ProjectStructureTests(TestCase):
    def test_required_project_files_exist(self):
        required_paths = (
            'manage.py',
            'requirements.txt',
            'config/__init__.py',
            'config/asgi.py',
            'config/urls.py',
            'config/wsgi.py',
            'config/settings/base.py',
            'config/settings/development.py',
            'config/settings/production.py',
            'config/settings/test.py',
            '.dockerignore',
            'Dockerfile',
            'docker-compose.yml',
            'docker-compose.prod.yml',
            'docker-local-up.cmd',
            'docker-local-down.cmd',
            'nginx/default.conf',
            'scripts/entrypoint.sh',
            'deploy/env.production.example',
            'deploy/README.md',
        )

        missing = [path for path in required_paths if not (PROJECT_ROOT / path).is_file()]

        self.assertEqual([], missing, f'Missing required project files: {missing}')

    def test_every_model_app_has_a_migrations_package(self):
        app_root = PROJECT_ROOT / 'apps'
        model_apps = [path for path in app_root.iterdir() if (path / 'models.py').is_file()]
        missing = [path.name for path in model_apps if not (path / 'migrations' / '__init__.py').is_file()]

        self.assertEqual([], missing, f'Apps without a migrations package: {missing}')
