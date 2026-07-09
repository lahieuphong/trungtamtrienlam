import React, { useState, useEffect } from 'react'
import { X, Check, ChevronDown } from 'lucide-react'
import { BasicSelect, DatePicker } from '../Form'
import { ChatConstants, ChatRemindConstants } from '@/constants/chatConstants'
import { BasicSelectPortal } from '../Form'
import { Button } from '../Form'
import { on } from 'events'
import { set } from 'lodash'
export default function CreateReminderModal ({
  isOpen,
  onClose,
  currentChat,
  onSubmit,
  editMode = false,
  initialData = null
}) {
  const [reminderContent, setReminderContent] = useState('')
  const [selectedTime, setSelectedTime] = useState('15 phút nữa')
  const [reminderDate, setReminderDate] = useState('Hôm nay lúc 15:00')
  const [repeatType, setRepeatType] = useState(
    ChatRemindConstants.RepeatType.NoRepeat
  )
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false)
  const [dateReminder, setDateReminder] = useState(null)
  const timeOptions = ['15 phút nữa', '30 phút nữa', '9:00 ngày mai', 'Khác']

  const repeatOptions = [
    { label: 'Không lặp lại', value: ChatRemindConstants.RepeatType.NoRepeat },
    { label: 'Hằng ngày', value: ChatRemindConstants.RepeatType.Daily },
    { label: 'Hằng tuần', value: ChatRemindConstants.RepeatType.Weekly },
    { label: 'Hằng tháng', value: ChatRemindConstants.RepeatType.Monthly }
  ]

  // Helper functions for repeat type conversion
  const getRepeatTypeLabel = value => {
    const option = repeatOptions.find(opt => opt.value === value)
    return option ? option.label : 'Không lặp lại'
  }

  const getRepeatTypeValue = value => {
    if (value === null || value === undefined || value === '') {
      return ChatRemindConstants.RepeatType.NoRepeat
    }

    const numericValue = Number(value)
    if (!Number.isNaN(numericValue)) {
      const optionByValue = repeatOptions.find(
        opt => Number(opt.value) === numericValue
      )
      if (optionByValue) return optionByValue.value
    }

    const optionByLabel = repeatOptions.find(opt => opt.label === value)
    return optionByLabel
      ? optionByLabel.value
      : ChatRemindConstants.RepeatType.NoRepeat
  }

  const calculateTimeFromOption = option => {
    const now = new Date()
    let calculatedTime = new Date(now)

    switch (option) {
      case '15 phút nữa':
        calculatedTime.setMinutes(now.getMinutes() + 15)
        break
      case '30 phút nữa':
        calculatedTime.setMinutes(now.getMinutes() + 30)
        break
      case '9:00 ngày mai':
        calculatedTime.setDate(now.getDate() + 1)
        calculatedTime.setHours(9, 0, 0, 0)
        break
      case 'Khác':
        return null
      default:
        return null
    }

    return calculatedTime
  }

  // Function to format date for display
  const formatDateForDisplay = date => {
    if (!date) return ''

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    const timeString = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    if (isToday) {
      return `Hôm nay lúc ${timeString}`
    } else if (isTomorrow) {
      return `Ngày mai lúc ${timeString}`
    } else {
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
  }

  // Initialize default time when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editMode && initialData) {
        // Populate form with existing data for edit mode
        setReminderContent(initialData.reminderContent || '')
        setSelectedTime(initialData.selectedTime || 'Khác')
        setRepeatType(
          getRepeatTypeValue(initialData.repeatType ?? initialData.RepeatType)
        )
        setDateReminder(initialData.dateReminder || null)
        if (initialData.dateReminder) {
          setReminderDate(formatDateForDisplay(initialData.dateReminder))
        }
      } else if (selectedTime === '15 phút nữa') {
        // Default behavior for create mode
        const calculatedTime = calculateTimeFromOption('15 phút nữa')
        if (calculatedTime) {
          setDateReminder(calculatedTime)
          setReminderDate(formatDateForDisplay(calculatedTime))
        }
      }
    }
  }, [isOpen, editMode, initialData])

  const handleSubmit = () => {
    let formattedDeadline = null

    if (dateReminder) {
      if (dateReminder instanceof Date) {
        const year = dateReminder.getFullYear()
        const month = String(dateReminder.getMonth() + 1).padStart(2, '0')
        const day = String(dateReminder.getDate()).padStart(2, '0')
        const hours = String(dateReminder.getHours()).padStart(2, '0')
        const minutes = String(dateReminder.getMinutes()).padStart(2, '0')
        const seconds = String(dateReminder.getSeconds()).padStart(2, '0')

        formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }
    }

    const reminderData = {
      ID: editMode && initialData && initialData.ID ? initialData.ID : '',
      RemindContent: reminderContent,
      ChatID: currentChat?.id || null,
      RemindTime: formattedDeadline,
      RepeatType: getRepeatTypeValue(repeatType)
    }
    onSubmit(reminderData)
    onClose()
  }

  const handleCancel = () => {
    // Reset form
    setReminderContent('')
    setSelectedTime('15 phút nữa')
    setReminderDate('')
    setRepeatType(ChatRemindConstants.RepeatType.NoRepeat)
    setDateReminder(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-hidden shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200'>
          <h2 className='text-lg sm:text-xl font-semibold text-gray-900'>
            {editMode ? 'Chỉnh sửa nhắc hẹn' : 'Tạo nhắc hẹn'}
          </h2>
          <Button
            onClick={handleCancel}
            className='p-1 hover:bg-gray-100 rounded'
            variant='ghost'
          >
            <X size={20} className='text-gray-500' />
          </Button>
        </div>

        {/* Content */}
        <div className='p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar'>
          {/* Reminder Content */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Nhập nội dung
            </label>
            <textarea
              value={reminderContent}
              onChange={e => setReminderContent(e.target.value)}
              placeholder='Nhập nội dung mới'
              className='w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm sm:text-base'
              rows={4}
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Chọn thời gian
            </label>
            <div className='flex gap-2 flex-wrap'>
              {timeOptions.map(timeOption => (
                <button
                  key={timeOption}
                  onClick={() => {
                    setSelectedTime(timeOption)
                    const calculatedTime = calculateTimeFromOption(timeOption)
                    if (calculatedTime) {
                      setDateReminder(calculatedTime)
                      setReminderDate(formatDateForDisplay(calculatedTime))
                    } else if (timeOption === 'Khác') {
                      // Reset for custom time selection
                      setDateReminder(null)
                      setReminderDate('')
                    }
                  }}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    selectedTime === timeOption
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {timeOption}
                </button>
              ))}
            </div>

            {/* Display calculated time */}
            {selectedTime !== 'Khác' && reminderDate && (
              <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                <p className='text-sm text-blue-800'>
                  <span className='font-medium'>Thời gian đã chọn:</span>{' '}
                  {reminderDate}
                </p>
              </div>
            )}
          </div>

          {/* Reminder Date - Only show when 'Khác' is selected */}
          {selectedTime === 'Khác' && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Chọn ngày nhắc hẹn tùy chỉnh
              </label>
              <div className='relative'>
                <DatePicker
                  value={dateReminder}
                  onChange={event => {
                    const date = event?.target?.value || event
                    setDateReminder(date)
                    if (date) {
                      setReminderDate(formatDateForDisplay(new Date(date)))
                    }
                  }}
                  dateFormat='dd/MM/yyyy'
                  showTimeSelect={true}
                  fullFormat='dd/MM/yyyy HH:mm'
                  placeholder='Chọn ngày và giờ tùy chỉnh'
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base'
                />
              </div>

              {/* Display custom selected time */}
              {dateReminder && reminderDate && (
                <div className='mt-3 p-3 bg-green-50 border border-green-200 rounded-lg'>
                  <p className='text-sm text-green-800'>
                    <span className='font-medium'>Thời gian tùy chỉnh:</span>{' '}
                    {reminderDate}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Repeat Type */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Chọn kiểu vòng lặp (vd: Lặp lại hằng tuần)
            </label>
            <div className='relative'>
              <BasicSelect
                name='notificationType'
                options={repeatOptions}
                value={repeatType}
                onChange={e => {
                  setRepeatType(getRepeatTypeValue(e.target.value))
                }}
                placeholder='Chọn kiểu vòng lặp'
              />
              {/* <Button
                variant='ghost'
                onClick={() => setShowRepeatDropdown(!showRepeatDropdown)}
                className='w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base'
              >
                <span className='text-gray-700'>{repeatType}</span>
                <ChevronDown size={16} className='text-gray-400' />
              </Button> */}

              {/* {showRepeatDropdown && (
                <div className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10'>
                  {repeatOptions.map(option => (
                    <Button
                      variant='ghost'
                      key={option.value}
                      onClick={() => {
                        setRepeatType(option.label)
                        setShowRepeatDropdown(false)
                      }}
                      className='w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg'
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )} */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200'>
          <Button
            onClick={handleCancel}
            variant='ghost'
            className='px-4 py-2 sm:px-4 sm:py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1'
          >
            <X size={16} className='mr-2' /> Đóng
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !reminderContent.trim() ||
              (selectedTime === 'Khác' && !dateReminder)
            }
            className='px-4 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2'
          >
            <Check size={16} className='mr-2' />{' '}
            {editMode ? 'Cập nhật' : 'Hoàn tất'}
          </Button>
        </div>
      </div>
    </div>
  )
}
