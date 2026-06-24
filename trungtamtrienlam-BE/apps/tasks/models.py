from django.db import models
from core.models import BaseModel


class Task(BaseModel):
    class Status(models.IntegerChoices):
        DRAFT = 0, 'Nháp'
        IN_PROGRESS = 1, 'Đang thực hiện'
        PENDING_APPROVAL = 2, 'Chờ duyệt'
        COMPLETED = 3, 'Hoàn thành'
        CANCELLED = 4, 'Đã hủy'
        OVERDUE = 5, 'Quá hạn'

    class Priority(models.IntegerChoices):
        LOW = 0, 'Thấp'
        NORMAL = 1, 'Bình thường'
        HIGH = 2, 'Cao'
        URGENT = 3, 'Khẩn cấp'

    class TaskType(models.IntegerChoices):
        INTERNAL = 0, 'Nội bộ'
        DIGITAL = 1, 'Số hóa'
        OFFICIAL = 2, 'Văn bản'

    title = models.CharField(max_length=500)
    content = models.TextField(blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.DRAFT, db_index=True)
    priority = models.IntegerField(choices=Priority.choices, default=Priority.NORMAL)
    task_type = models.IntegerField(choices=TaskType.choices, default=TaskType.INTERNAL)
    assigned_by = models.UUIDField(db_index=True)
    department_id = models.UUIDField(blank=True, null=True, db_index=True)
    due_date = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'tasks'
        verbose_name = 'Công việc'
        verbose_name_plural = 'Công việc'


class TaskUser(BaseModel):
    class Role(models.IntegerChoices):
        ASSIGNEE = 0, 'Người thực hiện'
        REVIEWER = 1, 'Người duyệt'
        FOLLOWER = 2, 'Người theo dõi'

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='task_users')
    user_id = models.UUIDField(db_index=True)
    role = models.IntegerField(choices=Role.choices, default=Role.ASSIGNEE)

    class Meta:
        db_table = 'task_users'


class TaskDocument(BaseModel):
    class Status(models.IntegerChoices):
        DRAFT = 0, 'Nháp'
        PENDING = 1, 'Chờ duyệt'
        APPROVED = 2, 'Đã duyệt'
        REJECTED = 3, 'Từ chối'

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='task_documents')
    title = models.CharField(max_length=500)
    content = models.TextField(blank=True, null=True)
    status = models.IntegerField(choices=Status.choices, default=Status.DRAFT)

    class Meta:
        db_table = 'task_documents'


class TaskChat(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='task_chats')
    user_id = models.UUIDField(db_index=True)
    content = models.TextField()

    class Meta:
        db_table = 'task_chats'
        ordering = ['created_at']


class TaskHistory(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='histories')
    action = models.CharField(max_length=255)
    note = models.TextField(blank=True, null=True)
    performed_by = models.UUIDField()

    class Meta:
        db_table = 'task_histories'
        ordering = ['-created_at']
