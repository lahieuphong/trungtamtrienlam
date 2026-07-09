import React from 'react'
import { Bell, Clock, Users, User } from 'lucide-react'
import { ChatRemindConstants } from '@/constants/chatConstants'

export default function ReminderCard ({
  reminder,
  onJoinReminder,
  onDeclineReminder,
  userInfo
}) {
  if (!reminder) return null

  // Format ngày tháng
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

  // Parse userJoin data
  const parseUserData = userDataString => {
    if (!userDataString) return []
    try {
      return JSON.parse(userDataString)
    } catch {
      return []
    }
  }

  const joinedUsers = parseUserData(reminder.userJoin || '[]')
  const declinedUsers = parseUserData(reminder.userNotJoin || '[]')

  // Check if current user has joined
  const hasJoined = joinedUsers.some(
    user => (user.UserID || user.userID) === userInfo?.userID
  )

  const hasDeclined = declinedUsers.some(
    user => (user.UserID || user.userID) === userInfo?.userID
  )

  return (
    <div className='bg-white border border-gray-200 rounded-lg overflow-hidden w-full max-w-[280px] mx-auto shadow-sm'>
      {/* Header */}
      <div className='bg-blue-500 text-white px-3 py-2 flex items-center gap-2'>
        <div className='bg-white text-blue-500 rounded p-1'>
          <Bell size={14} />
        </div>
        <span className='font-semibold text-xs uppercase tracking-wide'>
          NHẮC HẸN
        </span>
      </div>

      {/* Content */}
      <div className='p-3'>
        {/* Date Display */}
        <div className='flex items-start gap-2.5 mb-3'>
          <div className='bg-blue-50 rounded-lg p-2 min-w-[40px] text-center flex-shrink-0'>
            <div className='text-lg font-bold text-blue-600'>{day}</div>
            <div className='text-xs text-gray-600 uppercase leading-none'>
              TH{month}
            </div>
          </div>

          <div className='flex-1 min-w-0'>
            <h3 className='font-medium text-gray-900 mb-1.5 text-sm line-clamp-2 leading-tight'>
              {reminder.remindContent || 'Nhắc hẹn'}
            </h3>

            <div className='space-y-1 text-xs text-gray-600'>
              <div className='flex items-center gap-1'>
                <Clock size={11} className='flex-shrink-0' />
                <span className='truncate'>
                  {displayDate} lúc {time}
                </span>
              </div>

              <div className='flex items-center gap-1'>
                <Users size={11} className='flex-shrink-0' />
                <span className='truncate'>
                  {getRepeatTypeText(
                    reminder.RepeatType || reminder.repeatType
                  )}
                </span>
              </div>

              <div className='flex items-center gap-1 text-blue-600'>
                <User size={11} className='flex-shrink-0' />
                <div className='flex items-center gap-1 min-w-0'>
                  <span className='text-xs'>
                    {reminder.countJoin} tham gia, {reminder.countNotJoin} từ
                    chối
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-2'>
          <button
            disabled={hasDeclined}
            onClick={e => {
              e.stopPropagation()
              onDeclineReminder?.(reminder.id, false)
            }}
            className='flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Từ chối
          </button>

          <button
            onClick={e => {
              e.stopPropagation()
              if (!hasJoined) {
                onJoinReminder?.(reminder.id, true)
              }
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
              hasJoined
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
            }`}
            disabled={hasJoined}
          >
            {hasJoined ? '✓ Đã tham gia' : 'Tham gia'}
          </button>
        </div>
      </div>
    </div>
  )
}
