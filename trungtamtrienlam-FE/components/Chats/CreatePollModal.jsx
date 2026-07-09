import React, { useState } from 'react'
import { X, Plus, Calendar } from 'lucide-react'
import { Button, Checkbox, DatePicker, Input } from '@/components/Form'
import { format } from 'date-fns'

export default function CreatePollModal({ isOpen, onClose, currentChat, onSubmit }) {
  const [pollTitle, setPollTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [hasDeadline, setHasDeadline] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState(null)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [remindMembers, setRemindMembers] = useState(false)



  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
    }
  }

  const handleSubmit = () => {
    // Khởi tạo giá trị mặc định
    let formattedDeadline = null;  // Sử dụng null thay vì chuỗi rỗng
    
    if (hasDeadline && deadlineDate) {
      if (deadlineDate instanceof Date) {
        const year = deadlineDate.getFullYear();
        const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
        const day = String(deadlineDate.getDate()).padStart(2, '0');
        const hours = String(deadlineDate.getHours()).padStart(2, '0');
        const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
        const seconds = String(deadlineDate.getSeconds()).padStart(2, '0');
        
        formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      }
    }
    
    // Format options to match backend API structure
    const formattedOptions = options
      .filter(option => option.trim() !== '')
      .map(optionName => ({ OptionName: optionName }));

    // Tạo đối tượng poll data cơ bản
    const pollData = {
      VoteName: pollTitle,
      ChatID: currentChat?.id || null,
      Options: formattedOptions,
      IsMulti: allowMultiple,
      RemindVote: remindMembers
    }
    
    // Chỉ thêm trường DateEnd khi có thời hạn
    if (hasDeadline) {
      pollData.DateEnd = formattedDeadline;
    }
    onSubmit(pollData)
    onClose()
  }

  const handleCancel = () => {
    // Reset form
    setPollTitle('')
    setOptions(['', ''])
    setHasDeadline(false)
    setDeadlineDate(null)
    setAllowMultiple(false)
    setRemindMembers(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg w-96 max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold text-gray-900'>Tạo bình chọn</h2>
          <Button
            onClick={handleCancel}
            className='p-1 hover:bg-gray-100 rounded'
            variant="ghost"
          >
            <X size={20} className='text-gray-500' />
          </Button>
        </div>

        {/* Content */}
        <div className='p-4 max-h-[calc(90vh-120px)] overflow-y-auto'>
          {/* Poll Title */}
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Chủ đề bình chọn
            </label>
            <textarea
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
              placeholder='Đặt câu hỏi bình chọn'
              className='w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
              rows={3}
            />
          </div>

          {/* Poll Options */}
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Các lựa chọn
            </label>
            <div className='space-y-2'>
              {options.map((option, index) => (
                <div key={index} className='flex items-center gap-2'>
                  <Input
                    type='text'
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Lựa chọn ${index + 1}`}
                    className='flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      onClick={() => handleRemoveOption(index)}
                      className='p-2 text-gray-400 hover:text-red-500'
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
              ))}
              
              {/* Add Option Button */}
              {options.length < 10 && (
                <Button
                  onClick={handleAddOption}
                  className='flex items-center gap-2 text-blue-500 text-sm font-medium py-2'
                >
                  <Plus size={16} />
                  Thêm lựa chọn
                </Button>
              )}
            </div>
          </div>

          {/* Deadline Options */}
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Khoảng thời gian
            </label>
            <div className='space-y-3'>
              {/* No deadline option */}
              <div className='flex items-center gap-3'>
                <label className='flex items-center cursor-pointer'>
                  <Checkbox
                    type='radio'
                    name='deadline-type'
                    checked={!hasDeadline}
                    onChange={() => setHasDeadline(false)}
                    className='sr-only'
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!hasDeadline ? 'border-blue-500' : 'border-gray-300'}`}>
                    {!hasDeadline && <div className='w-3 h-3 rounded-full bg-blue-500'></div>}
                  </div>
                  <span className='ml-3 text-sm text-gray-700'>Không thời hạn</span>
                </label>
              </div>

              {/* Custom deadline option */}
              <div className='flex items-start gap-3'>
                <label className='flex items-center cursor-pointer'>
                  <input
                    type='radio'
                    name='deadline-type'
                    checked={hasDeadline}
                    onChange={() => setHasDeadline(true)}
                    className='sr-only'
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasDeadline ? 'border-blue-500' : 'border-gray-300'}`}>
                    {hasDeadline && <div className='w-3 h-3 rounded-full bg-blue-500'></div>}
                  </div>
                  <span className='ml-3 text-sm text-gray-700'>Chọn thời gian kết thúc</span>
                </label>
              </div>

              {/* Date picker */}
              {hasDeadline && (
                <div className='ml-8'>
                  <DatePicker
                    value={deadlineDate}
                    onChange={(event) => {
                      // DatePicker can return event.target.value or the date directly
                      const date = event?.target?.value || event;
                      setDeadlineDate(date);
                    }}
                    dateFormat='dd/MM/yyyy'
                    showTimeSelect={true}
                    fullFormat='dd/MM/yyyy HH:mm'
                    placeholder='Chọn ngày kết thúc'
                    className='w-full border border-gray-200 rounded-lg'
                  />
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className='space-y-3'>
            {/* Allow Multiple Answers */}
            <div className='flex items-center gap-3'>
              <label className='flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className='sr-only'
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  allowMultiple 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {allowMultiple && (
                    <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                  )}
                </div>
                <span className='ml-3 text-sm text-gray-700'>Cho phép nhiều câu trả lời</span>
              </label>
            </div>

            {/* Remind Members */}
            {/* <div className='flex items-center gap-3'>
              <label className='flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={remindMembers}
                  onChange={(e) => setRemindMembers(e.target.checked)}
                  className='sr-only'
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  remindMembers 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {remindMembers && (
                    <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                  )}
                </div>
                <span className='ml-3 text-sm text-gray-700'>Nhắc nhở bình chọn</span>
              </label>
            </div> */}
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 p-4 border-t border-gray-200'>
          <Button
            variant="outline"
            onClick={handleCancel}
            className='px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Đóng
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!pollTitle.trim() || options.filter(opt => opt.trim()).length < 2}
            className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Hoàn tất
          </Button>
        </div>
      </div>
    </div>
  )
}