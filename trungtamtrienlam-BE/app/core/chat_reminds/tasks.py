"""Celery tasks for chat reminders."""

from celery import shared_task

from core.chat_reminds.services import run_remind


@shared_task(name='apps.chat_reminds.tasks.run_chat_remind_job')
def run_chat_remind_job(chat_remind_id, remind_time=None, chat_id=None):
    return run_remind(chat_remind_id, remind_time=remind_time, chat_id=chat_id)

