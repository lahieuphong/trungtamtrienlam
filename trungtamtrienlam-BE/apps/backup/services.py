"""BackupService — port từ BackupService.cs của SaoLuu .NET."""
import subprocess
from datetime import datetime
from django.conf import settings
from .models import BackupLog, RestoreLog


class BackupService:
    def backup(self, backup_type: int, created_by: str) -> BackupLog:
        now = datetime.now()
        title = f'Backup_{now.strftime("%Y-%m-%d_%H-%M-%S")}'
        log = BackupLog.objects.create(
            title=title,
            backup_type=backup_type,
            status=BackupLog.Status.IN_PROGRESS,
            path='',
            database_name='',
            created_by=created_by,
        )
        try:
            # TODO: implement actual pg_dump or SQL Server backup
            log.status = BackupLog.Status.SUCCESS
            log.save(update_fields=['status', 'path', 'size_kb', 'updated_at'])
        except Exception as ex:
            log.status = BackupLog.Status.FAILED
            log.error_message = str(ex)
            log.save(update_fields=['status', 'error_message', 'updated_at'])
        return log

    def restore(self, backup_log_id: str, created_by: str) -> RestoreLog:
        backup_log = BackupLog.objects.get(id=backup_log_id)
        log = RestoreLog.objects.create(
            title=f'Restore_{datetime.now().strftime("%Y-%m-%d_%H-%M-%S")}',
            backup=backup_log,
            path=backup_log.path,
            database_name=backup_log.database_name,
            server=backup_log.server,
            status=RestoreLog.Status.IN_PROGRESS,
            created_by=created_by,
        )
        try:
            # TODO: implement actual restore
            log.status = RestoreLog.Status.SUCCESS
            log.save(update_fields=['status', 'updated_at'])
        except Exception as ex:
            log.status = RestoreLog.Status.FAILED
            log.error_message = str(ex)
            log.save(update_fields=['status', 'error_message', 'updated_at'])
        return log
