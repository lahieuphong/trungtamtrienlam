'use client'

import { useState } from 'react'
import { CalendarX, Clock, Link, LockKeyhole, MapPin, PencilLine, RotateCcw, Tag, Trash2, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/contexts/ToastContext'
import { CalendarConstants } from '@/constants/calendarConstants'
import { cancelEvent, cancelEventV2, cancelUndoEvent, cancelUndoEventV2, deleteEvent, deleteEventV2, lockEvent, lockEventV2 } from '@/lib/api/calendarApi'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import CalendarButton from '../CalendarButton'
import CalendarForm from './calendar-form'
import { formatDateLabel, getEventTypeLabel } from '@/hooks/useCalendar'

export default function EventDetail({ isOpen, onClose, event, view = 'month', version = CalendarConstants.calendarVersion.v2 }) {
  const toast = useToast()
  const { triggerReload } = useCalendarReload()
  const [isEditing, setIsEditing] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')

  if (!event) return null

  const refreshAndClose = () => {
    triggerReload(view)
    onClose?.()
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
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Chi tiết lịch"
        size="xl"
        footer={
          <>
            <CalendarButton variant="outline" onClick={onClose}><X size={16} className="mr-2" />Đóng</CalendarButton>
            {!event.isCanceled ? (
              <CalendarButton variant="outline" onClick={handleCancel} isLoading={loadingAction === 'cancel'}><CalendarX size={16} className="mr-2" />Hủy lịch</CalendarButton>
            ) : (
              <CalendarButton variant="outline" onClick={handleUndoCancel} isLoading={loadingAction === 'undo'}><RotateCcw size={16} className="mr-2" />Khôi phục</CalendarButton>
            )}
            {!event.isLocked && <CalendarButton variant="outline" onClick={handleLock} isLoading={loadingAction === 'lock'}><LockKeyhole size={16} className="mr-2" />Khóa</CalendarButton>}
            <CalendarButton variant="primary" onClick={() => setIsEditing(true)}><PencilLine size={16} className="mr-2" />Sửa</CalendarButton>
            <CalendarButton variant="danger" onClick={handleDelete} isLoading={loadingAction === 'delete'}><Trash2 size={16} className="mr-2" />Xóa</CalendarButton>
          </>
        }
      >
        <div className="space-y-5">
          <div className="rounded-lg border-l-4 bg-gray-50 px-4 py-3" style={{ borderLeftColor: event.colorMain }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{event.description || 'Không có mô tả'}</p>
              </div>
              <div className="flex items-center gap-2">
                {event.icon.month?.content}
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">{event.typeLabel}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<Clock size={18} />} label="Thời gian" value={`${formatDateLabel(event.fromTime)} ${event.time}`} />
            <InfoRow icon={<Tag size={18} />} label="Loại lịch" value={getEventTypeLabel(event.type)} />
            <InfoRow icon={<MapPin size={18} />} label="Địa điểm" value={event.location || 'Chưa có'} />
            <InfoRow icon={<Link size={18} />} label="Link" value={event.link || 'Chưa có'} link={event.link} />
          </div>

          {event.isCanceled && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              Lịch đã hủy{event.cancelReason ? `: ${event.cancelReason}` : ''}
            </div>
          )}
          {event.isLocked && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Lịch đã khóa
            </div>
          )}
        </div>
      </Modal>

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

function InfoRow({ icon, label, value, link }) {
  return (
    <div className="flex gap-3 rounded-lg border border-gray-100 bg-white p-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase text-gray-400">{label}</div>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="mt-1 block truncate text-blue-600 hover:underline">{value}</a>
        ) : (
          <div className="mt-1 break-words text-gray-700">{value}</div>
        )}
      </div>
    </div>
  )
}
