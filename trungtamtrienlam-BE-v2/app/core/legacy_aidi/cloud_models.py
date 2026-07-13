"""Unmanaged mappings for the 185-Cloud backup worker database tables.

These classes are opt-in and are not imported by core.legacy_aidi.models,
because 185-Cloud uses a separate database/schema and table names overlap
with 185-BE.
"""

from django.db import models


class LegacyCloudBackupLog(models.Model):
    ID = models.CharField(max_length=255, db_column='ID', primary_key=True)
    Title = models.CharField(max_length=255, db_column='Title', blank=True, null=True)
    BackupType = models.IntegerField(db_column='BackupType', blank=True, null=True)
    Size = models.DecimalField(max_digits=18, decimal_places=2, db_column='Size', blank=True, null=True)
    PathType = models.IntegerField(db_column='PathType', blank=True, null=True)
    Path = models.TextField(db_column='Path', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.CharField(max_length=255, db_column='CreatedBy', blank=True, null=True)
    DatabaseName = models.TextField(db_column='DatabaseName', blank=True, null=True)
    Server = models.CharField(max_length=255, db_column='Server', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_cloud'
        managed = False
        db_table = 'BackupLogs'


class LegacyCloudRestoreLog(models.Model):
    ID = models.CharField(max_length=255, db_column='ID', primary_key=True)
    Title = models.CharField(max_length=255, db_column='Title', blank=True, null=True)
    Path = models.TextField(db_column='Path', blank=True, null=True)
    DatabaseName = models.TextField(db_column='DatabaseName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.CharField(max_length=255, db_column='CreatedBy', blank=True, null=True)
    Server = models.CharField(max_length=255, db_column='Server', blank=True, null=True)
    PathType = models.IntegerField(db_column='PathType', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_cloud'
        managed = False
        db_table = 'RestoreLogs'


class LegacyCloudSettingNotification(models.Model):
    ID = models.CharField(max_length=255, db_column='ID', primary_key=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    UpdatedAt = models.DateTimeField(db_column='UpdatedAt', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    ContentType = models.TextField(db_column='ContentType', blank=True, null=True)
    Title = models.CharField(max_length=255, db_column='Title', blank=True, null=True)
    TimeType = models.CharField(max_length=255, db_column='TimeType', blank=True, null=True)
    SettingType = models.IntegerField(db_column='SettingType', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_cloud'
        managed = False
        db_table = 'SettingsNotification'


__all__ = [
    'LegacyCloudBackupLog',
    'LegacyCloudRestoreLog',
    'LegacyCloudSettingNotification',
]
