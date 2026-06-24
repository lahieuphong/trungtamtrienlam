"""Celery tasks — thay thế Background Worker + Quartz của .NET SaoLuu."""
from celery import shared_task


@shared_task(name='backup.run_backup')
def run_backup(backup_type: int, created_by: str):
    """Chạy backup database. Gọi từ API hoặc Celery Beat (lịch tự động)."""
    from .services import BackupService
    BackupService().backup(backup_type=backup_type, created_by=created_by)


@shared_task(name='backup.run_restore')
def run_restore(backup_log_id: str, created_by: str):
    """Phục hồi từ file backup theo backup_log_id."""
    from .services import BackupService
    BackupService().restore(backup_log_id=backup_log_id, created_by=created_by)
