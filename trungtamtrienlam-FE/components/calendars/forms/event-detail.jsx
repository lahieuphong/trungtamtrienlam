'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarX, CircleOff, LockKeyhole, PencilLine, RotateCcw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
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

function CancelEventModal({ isOpen, reason, error, saving, onReasonChange, onClose, onSubmit }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-[calc(100vw-32px)] max-w-md gap-0 overflow-hidden rounded-lg border-0 bg-white p-0 shadow-2xl sm:max-w-[520px]">
        <DialogHeader className="border-b border-slate-200 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="text-lg font-semibold text-slate-950">Hủy lịch</DialogTitle>
          <DialogDescription className="sr-only">Nhập lý do hủy lịch</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold leading-6 text-slate-700">
            Bạn có chắc chắn muốn hủy lịch này không?
          </p>
          <div className="space-y-2">
            <label htmlFor="cancelReason" className="text-sm font-semibold text-slate-700">
              Vui lòng nhập lý do hủy lịch <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="cancelReason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Nhập lý do hủy"
              className={`min-h-[104px] resize-none ${error ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              disabled={saving}
              autoFocus
            />
            {error && <p className="text-sm font-medium text-red-500">Yêu cầu nhập lý do hủy</p>}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="gap-1.5">
            <X className="h-4 w-4" />
            Hủy
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={saving || !stripHtml(reason)}
            className="gap-1.5 bg-[#D46B08] text-white hover:bg-[#B65507]"
          >
            <CalendarX className="h-4 w-4" />
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteEventModal({ isOpen, saving, title, onClose, onSubmit }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent className="w-[calc(100vw-32px)] max-w-md gap-0 overflow-hidden rounded-lg border-0 bg-white p-0 shadow-2xl sm:max-w-[520px]">
        <AlertDialogHeader className="border-b border-slate-200 px-4 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <AlertDialogTitle className="text-lg font-semibold text-slate-950">Xóa lịch</AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-5 text-slate-500">
                Hành động này không thể hoàn tác sau khi xác nhận.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3 px-4 py-5 text-sm leading-6 text-slate-700 sm:px-6">
          <p className="font-semibold text-slate-900">Bạn muốn xóa lịch này?</p>
          <p>
            Lịch <span className="font-semibold text-slate-900">{title || 'này'}</span> sẽ không thể chỉnh sửa hoặc cập nhật thông tin mới.
          </p>
        </div>

        <AlertDialogFooter className="border-t border-slate-200 px-4 py-4 sm:px-6">
          <AlertDialogCancel disabled={saving} className="gap-1.5">
            <X className="h-4 w-4" />
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              onSubmit()
            }}
            disabled={saving}
            className="gap-1.5 bg-red-500 text-white hover:bg-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Xóa lịch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function EventDetail({ isOpen, onClose, event, view = 'month', version = CalendarConstants.calendarVersion.v2 }) {
  const toast = useToast()
  const { triggerReload } = useCalendarReload()
  const [isEditing, setIsEditing] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState(false)

  useEffect(() => {
    setIsEditing(false)
    setLoadingAction('')
    setIsCancelModalOpen(false)
    setIsDeleteModalOpen(false)
    setCancelReason('')
    setCancelError(false)
  }, [isOpen, event?.id])

  const handleCloseDetail = () => {
    setIsEditing(false)
    setLoadingAction('')
    setIsCancelModalOpen(false)
    setIsDeleteModalOpen(false)
    setCancelReason('')
    setCancelError(false)
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
    setCancelReason('')
    setCancelError(false)
    setIsCancelModalOpen(true)
  }

  const handleCloseCancelModal = () => {
    if (loadingAction === 'cancel') return
    setIsCancelModalOpen(false)
    setIsDeleteModalOpen(false)
    setCancelReason('')
    setCancelError(false)
  }

  const handleSubmitCancel = () => {
    const reason = stripHtml(cancelReason)
    if (!reason) {
      setCancelError(true)
      return
    }
    setCancelError(false)
    runAction('cancel', () => version === CalendarConstants.calendarVersion.v1 ? cancelEvent({ id: event.id, cancelReason: reason }) : cancelEventV2({ id: event.id, cancelReason: reason }), 'Đã hủy lịch')
  }

  const handleUndoCancel = () => runAction('undo', () => version === CalendarConstants.calendarVersion.v1 ? cancelUndoEvent({ id: event.id }) : cancelUndoEventV2({ id: event.id }), 'Đã khôi phục lịch')
  const handleLock = () => runAction('lock', () => version === CalendarConstants.calendarVersion.v1 ? lockEvent({ id: event.id }) : lockEventV2({ id: event.id }), 'Đã khóa lịch')
  const handleDelete = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    setIsDeleteModalOpen(true)
  }

  const handleCloseDeleteModal = () => {
    if (loadingAction === 'delete') return
    setIsDeleteModalOpen(false)
  }

  const handleSubmitDelete = () => {
    if (loadingAction === 'delete') return
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
              <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
                <CircleOff className="h-4 w-4 shrink-0" />
                <span>Lịch đã hủy{event.cancelReason ? `: ${event.cancelReason}` : ''}</span>
              </div>
            )}
            {event.isLocked && (
              <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                <LockKeyhole className="h-4 w-4 shrink-0" />
                <span>Lịch đã khóa</span>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
              <div className="flex flex-wrap gap-2">
                {!event.isLocked && (!event.isCanceled ? (
                  <Button size="sm" className="gap-1.5 bg-[#D46B08] text-white hover:bg-[#B65507]" onClick={handleCancel} disabled={loadingAction === 'cancel'}>
                    <CalendarX className="h-4 w-4" />Hủy lịch
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5 bg-blue-500 text-white hover:bg-blue-600" onClick={handleUndoCancel} disabled={loadingAction === 'undo'}>
                    <RotateCcw className="h-4 w-4" />Khôi phục
                  </Button>
                ))}
                {!event.isLocked && !event.isCanceled && (
                  <Button size="sm" className="gap-1.5 bg-slate-600 text-white hover:bg-slate-700" onClick={handleLock} disabled={loadingAction === 'lock'}>
                    <LockKeyhole className="h-4 w-4" />Khóa
                  </Button>
                )}
                {!event.isLocked && !event.isCanceled && (
                  <Button size="sm" className="gap-1.5 bg-blue-500 text-white hover:bg-blue-600" onClick={() => setIsEditing(true)}>
                    <PencilLine className="h-4 w-4" />Sửa
                  </Button>
                )}
                <Button type="button" variant="destructive" size="sm" className="gap-1.5 bg-red-500 text-white hover:bg-red-600" onClick={handleDelete} disabled={loadingAction === 'delete'}>
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

      <CancelEventModal
        isOpen={isCancelModalOpen}
        reason={cancelReason}
        error={cancelError}
        saving={loadingAction === 'cancel'}
        onReasonChange={(value) => {
          setCancelReason(value)
          if (value.trim()) setCancelError(false)
        }}
        onClose={handleCloseCancelModal}
        onSubmit={handleSubmitCancel}
      />

      <DeleteEventModal
        isOpen={isDeleteModalOpen}
        saving={loadingAction === 'delete'}
        title={event.title}
        onClose={handleCloseDeleteModal}
        onSubmit={handleSubmitDelete}
      />

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
