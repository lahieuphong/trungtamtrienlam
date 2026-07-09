import React, { useState } from 'react'
import { X, Clock, Users, User } from 'lucide-react'
import { Button } from '@/components/Form'
import { ChatRemindConstants } from '@/constants/chatConstants'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import CreateReminderModal from './CreateReminderModal'
import ParticipantsModal from './ParticipantsModal'
export default function ReminderDetailModal ({
  isOpen,
  onClose,
  reminder,
  onEdit = null,
  onDelete = null,
  onJoinReminder = null,
  onDeclineReminder = null
}) {
  if (!isOpen || !reminder) return null
  const { userInfo } = useLoadLocalStorage()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [userStatus, setUserStatus] = useState(null)

  const formatDate = dateString => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return { day, month }
  }

  const getRepeatTypeText = repeatType => {
    switch (repeatType) {
      case ChatRemindConstants.RepeatType.NoRepeat:
        return 'Không lặp lại'
      case ChatRemindConstants.RepeatType.Daily:
        return 'Hằng ngày'
      case ChatRemindConstants.RepeatType.Weekly:
        return 'Hằng tuần'
      case ChatRemindConstants.RepeatType.Monthly:
        return 'Hằng tháng'
      default:
        return 'Không lặp lại'
    }
  }

  // Format thời gian
  const formatTime = dateString => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // Format ngày hiển thị
  const formatDisplayDate = dateString => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai'
    } else {
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit'
      })
    }
  }

  const { day, month } = formatDate(reminder.remindTime)
  const time = formatTime(reminder.remindTime)
  const displayDate = formatDisplayDate(reminder.remindTime)

  // Parse participants and get user status
  const parseParticipants = participantsString => {
    if (!participantsString) return []
    try {
      return JSON.parse(participantsString)
    } catch {
      return []
    }
  }

  const participants = parseParticipants(reminder.participants || '[]')
  const joinedCount = participants.filter(p => p.status === 'joined').length
  const declinedCount = participants.filter(p => p.status === 'declined' || p.status === 'not_joined').length
  const currentUserParticipant = participants.find(
    p => p.userID === userInfo?.userID
  )
  const hasJoined = currentUserParticipant?.status === 'joined'

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleToggleStatus = () => {
    if (hasJoined) {
      onDeclineReminder?.(reminder)
    } else {
      onJoinReminder?.(reminder)
    }
  }

  const handleEditSubmit = updatedReminderData => {
    onEdit?.(updatedReminderData)
    setShowEditModal(false)
    onClose() // Close detail modal after successful edit
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg w-full max-w-sm shadow-xl overflow-hidden'>
        {/* Header */}
        <div className='bg-blue-500 text-white px-4 py-3 flex items-center justify-between'>
          <span className='font-semibold text-sm uppercase tracking-wide'>
            {displayDate.toUpperCase()}
          </span>
          <button
            onClick={handleClose}
            className='p-1 hover:bg-blue-600 rounded transition-colors'
          >
            <X size={16} className='text-white' />
          </button>
        </div>

        {/* Content */}
        {/* <div className='p-4 space-y-4'>
          <div>
            <h3 className='text-base font-medium text-gray-900 mb-2'>
              {reminder.RemindContent ||
                reminder.remindContent ||
                'Không có nội dung'}
            </h3>
          </div>

          <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
            <Clock size={16} className='text-gray-500 flex-shrink-0' />
            <div>
              <p className='text-sm font-medium text-gray-900'>
                {formatReminderTime(reminder.RemindTime || reminder.remindTime)}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
            <RefreshCw size={16} className='text-gray-500 flex-shrink-0' />
            <div>
              <p className='text-sm text-gray-600'>Lặp lại:</p>
              <p className='text-sm font-medium text-gray-900'>
                {getRepeatTypeText(reminder.RepeatType || reminder.repeatType)}
              </p>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-end gap-3 p-4 border-t border-gray-200'>
          <Button
            onClick={handleClose}
            variant='ghost'
            className='px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            <X size={16} className='mr-2' />
            Đóng
          </Button>
          {onEdit && reminder?.createdBy === userInfo?.userID && (
            <Button
              onClick={handleEdit}
              className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
            >
              <Pencil size={16} className='mr-2' />
              Chỉnh sửa
            </Button>
          )}
        </div> */}
        {/* Content */}
        <div className='p-4'>
          {/* Main Content */}
          <div className='flex items-start gap-4 mb-4'>
            {/* Date Card */}
            <div className='bg-blue-50 rounded-lg p-3 min-w-[60px] text-center flex-shrink-0'>
              <div className='text-2xl font-bold text-blue-600'>{day}</div>
              <div className='text-xs text-gray-600 uppercase'>
                THÁNG {month}
              </div>
            </div>

            {/* Content Info */}
            <div className='flex-1 min-w-0'>
              <h2 className='font-semibold text-gray-900 mb-2 text-base'>
                {reminder.remindContent || 'Mai ăn cơm gì ?'}
              </h2>

              <div className='flex items-center gap-2 text-sm text-gray-600 mb-2'>
                <Clock size={14} />
                <span>
                  {displayDate} lúc {time}
                </span>
              </div>

              <div className='flex items-center gap-2 text-sm text-gray-600 mb-3'>
                <Users size={14} />
                <span>
                  {getRepeatTypeText(
                    reminder.RepeatType || reminder.repeatType
                  )}
                </span>
              </div>

              <div 
                className='text-blue-600 text-sm font-medium cursor-pointer hover:underline'
                onClick={() => setShowParticipantsModal(true)}
              >
                {reminder.countJoin || joinedCount} người tham gia, {reminder.countNotJoin || declinedCount} từ chối 
              </div>
            </div>
          </div>

          {/* Status */}
          <div className='bg-gray-50 rounded-lg p-3 mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              
              {/* <span className='text-sm text-gray-700'>
                Bạn xác nhận: {hasJoined ? 'Tham gia.' : 'Chưa tham gia.'}
              </span> */}
            </div>
            {/* <button
              onClick={handleToggleStatus}
              className='text-blue-500 text-sm hover:underline'
            >
              Thay đổi
            </button> */}
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3'>
            <button
              onClick={handleClose}
              className='flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors'
            >
              Đồng ý
            </button>

            {onEdit && reminder?.createdBy === userInfo?.userID && (
              <button
                onClick={handleEdit}
                className='flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors'
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <CreateReminderModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          currentChat={{ id: reminder.ChatID || reminder.chatID }}
          editMode={true}
          initialData={{
            ID: reminder.ID || reminder.id,
            reminderContent:
              reminder.RemindContent || reminder.remindContent || '',
            dateReminder:
              reminder.RemindTime || reminder.remindTime
                ? new Date(reminder.RemindTime || reminder.remindTime)
                : null,
            repeatType: getRepeatTypeText(
              reminder.RepeatType || reminder.repeatType || 0
            ),
            selectedTime: 'Khác' // Force custom time selection for edit mode
          }}
        />
      )}

      {/* Participants Modal */}
      {showParticipantsModal && (
        <ParticipantsModal
          isOpen={showParticipantsModal}
          onClose={() => setShowParticipantsModal(false)}
          reminder={reminder}
          joinedCount={reminder.countJoin || joinedCount}
          declinedCount={reminder.countNotJoin || declinedCount}
        />
      )}
    </div>
  )
}
