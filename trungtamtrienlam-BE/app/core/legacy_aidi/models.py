"""Unmanaged Django mappings for the legacy 185-BE database schema.

Generated from D:/my_document/Trungtamtrienlam/185-BE/Cores/AIDI.Model/Databases.
These classes intentionally use managed = False so importing the app cannot
create, alter, or delete database tables.
"""

import uuid

from django.db import models


def managed_role_id_generator():
    return str(uuid.uuid4())


def managed_department_id_generator():
    return str(uuid.uuid4())


def managed_staff_id_generator():
    return str(uuid.uuid4())


def managed_menu_item_id_generator():
    return str(uuid.uuid4())


def managed_permission_id_generator():
    return str(uuid.uuid4())


def managed_chat_id_generator():
    return str(uuid.uuid4())


class ManagedRole(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_role_id_generator)
    name = models.CharField(max_length=255)
    is_admin = models.BooleanField(default=False)
    is_director = models.BooleanField(blank=True, null=True)
    is_disabled = models.BooleanField(blank=True, null=True)
    is_deleted = models.BooleanField(blank=True, null=True)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    modified_by = models.TextField(blank=True, null=True)
    level = models.IntegerField(default=4)
    can_receive_task = models.BooleanField(default=True)
    can_assign_task = models.BooleanField(default=False)
    can_see_department_tasks = models.BooleanField(default=False)
    is_vice_director = models.BooleanField(default=False)

    class Meta:
        db_table = 'aidi_managed_roles'
        ordering = ('level', 'name')
        verbose_name = 'Managed role'
        verbose_name_plural = 'Managed roles'

    def __str__(self):  # pragma: nocover
        return self.name


class ManagedDepartment(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_department_id_generator)
    name = models.CharField(max_length=255)
    is_deleted = models.BooleanField(blank=True, null=True)
    is_poad = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    modified_by = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_departments'
        ordering = ('name',)
        verbose_name = 'Managed department'
        verbose_name_plural = 'Managed departments'

    def __str__(self):  # pragma: nocover
        return self.name


class ManagedStaffProfile(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_staff_id_generator)
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='managed_staff_profile',
    )
    province_id = models.CharField(max_length=64, blank=True, default='')
    district_id = models.CharField(max_length=64, blank=True, default='')
    ward_id = models.CharField(max_length=64, blank=True, default='')
    address = models.TextField(blank=True, default='')
    avatar = models.CharField(max_length=500, blank=True, default='')
    sign = models.CharField(max_length=500, blank=True, default='')
    stamp = models.CharField(max_length=500, blank=True, default='')
    sign_encrypted = models.TextField(blank=True, default='')
    stamp_encrypted = models.TextField(blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    modified_by = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_staff_profiles'
        ordering = ('user__username',)
        verbose_name = 'Managed staff profile'
        verbose_name_plural = 'Managed staff profiles'

    def __str__(self):  # pragma: nocover
        return self.user.get_username()


class ManagedStaffPosition(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_staff_id_generator)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='managed_staff_positions',
    )
    role_id = models.CharField(max_length=64)
    department_id = models.CharField(max_length=64)
    organization_id = models.CharField(max_length=64, blank=True, default='')
    is_default = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    modified_by = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_staff_positions'
        ordering = ('user_id', '-is_default', 'created_date')
        verbose_name = 'Managed staff position'
        verbose_name_plural = 'Managed staff positions'

    def __str__(self):  # pragma: nocover
        return f'{self.user.get_username()} | {self.role_id} | {self.department_id}'


class ManagedMenuItem(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_menu_item_id_generator)
    function_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    unique_key = models.CharField(max_length=255)
    unique_code = models.CharField(max_length=255, blank=True, default='')
    path = models.CharField(max_length=500, blank=True, default='')
    url = models.CharField(max_length=500, blank=True, default='')
    parent_id = models.CharField(max_length=64, blank=True, default='')
    icon = models.FileField(upload_to='legacy_aidi/menu_icons/', max_length=500, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    is_disabled = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    modified_by = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_menu_items'
        ordering = ('sort_order', 'name')
        verbose_name = 'Managed menu item'
        verbose_name_plural = 'Managed menu items'

    def __str__(self):  # pragma: nocover
        return self.name

    def normalized_icon(self):
        icon_file = getattr(self, 'icon', None)
        icon = (getattr(icon_file, 'name', None) or '').strip()
        if not icon:
            return ''

        if icon.startswith('/icons/') or icon.startswith('/api/') or icon.startswith('/media/'):
            return icon

        if icon.startswith('http://') or icon.startswith('https://'):
            return icon

        if icon.startswith('icons/'):
            return f'/{icon}'

        image_extensions = ('.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp')
        if '/' not in icon and icon.lower().endswith(image_extensions):
            return f'/icons/{icon}'

        try:
            return icon_file.url
        except ValueError:
            return ''


class ManagedPermission(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_permission_id_generator)
    role_id = models.CharField(max_length=64)
    department_id = models.CharField(max_length=64, blank=True, default='')
    function_id = models.CharField(max_length=64)
    can_view = models.BooleanField(default=False)
    can_add = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_verify = models.BooleanField(blank=True, null=True)
    can_refuse = models.BooleanField(blank=True, null=True)
    can_download = models.BooleanField(blank=True, null=True)
    is_public = models.BooleanField(blank=True, null=True)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.TextField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    modified_by = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_permissions'
        ordering = ('role_id', 'department_id', 'function_id')
        unique_together = ('role_id', 'department_id', 'function_id')
        verbose_name = 'Managed permission'
        verbose_name_plural = 'Managed permissions'

    def __str__(self):  # pragma: nocover
        return f'{self.role_id}:{self.department_id}:{self.function_id}'


class ManagedChat(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    name = models.CharField(max_length=255, blank=True, default='')
    type = models.IntegerField(default=1)
    avatar = models.CharField(max_length=500, blank=True, default='')
    created_by = models.CharField(max_length=64, blank=True, default='')
    updated_by = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_date = models.DateTimeField(auto_now=True, blank=True, null=True)
    is_ai = models.BooleanField(default=False)
    user_id = models.CharField(max_length=64, blank=True, default='')
    event_type = models.IntegerField(blank=True, null=True)
    pin_date = models.DateTimeField(blank=True, null=True)
    link_id = models.CharField(max_length=255, blank=True, default='')
    message_type = models.IntegerField(default=1)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'aidi_managed_chats'
        ordering = ('-updated_date', '-created_date')
        verbose_name = 'Managed chat'
        verbose_name_plural = 'Managed chats'

    def __str__(self):  # pragma: nocover
        return self.name or self.id


class ManagedChatUser(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    user_id = models.CharField(max_length=64)
    role = models.IntegerField(default=3)
    add_by = models.CharField(max_length=64, blank=True, default='')
    is_muted = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_users'
        ordering = ('chat_id', 'role', 'created_date')
        unique_together = ('chat_id', 'user_id')
        verbose_name = 'Managed chat user'
        verbose_name_plural = 'Managed chat users'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_id}:{self.user_id}'


class ManagedChatMessage(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    sender_id = models.CharField(max_length=64)
    message_type = models.IntegerField(default=1)
    reply_to_id = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    is_unsend = models.BooleanField(default=False)
    content = models.TextField(blank=True, default='')
    chat_id = models.CharField(max_length=64)
    event_id = models.CharField(max_length=64, blank=True, default='')
    event_type = models.IntegerField(blank=True, null=True)
    is_pin = models.BooleanField(default=False)
    list_user_join_remind = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'aidi_managed_chat_messages'
        ordering = ('created_date',)
        verbose_name = 'Managed chat message'
        verbose_name_plural = 'Managed chat messages'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_id}:{self.sender_id}:{self.created_date}'


class ManagedChatFile(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    message_id = models.CharField(max_length=64)
    file = models.CharField(max_length=500)
    file_name = models.CharField(max_length=255, blank=True, default='')
    size = models.FloatField(default=0)
    extension = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        db_table = 'aidi_managed_chat_files'
        ordering = ('created_date',)
        verbose_name = 'Managed chat file'
        verbose_name_plural = 'Managed chat files'

    def __str__(self):  # pragma: nocover
        return self.file_name or self.file


class ManagedChatLink(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    message_id = models.CharField(max_length=64)
    link = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    created_by = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        db_table = 'aidi_managed_chat_links'
        ordering = ('created_date',)
        verbose_name = 'Managed chat link'
        verbose_name_plural = 'Managed chat links'

    def __str__(self):  # pragma: nocover
        return self.link


class ManagedChatSeen(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    chat_message_id = models.CharField(max_length=64, blank=True, default='')
    user_id = models.CharField(max_length=64)
    seen_date = models.DateTimeField(auto_now=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_seen'
        ordering = ('chat_id', 'user_id')
        unique_together = ('chat_id', 'user_id')
        verbose_name = 'Managed chat seen'
        verbose_name_plural = 'Managed chat seen'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_id}:{self.user_id}'


class ManagedChatPin(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    user_id = models.CharField(max_length=64)
    pin_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_pins'
        ordering = ('-pin_date',)
        unique_together = ('chat_id', 'user_id')
        verbose_name = 'Managed chat pin'
        verbose_name_plural = 'Managed chat pins'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_id}:{self.user_id}'


class ManagedChatAwaitConfirm(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=managed_chat_id_generator)
    chat_id = models.CharField(max_length=64)
    user_id = models.CharField(max_length=64)
    status = models.IntegerField(default=1)
    created_by = models.CharField(max_length=64, blank=True, default='')
    confirmed_by = models.CharField(max_length=64, blank=True, default='')
    created_date = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    confirmed_date = models.DateTimeField(blank=True, null=True)
    modified_date = models.DateTimeField(auto_now=True, blank=True, null=True)

    class Meta:
        db_table = 'aidi_managed_chat_await_confirms'
        ordering = ('-created_date',)
        verbose_name = 'Managed chat await confirm'
        verbose_name_plural = 'Managed chat await confirms'

    def __str__(self):  # pragma: nocover
        return f'{self.chat_id}:{self.user_id}:{self.status}'


class LegacyActionInFunction(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FunctionID = models.CharField(max_length=64, db_column='FunctionID', blank=True, null=True)
    ActionID = models.CharField(max_length=64, db_column='ActionID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ActionInFunctions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyAction(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    IsDisabled = models.BooleanField(db_column='IsDisabled', blank=True, null=True)
    UniqueKey = models.CharField(max_length=255, db_column='UniqueKey', blank=True, null=True)
    SortOrder = models.IntegerField(db_column='SortOrder', blank=True, null=True)
    UniqueCode = models.CharField(max_length=255, db_column='UniqueCode', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Actions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyAlert(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    UserIDTo = models.CharField(max_length=255, db_column='UserIDTo', blank=True, null=True)
    UserIDFrom = models.CharField(max_length=255, db_column='UserIDFrom', blank=True, null=True)
    IsRead = models.BooleanField(db_column='IsRead', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Alerts'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyArtifact(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Image = models.TextField(db_column='Image', blank=True, null=True)
    Status = models.BooleanField(db_column='Status', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    ObjectID = models.CharField(max_length=64, db_column='ObjectID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Artifacts'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyAssetFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    AssetID = models.CharField(max_length=64, db_column='AssetID', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'AssetFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyAsset(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    State = models.IntegerField(db_column='State', blank=True, null=True)
    Code = models.CharField(max_length=255, db_column='Code', blank=True, null=True)
    Location = models.TextField(db_column='Location', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    Avatar = models.CharField(max_length=255, db_column='Avatar', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Assets'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyBackupLog(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    BackupType = models.IntegerField(db_column='BackupType', blank=True, null=True)
    Size = models.DecimalField(max_digits=18, decimal_places=2, db_column='Size', blank=True, null=True)
    PathType = models.IntegerField(db_column='PathType', blank=True, null=True)
    Path = models.CharField(max_length=255, db_column='Path', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    DatabaseName = models.TextField(db_column='DatabaseName', blank=True, null=True)
    Server = models.TextField(db_column='Server', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BackupLogs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyBanner(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    IsShow = models.BooleanField(db_column='IsShow', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Thumbnail = models.TextField(db_column='Thumbnail', blank=True, null=True)
    Order = models.IntegerField(db_column='Order', blank=True, null=True)
    StoryID = models.CharField(max_length=64, db_column='StoryID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Banners'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyBorrowAssetHistory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RequestedDate = models.DateTimeField(db_column='RequestedDate', blank=True, null=True)
    ReasonRefusePay = models.TextField(db_column='ReasonRefusePay', blank=True, null=True)
    RefusePayDate = models.DateTimeField(db_column='RefusePayDate', blank=True, null=True)
    RefuseBy = models.TextField(db_column='RefuseBy', blank=True, null=True)
    BorrowID = models.CharField(max_length=64, db_column='BorrowID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BorrowAssetHistories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyBorrowAsset(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    FromBorrowTime = models.DateTimeField(db_column='FromBorrowTime', blank=True, null=True)
    ToBorrowTime = models.DateTimeField(db_column='ToBorrowTime', blank=True, null=True)
    BorrowID = models.CharField(max_length=64, db_column='BorrowID', blank=True, null=True)
    AssetID = models.CharField(max_length=64, db_column='AssetID', blank=True, null=True)
    ConfirmedBorrowDate = models.DateTimeField(db_column='ConfirmedBorrowDate', blank=True, null=True)
    ConfirmedBorrowBy = models.TextField(db_column='ConfirmedBorrowBy', blank=True, null=True)
    ConfirmedPayDate = models.DateTimeField(db_column='ConfirmedPayDate', blank=True, null=True)
    ConfirmedPayBy = models.TextField(db_column='ConfirmedPayBy', blank=True, null=True)
    RefuseBorrowBy = models.TextField(db_column='RefuseBorrowBy', blank=True, null=True)
    RefuseBorrowDate = models.DateTimeField(db_column='RefuseBorrowDate', blank=True, null=True)
    PayRequestDate = models.DateTimeField(db_column='PayRequestDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BorrowAssets'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyBorrow(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    UserBorrowID = models.CharField(max_length=64, db_column='UserBorrowID', blank=True, null=True)
    RequestedDate = models.DateTimeField(db_column='RequestedDate', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Borrows'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyBusinessHour(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Day = models.IntegerField(db_column='Day', blank=True, null=True)
    StartTime = models.TextField(db_column='StartTime', blank=True, null=True)
    EndTime = models.TextField(db_column='EndTime', blank=True, null=True)
    IsOff = models.BooleanField(db_column='IsOff', blank=True, null=True)
    Note = models.TextField(db_column='Note', blank=True, null=True)
    ObjectID = models.CharField(max_length=64, db_column='ObjectID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BusinessHours'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCalendarFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    CalendarID = models.CharField(max_length=64, db_column='CalendarID', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CalendarFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCalendarJob(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    CalendarID = models.CharField(max_length=64, db_column='CalendarID', blank=True, null=True)
    JobId = models.CharField(max_length=255, db_column='JobId', blank=True, null=True)
    Deadline = models.DateTimeField(db_column='Deadline', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CalendarJobs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCalendarJoin(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    AcceptType = models.IntegerField(db_column='AcceptType', blank=True, null=True)
    CalendarID = models.CharField(max_length=64, db_column='CalendarID', blank=True, null=True)
    RefuseContent = models.TextField(db_column='RefuseContent', blank=True, null=True)
    AcceptDated = models.DateTimeField(db_column='AcceptDated', blank=True, null=True)
    RefuseDated = models.DateTimeField(db_column='RefuseDated', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CalendarJoins'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCalendar(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    FromTime = models.DateTimeField(db_column='FromTime', blank=True, null=True)
    ToTime = models.DateTimeField(db_column='ToTime', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Link = models.TextField(db_column='Link', blank=True, null=True)
    Place = models.TextField(db_column='Place', blank=True, null=True)
    JoinType = models.IntegerField(db_column='JoinType', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)
    IsLocked = models.BooleanField(db_column='IsLocked', blank=True, null=True)
    IsCanceled = models.BooleanField(db_column='IsCanceled', blank=True, null=True)
    CancelReason = models.TextField(db_column='CancelReason', blank=True, null=True)
    CancelUndoDate = models.DateTimeField(db_column='CancelUndoDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Calendars'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCategory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    IsShow = models.BooleanField(db_column='IsShow', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Categories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCategoryNew(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Image = models.TextField(db_column='Image', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CategoryNews'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyCategoryPlanTrip(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Image = models.TextField(db_column='Image', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CategoryPlanTrips'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyChatAwaitConfirm(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    ChatID = models.CharField(max_length=64, db_column='ChatID', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ChatAwaitConfirm'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyConfigPageSection(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    SectionKey = models.CharField(max_length=255, db_column='SectionKey', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    UpdatedBy = models.TextField(db_column='UpdatedBy', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)
    IsVisible = models.BooleanField(db_column='IsVisible', blank=True, null=True)
    OrderIndex = models.IntegerField(db_column='OrderIndex', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ConfigPageSections'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyConfig(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Configs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyContactManagement(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Message = models.TextField(db_column='Message', blank=True, null=True)
    CustomerName = models.CharField(max_length=255, db_column='CustomerName', blank=True, null=True)
    PhoneNumber = models.CharField(max_length=255, db_column='PhoneNumber', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Mail = models.TextField(db_column='Mail', blank=True, null=True)
    MessageForHandling = models.TextField(db_column='MessageForHandling', blank=True, null=True)
    HandlingBy = models.TextField(db_column='HandlingBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)
    UpdatedBy = models.TextField(db_column='UpdatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ContactManagements'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())

class LegacyDispatchList(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DispatchName = models.CharField(max_length=255, db_column='DispatchName', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'DispatchList'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyDistrict(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDisabled = models.BooleanField(db_column='IsDisabled', blank=True, null=True)
    ProvinceID = models.CharField(max_length=64, db_column='ProvinceID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Districts'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyDocumentHistory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskDocumentID = models.CharField(max_length=64, db_column='TaskDocumentID', blank=True, null=True)
    TaskName = models.CharField(max_length=255, db_column='TaskName', blank=True, null=True)
    DocumentStatus = models.IntegerField(db_column='DocumentStatus', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    FullName = models.CharField(max_length=255, db_column='FullName', blank=True, null=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    RoleName = models.CharField(max_length=255, db_column='RoleName', blank=True, null=True)
    IsDelete = models.BooleanField(db_column='IsDelete', blank=True, null=True)
    CreateDate = models.DateTimeField(db_column='CreateDate', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    Reason = models.TextField(db_column='Reason', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'DocumentHistories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyEmailFile(models.Model):
    Id = models.CharField(max_length=64, db_column='Id', primary_key=True)
    FilePath = models.CharField(max_length=255, db_column='FilePath', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    EmailId = models.CharField(max_length=255, db_column='EmailId', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    fileSize = models.DecimalField(max_digits=18, decimal_places=2, db_column='fileSize', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'EmailFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyEmailSignature(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    UserEmail = models.CharField(max_length=255, db_column='UserEmail', blank=True, null=True)
    SignatureName = models.CharField(max_length=255, db_column='SignatureName', blank=True, null=True)
    SignatureContent = models.TextField(db_column='SignatureContent', blank=True, null=True)
    IsDefault = models.BooleanField(db_column='IsDefault', blank=True, null=True)
    CreatedAt = models.DateTimeField(db_column='CreatedAt', blank=True, null=True)
    UpdatedAt = models.DateTimeField(db_column='UpdatedAt', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    IsReplyAndForward = models.BooleanField(db_column='IsReplyAndForward', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'EmailSignatures'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyEmail(models.Model):
    Id = models.CharField(max_length=64, db_column='Id', primary_key=True)
    Header = models.TextField(db_column='Header', blank=True, null=True)
    From = models.TextField(db_column='From', blank=True, null=True)
    Body = models.TextField(db_column='Body', blank=True, null=True)
    To = models.TextField(db_column='To', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    isStatus = models.BooleanField(db_column='isStatus', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Emails'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyEvaluationCriteria(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Formula = models.TextField(db_column='Formula', blank=True, null=True)
    CriteriaCode = models.CharField(max_length=255, db_column='CriteriaCode', blank=True, null=True)
    IsPercent = models.BooleanField(db_column='IsPercent', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'EvaluationCriterias'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyField(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Fields'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFileCloud(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Url = models.TextField(db_column='Url', blank=True, null=True)
    MaxSizeDisk = models.BigIntegerField(db_column='MaxSizeDisk', blank=True, null=True)
    CurrentSizeOnDisk = models.BigIntegerField(db_column='CurrentSizeOnDisk', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'FileClouds'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFileData(models.Model):
    FileID = models.CharField(max_length=64, db_column='FileID', primary_key=True)

    class Meta:
        managed = False
        db_table = 'FileDatas'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFileShare(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FileID = models.CharField(max_length=64, db_column='FileID', blank=True, null=True)
    FolderID = models.CharField(max_length=64, db_column='FolderID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'FileShares'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    StorageNumber = models.TextField(db_column='StorageNumber', blank=True, null=True)
    InformationSympol = models.TextField(db_column='InformationSympol', blank=True, null=True)
    EventName = models.CharField(max_length=255, db_column='EventName', blank=True, null=True)
    FieldID = models.CharField(max_length=64, db_column='FieldID', blank=True, null=True)
    Author = models.TextField(db_column='Author', blank=True, null=True)
    Topics = models.TextField(db_column='Topics', blank=True, null=True)
    Location = models.TextField(db_column='Location', blank=True, null=True)
    Time = models.DateTimeField(db_column='Time', blank=True, null=True)
    Language = models.TextField(db_column='Language', blank=True, null=True)
    UsageMode = models.TextField(db_column='UsageMode', blank=True, null=True)
    Quality = models.TextField(db_column='Quality', blank=True, null=True)
    PhysicalStatus = models.CharField(max_length=255, db_column='PhysicalStatus', blank=True, null=True)
    Note = models.TextField(db_column='Note', blank=True, null=True)
    HashTag = models.TextField(db_column='HashTag', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    FolderID = models.CharField(max_length=64, db_column='FolderID', blank=True, null=True)
    OrganizationCode = models.CharField(max_length=255, db_column='OrganizationCode', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)
    RestoredDate = models.DateTimeField(db_column='RestoredDate', blank=True, null=True)
    RestoredBy = models.TextField(db_column='RestoredBy', blank=True, null=True)
    IsOther = models.BooleanField(db_column='IsOther', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    PinDated = models.DateTimeField(db_column='PinDated', blank=True, null=True)
    Color = models.TextField(db_column='Color', blank=True, null=True)
    TrashDated = models.DateTimeField(db_column='TrashDated', blank=True, null=True)
    TrashedBy = models.TextField(db_column='TrashedBy', blank=True, null=True)
    IsTrashed = models.BooleanField(db_column='IsTrashed', blank=True, null=True)
    Code = models.CharField(max_length=255, db_column='Code', blank=True, null=True)
    IsAcceptEditShare = models.BooleanField(db_column='IsAcceptEditShare', blank=True, null=True)
    RiskRecoveryStatus = models.CharField(max_length=255, db_column='RiskRecoveryStatus', blank=True, null=True)
    RiskRecovery = models.BooleanField(db_column='RiskRecovery', blank=True, null=True)
    RefID = models.CharField(max_length=64, db_column='RefID', blank=True, null=True)
    RefType = models.IntegerField(db_column='RefType', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Files'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFilesGlobal(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    UserId = models.CharField(max_length=255, db_column='UserId', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'FilesGlobal'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFolderRole(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    FolderID = models.CharField(max_length=64, db_column='FolderID', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'FolderRoles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFolder(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    ParentID = models.CharField(max_length=64, db_column='ParentID', blank=True, null=True)
    PinDated = models.DateTimeField(db_column='PinDated', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)
    PasswordHash = models.TextField(db_column='PasswordHash', blank=True, null=True)
    IsShare = models.BooleanField(db_column='IsShare', blank=True, null=True)
    ShareStatus = models.IntegerField(db_column='ShareStatus', blank=True, null=True)
    IsLimitTimeShare = models.BooleanField(db_column='IsLimitTimeShare', blank=True, null=True)
    TimeShareFrom = models.DateTimeField(db_column='TimeShareFrom', blank=True, null=True)
    TimeShareTo = models.DateTimeField(db_column='TimeShareTo', blank=True, null=True)
    TypeRoleShare = models.IntegerField(db_column='TypeRoleShare', blank=True, null=True)
    IsAcceptWebsiteUseData = models.BooleanField(db_column='IsAcceptWebsiteUseData', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    Level = models.IntegerField(db_column='Level', blank=True, null=True)
    IsTrashed = models.BooleanField(db_column='IsTrashed', blank=True, null=True)
    TrashDated = models.DateTimeField(db_column='TrashDated', blank=True, null=True)
    TrashedBy = models.TextField(db_column='TrashedBy', blank=True, null=True)
    RiskRecoveryStatus = models.CharField(max_length=255, db_column='RiskRecoveryStatus', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    RefType = models.IntegerField(db_column='RefType', blank=True, null=True)
    RefID = models.CharField(max_length=64, db_column='RefID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Folders'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyForm(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Code = models.CharField(max_length=255, db_column='Code', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Personnal = models.IntegerField(db_column='Personnal', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Form = models.TextField(db_column='Form', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreateBy = models.TextField(db_column='CreateBy', blank=True, null=True)
    CreateDate = models.DateTimeField(db_column='CreateDate', blank=True, null=True)
    IsPin = models.BooleanField(db_column='IsPin', blank=True, null=True)
    PinDate = models.DateTimeField(db_column='PinDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Form'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFormHandling(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Code = models.CharField(max_length=255, db_column='Code', blank=True, null=True)
    FormID = models.CharField(max_length=64, db_column='FormID', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    ConfirmBy = models.TextField(db_column='ConfirmBy', blank=True, null=True)
    ConfirmDate = models.DateTimeField(db_column='ConfirmDate', blank=True, null=True)
    Form = models.TextField(db_column='Form', blank=True, null=True)
    RoleName = models.CharField(max_length=255, db_column='RoleName', blank=True, null=True)
    Avatar = models.CharField(max_length=255, db_column='Avatar', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'FormHandling'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFormUser(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FormID = models.CharField(max_length=64, db_column='FormID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'FormUser'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyFunction(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDisabled = models.BooleanField(db_column='IsDisabled', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    UniqueKey = models.CharField(max_length=255, db_column='UniqueKey', blank=True, null=True)
    URL = models.CharField(max_length=255, db_column='URL', blank=True, null=True)
    ParentID = models.CharField(max_length=64, db_column='ParentID', blank=True, null=True)
    Icon = models.CharField(max_length=255, db_column='Icon', blank=True, null=True)
    SortOrder = models.IntegerField(db_column='SortOrder', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    IsCompany = models.IntegerField(db_column='IsCompany', blank=True, null=True)
    UniqueCode = models.CharField(max_length=255, db_column='UniqueCode', blank=True, null=True)
    Path = models.CharField(max_length=255, db_column='Path', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Functions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyHandSignature(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    SfaffID = models.CharField(max_length=64, db_column='SfaffID', blank=True, null=True)
    SignatureFile = models.CharField(max_length=255, db_column='SignatureFile', blank=True, null=True)
    SignatureFileName = models.CharField(max_length=255, db_column='SignatureFileName', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'HandSignature'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyHomePageSection(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    SectionKey = models.CharField(max_length=255, db_column='SectionKey', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    UpdatedBy = models.TextField(db_column='UpdatedBy', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)
    IsVisible = models.BooleanField(db_column='IsVisible', blank=True, null=True)
    OrderIndex = models.IntegerField(db_column='OrderIndex', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'HomePageSections'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyInternalDocument(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    DocumentId = models.CharField(max_length=255, db_column='DocumentId', blank=True, null=True)
    DocumentNumber = models.TextField(db_column='DocumentNumber', blank=True, null=True)
    Classification = models.TextField(db_column='Classification', blank=True, null=True)
    UrgencyLevel = models.TextField(db_column='UrgencyLevel', blank=True, null=True)
    RelatedDocuments = models.TextField(db_column='RelatedDocuments', blank=True, null=True)
    ReplacedDocuments = models.TextField(db_column='ReplacedDocuments', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Departments = models.TextField(db_column='Departments', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'InternalDocuments'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyInternalDocumentsFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    InternalDocumentsID = models.CharField(max_length=64, db_column='InternalDocumentsID', blank=True, null=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    TypeFile = models.IntegerField(db_column='TypeFile', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'InternalDocumentsFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyIntroductionPageSection(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    SectionKey = models.CharField(max_length=255, db_column='SectionKey', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    UpdatedBy = models.TextField(db_column='UpdatedBy', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)
    IsVisible = models.BooleanField(db_column='IsVisible', blank=True, null=True)
    OrderIndex = models.IntegerField(db_column='OrderIndex', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'IntroductionPageSections'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyJob(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Jobs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyLoglogout(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    USERID = models.CharField(max_length=64, db_column='USERID', blank=True, null=True)
    IP = models.TextField(db_column='IP', blank=True, null=True)
    DEVICEID = models.CharField(max_length=64, db_column='DEVICEID', blank=True, null=True)
    DEVICENAME = models.TextField(db_column='DEVICENAME', blank=True, null=True)
    OS = models.TextField(db_column='OS', blank=True, null=True)
    BUILDID = models.CharField(max_length=64, db_column='BUILDID', blank=True, null=True)
    SYSTEMVERSION = models.TextField(db_column='SYSTEMVERSION', blank=True, null=True)
    VERSION = models.TextField(db_column='VERSION', blank=True, null=True)
    CREATEDDATE = models.DateTimeField(db_column='CREATEDDATE', blank=True, null=True)
    CREATEDBY = models.TextField(db_column='CREATEDBY', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'LOGLOGOUTS'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyLanguage(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    VN = models.TextField(db_column='VN', blank=True, null=True)
    EN = models.TextField(db_column='EN', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Languages'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyLogAction(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    Type = models.TextField(db_column='Type', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    DeviceID = models.CharField(max_length=64, db_column='DeviceID', blank=True, null=True)
    DeviceName = models.CharField(max_length=255, db_column='DeviceName', blank=True, null=True)
    SystemOS = models.TextField(db_column='SystemOS', blank=True, null=True)
    BuildID = models.CharField(max_length=64, db_column='BuildID', blank=True, null=True)
    SystemVersion = models.TextField(db_column='SystemVersion', blank=True, null=True)
    AppVersion = models.TextField(db_column='AppVersion', blank=True, null=True)
    IP = models.TextField(db_column='IP', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Status = models.BooleanField(db_column='Status', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'LogActions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyLogLogin(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    IP = models.TextField(db_column='IP', blank=True, null=True)
    DeviceID = models.CharField(max_length=64, db_column='DeviceID', blank=True, null=True)
    DeviceName = models.CharField(max_length=255, db_column='DeviceName', blank=True, null=True)
    SystemOS = models.TextField(db_column='SystemOS', blank=True, null=True)
    BuildID = models.CharField(max_length=64, db_column='BuildID', blank=True, null=True)
    SystemVersion = models.TextField(db_column='SystemVersion', blank=True, null=True)
    AppVersion = models.TextField(db_column='AppVersion', blank=True, null=True)
    LoginDate = models.DateTimeField(db_column='LoginDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'LogLogins'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyLogSendEmail(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Subject = models.TextField(db_column='Subject', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    From = models.TextField(db_column='From', blank=True, null=True)
    Tos = models.TextField(db_column='Tos', blank=True, null=True)
    MetaData = models.TextField(db_column='MetaData', blank=True, null=True)
    TemplateSendEmailID = models.CharField(max_length=64, db_column='TemplateSendEmailID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'LogSendEmails'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMaintenanceAllowedUser(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MaintenanceAllowedUsers'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMaintenanceJob(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    MaintenanceID = models.CharField(max_length=64, db_column='MaintenanceID', blank=True, null=True)
    JobID = models.CharField(max_length=64, db_column='JobID', blank=True, null=True)
    Deadline = models.DateTimeField(db_column='Deadline', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MaintenanceJobs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMaintenanceLog(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    MaintenanceSessionID = models.CharField(max_length=64, db_column='MaintenanceSessionID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    Action = models.TextField(db_column='Action', blank=True, null=True)
    ActionTime = models.DateTimeField(db_column='ActionTime', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MaintenanceLogs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMaintenanceSession(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    StartTime = models.DateTimeField(db_column='StartTime', blank=True, null=True)
    EndTime = models.DateTimeField(db_column='EndTime', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    UpdatedBy = models.TextField(db_column='UpdatedBy', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)
    IsFinished = models.BooleanField(db_column='IsFinished', blank=True, null=True)
    MaintenanceType = models.IntegerField(db_column='MaintenanceType', blank=True, null=True)
    Results = models.TextField(db_column='Results', blank=True, null=True)
    CancelReason = models.TextField(db_column='CancelReason', blank=True, null=True)
    ExtendReason = models.TextField(db_column='ExtendReason', blank=True, null=True)
    IsCountDown = models.BooleanField(db_column='IsCountDown', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MaintenanceSessions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMenuManagement(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    RelationID = models.CharField(max_length=64, db_column='RelationID', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    Link = models.TextField(db_column='Link', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    UpdatedBy = models.TextField(db_column='UpdatedBy', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MenuManagements'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMonumentFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    Link = models.TextField(db_column='Link', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    Mode = models.IntegerField(db_column='Mode', blank=True, null=True)
    MonumentID = models.CharField(max_length=64, db_column='MonumentID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MonumentFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMonumentHistory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    ConfirmedBy = models.TextField(db_column='ConfirmedBy', blank=True, null=True)
    ConfirmedDate = models.DateTimeField(db_column='ConfirmedDate', blank=True, null=True)
    RequestedDate = models.DateTimeField(db_column='RequestedDate', blank=True, null=True)
    RequestedBy = models.TextField(db_column='RequestedBy', blank=True, null=True)
    MonumentID = models.CharField(max_length=64, db_column='MonumentID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Level = models.IntegerField(db_column='Level', blank=True, null=True)
    Reason = models.TextField(db_column='Reason', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MonumentHistories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMonumentSection(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    FileLink = models.CharField(max_length=255, db_column='FileLink', blank=True, null=True)
    FileExtension = models.CharField(max_length=255, db_column='FileExtension', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    FileSize = models.FloatField(db_column='FileSize', blank=True, null=True)
    MonumentID = models.CharField(max_length=64, db_column='MonumentID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    FileType = models.IntegerField(db_column='FileType', blank=True, null=True)
    Order = models.IntegerField(db_column='Order', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'MonumentSections'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyMonument(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    RecognitionDecision = models.TextField(db_column='RecognitionDecision', blank=True, null=True)
    Address = models.TextField(db_column='Address', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    MonumentDescriptionInformation = models.TextField(db_column='MonumentDescriptionInformation', blank=True, null=True)
    YearOfConstruction = models.TextField(db_column='YearOfConstruction', blank=True, null=True)
    Rating = models.TextField(db_column='Rating', blank=True, null=True)
    Location = models.TextField(db_column='Location', blank=True, null=True)
    TypeOfMonument = models.IntegerField(db_column='TypeOfMonument', blank=True, null=True)
    PriorityMode = models.IntegerField(db_column='PriorityMode', blank=True, null=True)
    Summary = models.TextField(db_column='Summary', blank=True, null=True)
    Architecture = models.TextField(db_column='Architecture', blank=True, null=True)
    IsPublic = models.BooleanField(db_column='IsPublic', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Monuments'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyNew(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    WebsitePageId = models.CharField(max_length=255, db_column='WebsitePageId', blank=True, null=True)
    PublicationTime = models.DateTimeField(db_column='PublicationTime', blank=True, null=True)
    Location = models.TextField(db_column='Location', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column='UpdatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    WebsiteName = models.CharField(max_length=255, db_column='WebsiteName', blank=True, null=True)
    Files = models.CharField(max_length=255, db_column='Files', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'News'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyNewsFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    NewsID = models.CharField(max_length=64, db_column='NewsID', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    IsShare = models.BooleanField(db_column='IsShare', blank=True, null=True)
    IsChange = models.BooleanField(db_column='IsChange', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'NewsFile'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyNotification(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    Type = models.TextField(db_column='Type', blank=True, null=True)
    RefID = models.CharField(max_length=64, db_column='RefID', blank=True, null=True)
    Time = models.DateTimeField(db_column='Time', blank=True, null=True)
    IsRead = models.BooleanField(db_column='IsRead', blank=True, null=True)
    From = models.TextField(db_column='From', blank=True, null=True)
    To = models.TextField(db_column='To', blank=True, null=True)
    UniqueKey = models.CharField(max_length=255, db_column='UniqueKey', blank=True, null=True)
    MetaData = models.TextField(db_column='MetaData', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Notifications'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyObject(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Image = models.TextField(db_column='Image', blank=True, null=True)
    Address = models.TextField(db_column='Address', blank=True, null=True)
    Introduce = models.TextField(db_column='Introduce', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    View = models.IntegerField(db_column='View', blank=True, null=True)
    IsHighlight = models.BooleanField(db_column='IsHighlight', blank=True, null=True)
    Status = models.BooleanField(db_column='Status', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Objects'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyOrganization(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Organizations'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyLogPushNotification(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    TOKEN = models.TextField(db_column='TOKEN', blank=True, null=True)
    STATUS = models.IntegerField(db_column='STATUS', blank=True, null=True)
    CONTENT = models.TextField(db_column='CONTENT', blank=True, null=True)
    CREATEDDATE = models.DateTimeField(db_column='CREATEDDATE', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'PUSHNOTIFICATIONS'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyPackage(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Price = models.DecimalField(max_digits=18, decimal_places=2, db_column='Price', blank=True, null=True)
    TimeType = models.IntegerField(db_column='TimeType', blank=True, null=True)
    Time = models.IntegerField(db_column='Time', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Packages'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyPermision(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    FunctionID = models.CharField(max_length=64, db_column='FunctionID', blank=True, null=True)
    ActionID = models.CharField(max_length=64, db_column='ActionID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Permisions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyPermission(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    FunctionID = models.CharField(max_length=64, db_column='FunctionID', blank=True, null=True)
    IsView = models.BooleanField(db_column='IsView', blank=True, null=True)
    IsAdd = models.BooleanField(db_column='IsAdd', blank=True, null=True)
    IsEdit = models.BooleanField(db_column='IsEdit', blank=True, null=True)
    IsDelete = models.BooleanField(db_column='IsDelete', blank=True, null=True)
    IsConfirm = models.BooleanField(db_column='IsConfirm', blank=True, null=True)
    IsVerify = models.BooleanField(db_column='IsVerify', blank=True, null=True)
    ActionID = models.CharField(max_length=64, db_column='ActionID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Permissions'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyProcessingDepartment(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DepartmentsID = models.CharField(max_length=64, db_column='DepartmentsID', blank=True, null=True)
    Classification = models.TextField(db_column='Classification', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ProcessingDepartment'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyProvince(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    IsDisabled = models.BooleanField(db_column='IsDisabled', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Provinces'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyPushNotification(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    EndPoint = models.TextField(db_column='EndPoint', blank=True, null=True)
    P256DH = models.TextField(db_column='P256DH', blank=True, null=True)
    Auth = models.TextField(db_column='Auth', blank=True, null=True)
    IP = models.TextField(db_column='IP', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Token = models.TextField(db_column='Token', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'PushNotifications'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRankingAwardTitle(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Ribbon = models.TextField(db_column='Ribbon', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    Condition = models.TextField(db_column='Condition', blank=True, null=True)
    Note = models.TextField(db_column='Note', blank=True, null=True)
    AvatarFrame = models.CharField(max_length=255, db_column='AvatarFrame', blank=True, null=True)
    RankType = models.IntegerField(db_column='RankType', blank=True, null=True)
    AwardTitleCode = models.CharField(max_length=255, db_column='AwardTitleCode', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RankingAwardTitles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRatingAwardTitleCriteria(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RatingAwardTitleID = models.CharField(max_length=64, db_column='RatingAwardTitleID', blank=True, null=True)
    CriteriaID = models.CharField(max_length=64, db_column='CriteriaID', blank=True, null=True)
    AwardTitleID = models.CharField(max_length=64, db_column='AwardTitleID', blank=True, null=True)
    Operator = models.TextField(db_column='Operator', blank=True, null=True)
    TargetValue = models.DecimalField(max_digits=18, decimal_places=2, db_column='TargetValue', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RatingAwardTitleCriterias'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRatingAwardTitle(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    AwardTitleID = models.CharField(max_length=64, db_column='AwardTitleID', blank=True, null=True)
    RatingID = models.CharField(max_length=64, db_column='RatingID', blank=True, null=True)
    TargetType = models.TextField(db_column='TargetType', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RatingAwardTitles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRatingJob(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RatingID = models.CharField(max_length=64, db_column='RatingID', blank=True, null=True)
    JobID = models.CharField(max_length=64, db_column='JobID', blank=True, null=True)
    Deadline = models.DateTimeField(db_column='Deadline', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RatingJobs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRatingParticipant(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RatingID = models.CharField(max_length=64, db_column='RatingID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    DeletedBy = models.TextField(db_column='DeletedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RatingParticipants'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRatingParticipantsExclude(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    RatingID = models.CharField(max_length=64, db_column='RatingID', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RatingParticipantsExclude'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRating(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Primary = models.BooleanField(db_column='Primary', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    ApplyYear = models.IntegerField(db_column='ApplyYear', blank=True, null=True)
    FromTime = models.DateTimeField(db_column='FromTime', blank=True, null=True)
    ToTime = models.DateTimeField(db_column='ToTime', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    DeletedDate = models.DateTimeField(db_column='DeletedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    IsClosed = models.BooleanField(db_column='IsClosed', blank=True, null=True)
    IsFrameVisible = models.BooleanField(db_column='IsFrameVisible', blank=True, null=True)
    Code = models.CharField(max_length=255, db_column='Code', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Ratings'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRestoreLog(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    Path = models.CharField(max_length=255, db_column='Path', blank=True, null=True)
    DatabaseName = models.TextField(db_column='DatabaseName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    Server = models.TextField(db_column='Server', blank=True, null=True)
    PathType = models.IntegerField(db_column='PathType', blank=True, null=True)
    Reasons = models.TextField(db_column='Reasons', blank=True, null=True)
    BackupID = models.CharField(max_length=64, db_column='BackupID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RestoreLogs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRole(models.Model):
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    NormalizedName = models.CharField(max_length=255, db_column='NormalizedName', blank=True, null=True)
    ConcurrencyStamp = models.TextField(db_column='ConcurrencyStamp', blank=True, null=True)
    Level = models.IntegerField(db_column='Level', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    IsAdmin = models.BooleanField(db_column='IsAdmin', blank=True, null=True)
    CanReceiveTask = models.BooleanField(db_column='CanReceiveTask', blank=True, null=True)
    CanAssignTask = models.BooleanField(db_column='CanAssignTask', blank=True, null=True)
    CanSeeDepartmentTasks = models.BooleanField(db_column='CanSeeDepartmentTasks', blank=True, null=True)
    IsViceDirector = models.BooleanField(db_column='IsViceDirector', blank=True, null=True)
    IsDirector = models.BooleanField(db_column='IsDirector', blank=True, null=True)
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    IsDisabled = models.BooleanField(db_column='IsDisabled', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Roles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyRolesDepartment(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'RolesDepartment'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySendCode(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Code = models.CharField(max_length=255, db_column='Code', blank=True, null=True)
    DataID = models.CharField(max_length=64, db_column='DataID', blank=True, null=True)
    TemplateID = models.CharField(max_length=64, db_column='TemplateID', blank=True, null=True)
    SendDate = models.DateTimeField(db_column='SendDate', blank=True, null=True)
    Type = models.TextField(db_column='Type', blank=True, null=True)
    ConfirmedDate = models.DateTimeField(db_column='ConfirmedDate', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SendCodes'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySettingDashboardItem(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Label = models.TextField(db_column='Label', blank=True, null=True)
    ComponentKey = models.CharField(max_length=255, db_column='ComponentKey', blank=True, null=True)
    SettingID = models.CharField(max_length=64, db_column='SettingID', blank=True, null=True)
    OrderIndex = models.IntegerField(db_column='OrderIndex', blank=True, null=True)
    ColSpan = models.TextField(db_column='ColSpan', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SettingDashboardItems'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySettingDashboard(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Label = models.TextField(db_column='Label', blank=True, null=True)
    GridCols = models.TextField(db_column='GridCols', blank=True, null=True)
    OrderIndex = models.IntegerField(db_column='OrderIndex', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SettingDashboards'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySettingSendEmail(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Email = models.CharField(max_length=255, db_column='Email', blank=True, null=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    AppPasswordGoogle = models.TextField(db_column='AppPasswordGoogle', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SettingSendEmails'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySetting(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    LockUpdateCalendarAfterDays = models.IntegerField(db_column='LockUpdateCalendarAfterDays', blank=True, null=True)
    DistanceFromTimeToTimeCalendarMinute = models.IntegerField(db_column='DistanceFromTimeToTimeCalendarMinute', blank=True, null=True)
    AllowInviteUserCalendarBeforeDays = models.IntegerField(db_column='AllowInviteUserCalendarBeforeDays', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Settings'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySettingsNotification(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)
    Type = models.TextField(db_column='Type', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    UpdatedAt = models.DateTimeField(db_column='UpdatedAt', blank=True, null=True)
    IsActive = models.BooleanField(db_column='IsActive', blank=True, null=True)
    ContentType = models.TextField(db_column='ContentType', blank=True, null=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    TimeType = models.TextField(db_column='TimeType', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SettingsNotification'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyShareLink(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Password = models.TextField(db_column='Password', blank=True, null=True)
    Token = models.TextField(db_column='Token', blank=True, null=True)
    RefID = models.CharField(max_length=64, db_column='RefID', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ShareLinks'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyStaffFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    StaffID = models.CharField(max_length=64, db_column='StaffID', blank=True, null=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    IsDeleted = models.TextField(db_column='IsDeleted', blank=True, null=True)
    TypeFile = models.IntegerField(db_column='TypeFile', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'StaffFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyStaff(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    FirstName = models.CharField(max_length=255, db_column='FirstName', blank=True, null=True)
    LastName = models.CharField(max_length=255, db_column='LastName', blank=True, null=True)
    PhoneNumber = models.CharField(max_length=255, db_column='PhoneNumber', blank=True, null=True)
    Email = models.CharField(max_length=255, db_column='Email', blank=True, null=True)
    Avatar = models.CharField(max_length=255, db_column='Avatar', blank=True, null=True)
    ProvinceID = models.CharField(max_length=64, db_column='ProvinceID', blank=True, null=True)
    DistrictID = models.CharField(max_length=64, db_column='DistrictID', blank=True, null=True)
    WardID = models.CharField(max_length=64, db_column='WardID', blank=True, null=True)
    Address = models.TextField(db_column='Address', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    Sign = models.TextField(db_column='Sign', blank=True, null=True)
    Stamp = models.TextField(db_column='Stamp', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    SignEncrypted = models.TextField(db_column='SignEncrypted', blank=True, null=True)
    StampEncrypted = models.TextField(db_column='StampEncrypted', blank=True, null=True)
    EmailPersonal = models.CharField(max_length=255, db_column='EmailPersonal', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Staffs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyStory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    TotalChapter = models.IntegerField(db_column='TotalChapter', blank=True, null=True)
    Introduce = models.TextField(db_column='Introduce', blank=True, null=True)
    Thumbnail = models.TextField(db_column='Thumbnail', blank=True, null=True)
    IsHot = models.BooleanField(db_column='IsHot', blank=True, null=True)
    TotalView = models.IntegerField(db_column='TotalView', blank=True, null=True)
    CategoryID = models.CharField(max_length=64, db_column='CategoryID', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Stories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyStoryContent(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Title = models.TextField(db_column='Title', blank=True, null=True)
    NumberChapter = models.IntegerField(db_column='NumberChapter', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    StoryID = models.CharField(max_length=64, db_column='StoryID', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'StoryContents'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacySystemConfig(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    IsDirectorCreatedSubTask = models.BooleanField(db_column='IsDirectorCreatedSubTask', blank=True, null=True)
    PercentReturnTask = models.FloatField(db_column='PercentReturnTask', blank=True, null=True)
    IsPercentReturnTask = models.BooleanField(db_column='IsPercentReturnTask', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'SystemConfig'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskChatFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    MessageID = models.CharField(max_length=64, db_column='MessageID', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskChatFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskChat(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    FromUserID = models.CharField(max_length=64, db_column='FromUserID', blank=True, null=True)
    ToUserID = models.CharField(max_length=64, db_column='ToUserID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    ReplyToID = models.CharField(max_length=64, db_column='ReplyToID', blank=True, null=True)
    SeenBy = models.TextField(db_column='SeenBy', blank=True, null=True)
    ChatFiles = models.CharField(max_length=255, db_column='ChatFiles', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskChats'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskConfirm(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    TaskResultID = models.CharField(max_length=64, db_column='TaskResultID', blank=True, null=True)
    ConfirmContent = models.TextField(db_column='ConfirmContent', blank=True, null=True)
    ConfirmDate = models.DateTimeField(db_column='ConfirmDate', blank=True, null=True)
    ConfirmBy = models.TextField(db_column='ConfirmBy', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskConfirm'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskDepartment(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskDepartments'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskDocumentConfirm(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    TaskDocumentID = models.CharField(max_length=64, db_column='TaskDocumentID', blank=True, null=True)
    ConfirmContent = models.TextField(db_column='ConfirmContent', blank=True, null=True)
    ConfirmDate = models.DateTimeField(db_column='ConfirmDate', blank=True, null=True)
    ConfirmBy = models.TextField(db_column='ConfirmBy', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskDocumentConfirm'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskDocument(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    IsNeedSign = models.BooleanField(db_column='IsNeedSign', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    DocumentID = models.CharField(max_length=64, db_column='DocumentID', blank=True, null=True)
    DocumentNumber = models.TextField(db_column='DocumentNumber', blank=True, null=True)
    DocumentTypeID = models.CharField(max_length=64, db_column='DocumentTypeID', blank=True, null=True)
    classification = models.TextField(db_column='classification', blank=True, null=True)
    UrgencyLevel = models.TextField(db_column='UrgencyLevel', blank=True, null=True)
    DocumentAssociated = models.TextField(db_column='DocumentAssociated', blank=True, null=True)
    DocumentSuperseded = models.TextField(db_column='DocumentSuperseded', blank=True, null=True)
    FromTime = models.DateTimeField(db_column='FromTime', blank=True, null=True)
    ToTime = models.DateTimeField(db_column='ToTime', blank=True, null=True)
    IsTimeLimit = models.BooleanField(db_column='IsTimeLimit', blank=True, null=True)
    Pin = models.BooleanField(db_column='Pin', blank=True, null=True)
    TaskDocumentConfirmStatus = models.IntegerField(db_column='TaskDocumentConfirmStatus', blank=True, null=True)
    RelatedID = models.CharField(max_length=64, db_column='RelatedID', blank=True, null=True)
    SupersededID = models.CharField(max_length=64, db_column='SupersededID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskDocuments'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskExtend(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    TimeExtend = models.DateTimeField(db_column='TimeExtend', blank=True, null=True)
    TimeExtendConfirm = models.DateTimeField(db_column='TimeExtendConfirm', blank=True, null=True)
    UserExtend = models.TextField(db_column='UserExtend', blank=True, null=True)
    UserConfirm = models.TextField(db_column='UserConfirm', blank=True, null=True)
    IsResult = models.BooleanField(db_column='IsResult', blank=True, null=True)
    ContentConfirm = models.TextField(db_column='ContentConfirm', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskExtend'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskFile(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    Extension = models.TextField(db_column='Extension', blank=True, null=True)
    Size = models.FloatField(db_column='Size', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    IsResult = models.BooleanField(db_column='IsResult', blank=True, null=True)
    TaskResultID = models.CharField(max_length=64, db_column='TaskResultID', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    IsShare = models.BooleanField(db_column='IsShare', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskFiles'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskHistory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    FullName = models.CharField(max_length=255, db_column='FullName', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskName = models.CharField(max_length=255, db_column='TaskName', blank=True, null=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    RoleName = models.CharField(max_length=255, db_column='RoleName', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    TaskWorkName = models.CharField(max_length=255, db_column='TaskWorkName', blank=True, null=True)
    StatusDetail = models.IntegerField(db_column='StatusDetail', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)
    SeenBy = models.TextField(db_column='SeenBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskHistories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskJob(models.Model):
    ID = models.IntegerField(db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    JobId = models.CharField(max_length=255, db_column='JobId', blank=True, null=True)
    Deadline = models.DateTimeField(db_column='Deadline', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Type = models.IntegerField(db_column='Type', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskJobs'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskLevel(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    Level = models.IntegerField(db_column='Level', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    CreatorLevel = models.IntegerField(db_column='CreatorLevel', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskLevel'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskResult(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    CreateDate = models.DateTimeField(db_column='CreateDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ConfirmContent = models.TextField(db_column='ConfirmContent', blank=True, null=True)
    ConfirmDate = models.DateTimeField(db_column='ConfirmDate', blank=True, null=True)
    ConfirmBy = models.TextField(db_column='ConfirmBy', blank=True, null=True)
    IsLate = models.BooleanField(db_column='IsLate', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    TaskUserID = models.CharField(max_length=64, db_column='TaskUserID', blank=True, null=True)
    avatar = models.TextField(db_column='avatar', blank=True, null=True)
    File = models.CharField(max_length=255, db_column='File', blank=True, null=True)
    FileName = models.CharField(max_length=255, db_column='FileName', blank=True, null=True)
    DepartmentName = models.CharField(max_length=255, db_column='DepartmentName', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskResult'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskUserCheck(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CheckedDate = models.DateTimeField(db_column='CheckedDate', blank=True, null=True)
    IsForDepartment = models.BooleanField(db_column='IsForDepartment', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskUserChecks'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskUser(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    TaskWorkID = models.CharField(max_length=64, db_column='TaskWorkID', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    Type = models.BooleanField(db_column='Type', blank=True, null=True)
    IsHeadDepartmentReceived = models.BooleanField(db_column='IsHeadDepartmentReceived', blank=True, null=True)
    IsViceDirectReceived = models.BooleanField(db_column='IsViceDirectReceived', blank=True, null=True)
    FromDepartment = models.BooleanField(db_column='FromDepartment', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskUsers'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTaskWork(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    TaskID = models.CharField(max_length=64, db_column='TaskID', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    TaskCode = models.CharField(max_length=255, db_column='TaskCode', blank=True, null=True)
    FromTime = models.DateTimeField(db_column='FromTime', blank=True, null=True)
    ToTime = models.DateTimeField(db_column='ToTime', blank=True, null=True)
    FromDepartment = models.BooleanField(db_column='FromDepartment', blank=True, null=True)
    IsCreateForMe = models.BooleanField(db_column='IsCreateForMe', blank=True, null=True)
    IsLate = models.BooleanField(db_column='IsLate', blank=True, null=True)
    CurrentLevelConfirm = models.IntegerField(db_column='CurrentLevelConfirm', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TaskWorks'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTask(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    FromTime = models.DateTimeField(db_column='FromTime', blank=True, null=True)
    ToTime = models.DateTimeField(db_column='ToTime', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ParentID = models.CharField(max_length=64, db_column='ParentID', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    TaskCode = models.CharField(max_length=255, db_column='TaskCode', blank=True, null=True)
    IsLate = models.BooleanField(db_column='IsLate', blank=True, null=True)
    IsCanCreatedDocInTask = models.BooleanField(db_column='IsCanCreatedDocInTask', blank=True, null=True)
    IsDirectorCreate = models.BooleanField(db_column='IsDirectorCreate', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Tasks'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTemplateSendEmail(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Subject = models.TextField(db_column='Subject', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'TemplateSendEmailS'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyTemplate(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Type = models.TextField(db_column='Type', blank=True, null=True)
    Content = models.TextField(db_column='Content', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Templates'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyUrgencyLevel(models.Model):
    ID = models.CharField(max_length=36, db_column='ID', primary_key=True)
    UrgencyName = models.CharField(max_length=255, db_column='UrgencyName', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'UrgencyLevel'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyUserActionStory(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    IsLike = models.BooleanField(db_column='IsLike', blank=True, null=True)
    IsFollow = models.BooleanField(db_column='IsFollow', blank=True, null=True)
    Rating = models.DecimalField(max_digits=18, decimal_places=2, db_column='Rating', blank=True, null=True)
    StoryID = models.CharField(max_length=64, db_column='StoryID', blank=True, null=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'UserActionStories'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyUserConcurrently(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    UserID = models.CharField(max_length=64, db_column='UserID', blank=True, null=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    OrganizationID = models.CharField(max_length=64, db_column='OrganizationID', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'UserConcurrentlies'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyUser(models.Model):
    CustomerID = models.CharField(max_length=64, db_column='CustomerID', blank=True, null=True)
    RoleID = models.CharField(max_length=64, db_column='RoleID', blank=True, null=True)
    NationID = models.CharField(max_length=64, db_column='NationID', blank=True, null=True)
    FullName = models.CharField(max_length=255, db_column='FullName', blank=True, null=True)
    UserName = models.CharField(max_length=255, db_column='UserName', blank=True, null=True)
    Email = models.CharField(max_length=255, db_column='Email', blank=True, null=True)
    PasswordHash = models.TextField(db_column='PasswordHash', blank=True, null=True)
    IsCustomer = models.BooleanField(db_column='IsCustomer', blank=True, null=True)
    LastLogin = models.DateTimeField(db_column='LastLogin', blank=True, null=True)
    Status = models.IntegerField(db_column='Status', blank=True, null=True)
    VerifyiedCode = models.CharField(max_length=255, db_column='VerifyiedCode', blank=True, null=True)
    VerifyiedDate = models.DateTimeField(db_column='VerifyiedDate', blank=True, null=True)
    ReasonLock = models.TextField(db_column='ReasonLock', blank=True, null=True)
    ReasonLockEN = models.TextField(db_column='ReasonLockEN', blank=True, null=True)
    BannedFrom = models.DateTimeField(db_column='BannedFrom', blank=True, null=True)
    BannedTo = models.DateTimeField(db_column='BannedTo', blank=True, null=True)
    LockedDate = models.DateTimeField(db_column='LockedDate', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    CreatedBy = models.TextField(db_column='CreatedBy', blank=True, null=True)
    ModifiedDate = models.DateTimeField(db_column='ModifiedDate', blank=True, null=True)
    ModifiedBy = models.TextField(db_column='ModifiedBy', blank=True, null=True)
    LockedBy = models.TextField(db_column='LockedBy', blank=True, null=True)
    IsOnline = models.BooleanField(db_column='IsOnline', blank=True, null=True)
    StripeCustomerID = models.CharField(max_length=64, db_column='StripeCustomerID', blank=True, null=True)
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TwoFactorEnabled = models.BooleanField(db_column='TwoFactorEnabled', blank=True, null=True)
    AccessFailedCount = models.IntegerField(db_column='AccessFailedCount', blank=True, null=True)
    PhoneNumberConfirmed = models.BooleanField(db_column='PhoneNumberConfirmed', blank=True, null=True)
    ConcurrencyStamp = models.TextField(db_column='ConcurrencyStamp', blank=True, null=True)
    EmailConfirmed = models.BooleanField(db_column='EmailConfirmed', blank=True, null=True)
    LockoutEnabled = models.BooleanField(db_column='LockoutEnabled', blank=True, null=True)
    DateTimeOffset = models.DateTimeField(db_column='DateTimeOffset', blank=True, null=True)
    LockoutEnd = models.DateTimeField(db_column='LockoutEnd', blank=True, null=True)
    NormalizedEmail = models.CharField(max_length=255, db_column='NormalizedEmail', blank=True, null=True)
    SecurityStamp = models.TextField(db_column='SecurityStamp', blank=True, null=True)
    PhoneNumber = models.CharField(max_length=255, db_column='PhoneNumber', blank=True, null=True)
    NormalizedUserName = models.CharField(max_length=255, db_column='NormalizedUserName', blank=True, null=True)
    BlockFromDate = models.DateTimeField(db_column='BlockFromDate', blank=True, null=True)
    BlockToDate = models.DateTimeField(db_column='BlockToDate', blank=True, null=True)
    DepartmentID = models.CharField(max_length=64, db_column='DepartmentID', blank=True, null=True)
    DepartmentName = models.CharField(max_length=255, db_column='DepartmentName', blank=True, null=True)
    RoleName = models.CharField(max_length=255, db_column='RoleName', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Users'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyWard(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    DistrictID = models.CharField(max_length=64, db_column='DistrictID', blank=True, null=True)
    IsDisabled = models.BooleanField(db_column='IsDisabled', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Wards'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


class LegacyWebSitePage(models.Model):
    ID = models.CharField(max_length=64, db_column='ID', primary_key=True)
    TitlePage = models.TextField(db_column='TitlePage', blank=True, null=True)
    IsDeleted = models.BooleanField(db_column='IsDeleted', blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column='CreatedDate', blank=True, null=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'WebSitePages'

    def __str__(self):  # pragma: nocover
        return str(getattr(self, 'Name', None) or getattr(self, 'ID', None) or getattr(self, 'Id', None) or super().__str__())


__all__ = [
    'ManagedRole',
    'ManagedDepartment',
    'ManagedStaffProfile',
    'ManagedStaffPosition',
    'ManagedMenuItem',
    'ManagedPermission',
    'ManagedChat',
    'ManagedChatUser',
    'ManagedChatMessage',
    'ManagedChatFile',
    'ManagedChatLink',
    'ManagedChatSeen',
    'ManagedChatPin',
    'ManagedChatAwaitConfirm',
    'LegacyActionInFunction',
    'LegacyAction',
    'LegacyAlert',
    'LegacyArtifact',
    'LegacyAssetFile',
    'LegacyAsset',
    'LegacyBackupLog',
    'LegacyBanner',
    'LegacyBorrowAssetHistory',
    'LegacyBorrowAsset',
    'LegacyBorrow',
    'LegacyBusinessHour',
    'LegacyCalendarFile',
    'LegacyCalendarJob',
    'LegacyCalendarJoin',
    'LegacyCalendar',
    'LegacyCategory',
    'LegacyCategoryNew',
    'LegacyCategoryPlanTrip',
    'LegacyChatAwaitConfirm',
    'LegacyConfigPageSection',
    'LegacyConfig',
    'LegacyContactManagement',
    'LegacyDispatchList',
    'LegacyDistrict',
    'LegacyDocumentHistory',
    'LegacyEmailFile',
    'LegacyEmailSignature',
    'LegacyEmail',
    'LegacyEvaluationCriteria',
    'LegacyField',
    'LegacyFileCloud',
    'LegacyFileData',
    'LegacyFileShare',
    'LegacyFile',
    'LegacyFilesGlobal',
    'LegacyFolderRole',
    'LegacyFolder',
    'LegacyForm',
    'LegacyFormHandling',
    'LegacyFormUser',
    'LegacyFunction',
    'LegacyHandSignature',
    'LegacyHomePageSection',
    'LegacyInternalDocument',
    'LegacyInternalDocumentsFile',
    'LegacyIntroductionPageSection',
    'LegacyJob',
    'LegacyLoglogout',
    'LegacyLanguage',
    'LegacyLogAction',
    'LegacyLogLogin',
    'LegacyLogSendEmail',
    'LegacyMaintenanceAllowedUser',
    'LegacyMaintenanceJob',
    'LegacyMaintenanceLog',
    'LegacyMaintenanceSession',
    'LegacyMenuManagement',
    'LegacyMonumentFile',
    'LegacyMonumentHistory',
    'LegacyMonumentSection',
    'LegacyMonument',
    'LegacyNew',
    'LegacyNewsFile',
    'LegacyNotification',
    'LegacyObject',
    'LegacyOrganization',
    'LegacyLogPushNotification',
    'LegacyPackage',
    'LegacyPermision',
    'LegacyPermission',
    'LegacyProcessingDepartment',
    'LegacyProvince',
    'LegacyPushNotification',
    'LegacyRankingAwardTitle',
    'LegacyRatingAwardTitleCriteria',
    'LegacyRatingAwardTitle',
    'LegacyRatingJob',
    'LegacyRatingParticipant',
    'LegacyRatingParticipantsExclude',
    'LegacyRating',
    'LegacyRestoreLog',
    'LegacyRole',
    'LegacyRolesDepartment',
    'LegacySendCode',
    'LegacySettingDashboardItem',
    'LegacySettingDashboard',
    'LegacySettingSendEmail',
    'LegacySetting',
    'LegacySettingsNotification',
    'LegacyShareLink',
    'LegacyStaffFile',
    'LegacyStaff',
    'LegacyStory',
    'LegacyStoryContent',
    'LegacySystemConfig',
    'LegacyTaskChatFile',
    'LegacyTaskChat',
    'LegacyTaskConfirm',
    'LegacyTaskDepartment',
    'LegacyTaskDocumentConfirm',
    'LegacyTaskDocument',
    'LegacyTaskExtend',
    'LegacyTaskFile',
    'LegacyTaskHistory',
    'LegacyTaskJob',
    'LegacyTaskLevel',
    'LegacyTaskResult',
    'LegacyTaskUserCheck',
    'LegacyTaskUser',
    'LegacyTaskWork',
    'LegacyTask',
    'LegacyTemplateSendEmail',
    'LegacyTemplate',
    'LegacyUrgencyLevel',
    'LegacyUserActionStory',
    'LegacyUserConcurrently',
    'LegacyUser',
    'LegacyWard',
    'LegacyWebSitePage',
]
