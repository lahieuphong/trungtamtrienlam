from django.db import migrations
from django.db import models


def _private_key(member_ids):
    member_ids = sorted({str(user_id).strip() for user_id in member_ids if user_id})
    if len(member_ids) != 2:
        return None
    return f'direct:{member_ids[0]}:{member_ids[1]}'


def _activity_key(chat, ChatMessage):
    latest_message = (
        ChatMessage.objects
        .filter(chat_id=chat.id, is_deleted=False)
        .order_by('-created_date')
        .first()
    )
    activity_date = (
        getattr(latest_message, 'created_date', None)
        or chat.updated_date
        or chat.created_date
    )
    return str(activity_date or '')


def merge_duplicate_private_chats(apps, schema_editor):
    ManagedChat = apps.get_model('chats', 'ManagedChat')
    ManagedChatUser = apps.get_model('chats', 'ManagedChatUser')
    ManagedChatMessage = apps.get_model('chats', 'ManagedChatMessage')
    ManagedChatFile = apps.get_model('chats', 'ManagedChatFile')
    ManagedChatLink = apps.get_model('chats', 'ManagedChatLink')
    ManagedChatSeen = apps.get_model('chats', 'ManagedChatSeen')
    ManagedChatPin = apps.get_model('chats', 'ManagedChatPin')
    ManagedChatAwaitConfirm = apps.get_model('chats', 'ManagedChatAwaitConfirm')
    ManagedChatNote = apps.get_model('chat_notes', 'ManagedChatNote')
    ManagedChatVote = apps.get_model('chat_votes', 'ManagedChatVote')
    ManagedChatVoteOption = apps.get_model('chat_votes', 'ManagedChatVoteOption')
    ManagedChatVoteResult = apps.get_model('chat_votes', 'ManagedChatVoteResult')
    ManagedChatRemind = apps.get_model('chat_reminds', 'ManagedChatRemind')
    ManagedChatRemindUser = apps.get_model('chat_reminds', 'ManagedChatRemindUser')
    Notification = apps.get_model('notifications', 'Notification')

    chats_by_key = {}
    active_private_chats = ManagedChat.objects.filter(type=1, is_deleted=False)
    for chat in active_private_chats.iterator():
        member_ids = list(
            ManagedChatUser.objects
            .filter(chat_id=chat.id)
            .values_list('user_id', flat=True)
        )
        key = _private_key(member_ids)
        if key:
            chats_by_key.setdefault(key, []).append(chat)

    for key, chats in chats_by_key.items():
        canonical = max(
            chats,
            key=lambda chat: _activity_key(chat, ManagedChatMessage),
        )

        for duplicate in chats:
            if duplicate.id == canonical.id:
                continue

            for member in list(
                ManagedChatUser.objects.filter(chat_id=duplicate.id)
            ):
                existing = ManagedChatUser.objects.filter(
                    chat_id=canonical.id,
                    user_id=member.user_id,
                ).first()
                if existing:
                    if member.role and (not existing.role or member.role < existing.role):
                        existing.role = member.role
                        existing.save(update_fields=['role'])
                    member.delete()
                else:
                    member.chat_id = canonical.id
                    member.save(update_fields=['chat_id'])

            for seen in list(
                ManagedChatSeen.objects.filter(chat_id=duplicate.id)
            ):
                existing = ManagedChatSeen.objects.filter(
                    chat_id=canonical.id,
                    user_id=seen.user_id,
                ).first()
                if existing:
                    if (
                        seen.seen_date
                        and (
                            not existing.seen_date
                            or seen.seen_date > existing.seen_date
                        )
                    ):
                        ManagedChatSeen.objects.filter(id=existing.id).update(
                            chat_message_id=seen.chat_message_id,
                            seen_date=seen.seen_date,
                        )
                    seen.delete()
                else:
                    ManagedChatSeen.objects.filter(id=seen.id).update(
                        chat_id=canonical.id,
                    )

            for pin in list(
                ManagedChatPin.objects.filter(chat_id=duplicate.id)
            ):
                existing = ManagedChatPin.objects.filter(
                    chat_id=canonical.id,
                    user_id=pin.user_id,
                ).first()
                if existing:
                    if (
                        pin.pin_date
                        and (
                            not existing.pin_date
                            or pin.pin_date > existing.pin_date
                        )
                    ):
                        ManagedChatPin.objects.filter(id=existing.id).update(
                            pin_date=pin.pin_date,
                        )
                    pin.delete()
                else:
                    ManagedChatPin.objects.filter(id=pin.id).update(
                        chat_id=canonical.id,
                    )

            ManagedChatMessage.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatFile.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatLink.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatAwaitConfirm.objects.filter(
                chat_id=duplicate.id,
            ).update(chat_id=canonical.id)
            ManagedChatNote.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatVote.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatVoteOption.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatVoteResult.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatRemind.objects.filter(chat_id=duplicate.id).update(
                chat_id=canonical.id,
            )
            ManagedChatRemindUser.objects.filter(
                chat_id=duplicate.id,
            ).update(chat_id=canonical.id)
            Notification.objects.filter(reference_id=duplicate.id).update(
                reference_id=canonical.id,
            )

            ManagedChat.objects.filter(id=duplicate.id).update(
                private_key=None,
                is_deleted=True,
            )

        latest_updated_date = max(
            (chat.updated_date for chat in chats if chat.updated_date),
            default=canonical.updated_date,
        )
        ManagedChat.objects.filter(id=canonical.id).update(
            private_key=key,
            updated_date=latest_updated_date,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('chats', '0004_managed_chat_labels'),
        ('chat_notes', '0002_admin_labels'),
        ('chat_votes', '0002_admin_labels'),
        ('chat_reminds', '0002_admin_labels'),
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='managedchat',
            name='private_key',
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(
            merge_duplicate_private_chats,
            migrations.RunPython.noop,
        ),
    ]
