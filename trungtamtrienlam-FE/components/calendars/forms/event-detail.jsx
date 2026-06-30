'use client'

import { useEffect, useState } from 'react'
import { CalendarX, LockKeyhole, PencilLine, RotateCcw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/contexts/ToastContext'
import { CalendarConstants } from '@/constants/calendarConstants'
import { cancelEvent, cancelEventV2, cancelUndoEvent, cancelUndoEventV2, deleteEvent, deleteEventV2, lockEvent, lockEventV2 } from '@/lib/api/calendarApi'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import CalendarForm from './calendar-form'
import { formatDateLabel, formatTimeInput, getEventTypeLabel } from '@/hooks/useCalendar'

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim()
}

function looksLikeId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function getCreator(event) {
  const raw = event.raw || {}
  const name = raw.createdByName || raw.created_by_name || raw.createdByFullName || raw.created_by_full_name || raw.creatorName || raw.creator_name || raw.createdBy || raw.created_by || ''
  const role = raw.createdByRole || raw.created_by_role || raw.creatorRole || raw.creator_role || raw.roleName || raw.role_name || ''
  const avatar = raw.createdByAvatar || raw.created_by_avatar || raw.creatorAvatar || raw.creator_avatar || ''

  return {
    name: name && !looksLikeId(name) ? name : 'Chưa có dữ liệu',
    role,
    avatar,
  }
}

function CreatorAvatar({ creator }) {
  if (creator.avatar) {
    return <img src={creator.avatar} alt={creator.name} className="h-10 w-10 rounded-full object-cover" />
  }

  const initial = creator.name && creator.name !== 'Chưa có dữ liệu' ? creator.name.trim().charAt(0).toUpperCase() : '?'
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
      {initial}
    </div>
  )
}

function DetailSection({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-bold text-slate-600">{label}</div>
      <div className="text-sm leading-6 text-slate-700">{children}</div>
    </div>
  )
}

export default function EventDetail({ isOpen, onClose, event, view = 'month', version = CalendarConstants.calendarVersion.v2 }) {
  const toast = useToast()
  const { triggerReload } = useCalendarReload()
  const [isEditing, setIsEditing] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')

  useEffect(() => {
    setIsEditing(false)
    setLoadingAction('')
  }, [isOpen, event?.id])

  const handleCloseDetail = () => {
    setIsEditing(false)
    setLoadingAction('')
    onClose?.()
  }

  if (!event) return null

  const creator = getCreator(event)
  const description = stripHtml(event.description) || 'Không có mô tả'

  const refreshAndClose = () => {
    triggerReload(view)
    handleCloseDetail()
  }

  const runAction = async (name, action, successMessage) => {
    try {
      setLoadingAction(name)
      await action()
      toast.success(successMessage)
      refreshAndClose()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không xử lý được lịch')
    } finally {
      setLoadingAction('')
    }
  }

  const handleCancel = () => {
    const cancelReason = window.prompt('Nhập lý do hủy lịch')
    if (cancelReason === null) return
    runAction('cancel', () => version === CalendarConstants.calendarVersion.v1 ? cancelEvent({ id: event.id, cancelReason }) : cancelEventV2({ id: event.id, cancelReason }), 'Đã hủy lịch')
  }

  const handleUndoCancel = () => runAction('undo', () => version === CalendarConstants.calendarVersion.v1 ? cancelUndoEvent({ id: event.id }) : cancelUndoEventV2({ id: event.id }), 'Đã khôi phục lịch')
  const handleLock = () => runAction('lock', () => version === CalendarConstants.calendarVersion.v1 ? lockEvent({ id: event.id }) : lockEventV2({ id: event.id }), 'Đã khóa lịch')
  const handleDelete = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch này?')) return
    runAction('delete', () => version === CalendarConstants.calendarVersion.v1 ? deleteEvent({ id: event.id }) : deleteEventV2({ id: event.id }), 'Đã xóa lịch')
  }

  return (
    <>
      <Dialog open={isOpen && !isEditing} onOpenChange={(open) => { if (!open) handleCloseDetail() }}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden rounded-lg border-0 bg-white p-0 shadow-2xl sm:rounded-lg">
          <DialogHeader className="border-b border-slate-200 px-4 py-5 text-left sm:px-6">
            <DialogTitle className="pr-8 text-xl font-bold leading-7 text-slate-950">{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-4 py-5 sm:px-6">
            <DetailSection label="Tên Lịch">
              <p>{event.title}</p>
            </DetailSection>

            <DetailSection label="Phân Loại">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: event.colorMain }} />
                <span>{getEventTypeLabel(event.type)}</span>
              </div>
            </DetailSection>

            <DetailSection label="Mô tả lịch">
              <p>{description}</p>
            </DetailSection>

            <DetailSection label="Người tạo">
              <div className="flex items-center gap-3">
                <CreatorAvatar creator={creator} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{creator.name}</div>
                  {creator.role && <div className="text-sm text-slate-500">{creator.role}</div>}
                </div>
              </div>
            </DetailSection>

            <DetailSection label="Thời gian tham gia">
              <div className="space-y-1">
                <p><span className="font-semibold">Bắt đầu:</span> {formatTimeInput(event.fromTime)} - {formatDateLabel(event.fromTime)}</p>
                <p><span className="font-semibold">Kết thúc:</span> {formatTimeInput(event.toTime)} - {formatDateLabel(event.toTime)}</p>
              </div>
            </DetailSection>

            {event.isCanceled && (
              <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                Lịch đã hủy{event.cancelReason ? `: ${event.cancelReason}` : ''}
              </div>
            )}
            {event.isLocked && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Lịch đã khóa
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
              <div className="flex flex-wrap gap-2">
                {!event.isCanceled ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCancel} disabled={loadingAction === 'cancel'}>
                    <CalendarX className="h-4 w-4" />Hủy lịch
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleUndoCancel} disabled={loadingAction === 'undo'}>
                    <RotateCcw className="h-4 w-4" />Khôi phục
                  </Button>
                )}
                {!event.isLocked && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLock} disabled={loadingAction === 'lock'}>
                    <LockKeyhole className="h-4 w-4" />Khóa
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
                  <PencilLine className="h-4 w-4" />Sửa
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete} disabled={loadingAction === 'delete'}>
                  <Trash2 className="h-4 w-4" />Xóa
                </Button>
              </div>
              <Button variant="outline" className="gap-1.5" onClick={handleCloseDetail}>
                <X className="h-4 w-4" />Đóng
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditing && (
        <CalendarForm
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          calendar={event}
          view={view}
          version={version}
          onSaved={refreshAndClose}
        />
      )}
    </>
  )
}
