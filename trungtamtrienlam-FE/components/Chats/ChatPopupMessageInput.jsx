import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  Paperclip,
  Image as ImageIcon,
  Smile,
  Send,
  Calendar,
  Bell,
  FileText,
  Users,
  Archive,
  X
} from 'lucide-react'
import CreatePollModal from './CreatePollModal'
import CreateReminderModal from './CreateReminderModal'
import CreateNoteModal from './CreateNoteModal'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '../Form'

const ChatPopupMessageInput = forwardRef(({
  message,
  setMessage,
  onSendMessage,
  onFileUpload,
  attachedFiles = [],
  onRemoveFile,
  activeTab,
  onCreateNote,
  onUpdateNote,
  onCreatePoll,
  currentChat,
  replyToMessage,
  onCancelReply,
  onCreateReminder,
  onInputFocus
}, ref) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const contextMenuRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const messageInputRef = useRef(null)
  const toast = useToast()


  // Expose focusInput method to parent component
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (messageInputRef.current) {
        messageInputRef.current.focus()
      } else {
        console.warn('Message input ref not available')
      }
    }
  }))

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData || window.clipboardData
    const items = clipboardData.items

    // Kiểm tra xem có hình ảnh trong clipboard không
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Nếu là hình ảnh
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault() // Ngăn paste text mặc định
        
        const blob = item.getAsFile()
        if (blob) {
          // Tạo tên file với timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const fileName = `screenshot-${timestamp}.png`
          
          // Tạo File object với tên
          const file = new File([blob], fileName, { type: blob.type })
          
          // Gửi file qua onFileUpload
          if (onFileUpload) {
            onFileUpload([file])
           
          }
        }
        break
      }
    }
  }

  const toggleContextMenu = () => {
    setShowContextMenu(!showContextMenu)
  }

  const handleContextMenuClick = action => {
    setShowContextMenu(false)
    switch (action) {
      case 'poll':
        setShowPollModal(true)
        break
      case 'reminder':
        setShowReminderModal(true)
        break
      case 'note':
        setShowNoteModal(true)
        break
      default:
        break
    }
  }

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setShowContextMenu(false)
      }
    }

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showContextMenu])

  const contextMenuItems = [
    { id: 'poll', label: 'Tạo bình chọn', icon: Users },
    { id: 'reminder', label: 'Tạo nhắc hẹn', icon: Bell },
    { id: 'note', label: 'Tạo ghi chú', icon: FileText }
  ]

  return (
    <div className='p-3'>
      {/* Hiển thị tin nhắn đang trả lời */}
      {replyToMessage && (
        <div className='mb-2 bg-gray-50 border-l-4 border-blue-500 p-2 rounded flex justify-between items-start'>
          <div>
            <div className='text-blue-600 text-xs font-medium mb-1'>
              Đang trả lời{' '}
              {replyToMessage.senderName ||
                (replyToMessage.sender === 'me'
                  ? 'chính mình'
                  : replyToMessage.sender)}
            </div>
            <div className='text-gray-600 text-xs line-clamp-1'>
              {replyToMessage.content ||
                (replyToMessage.files && replyToMessage.files.length > 0
                  ? '[Tệp đính kèm]'
                  : '')}
            </div>
          </div>
          <Button
            variant='ghost'
            onClick={onCancelReply}
            className='text-gray-400 hover:text-gray-600'
          >
            &times;
          </Button>
        </div>
      )}

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className='mb-2 flex flex-wrap gap-1'>
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className='bg-blue-50 text-blue-600 text-xs rounded px-2 py-1 flex items-center gap-1'
            >
              <span className='truncate max-w-[80px]'>{file.name}</span>
              <button
                onClick={() => onRemoveFile(index)}
                className='text-blue-400 hover:text-blue-700 ml-1'
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className='flex items-center gap-1 min-w-0'>
        {/* Hidden File Inputs */}
        <input
          type='file'
          ref={fileInputRef}
          accept='.zip,.rar,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx'
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              if (onFileUpload) {
                onFileUpload(e.target.files)
              } else {
                toast.info('Đính kèm file sẽ có trong phiên bản tiếp theo')
              }
            }
            e.target.value = ''
          }}
          multiple
        />

        <input
          type='file'
          ref={imageInputRef}
          accept='image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp,.jfif,.svg,.tif,.tiff,.ico,.avif,.heic,.heif,.apng,.arw,.dng,.mp4,.mkv'
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              if (onFileUpload) {
                onFileUpload(e.target.files)
              } else {
                toast.info('Đính kèm hình ảnh sẽ có trong phiên bản tiếp theo')
              }
            }
            e.target.value = ''
          }}
          multiple
        />

        {/* File Upload Button */}
        <button
          className='p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100'
          onClick={() => fileInputRef.current?.click()}
          title='Đính kèm file'
        >
          <Paperclip size={16} />
        </button>

        {/* Image Upload Button */}
        <button
          className='p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100'
          onClick={() => imageInputRef.current?.click()}
          title='Đính kèm hình ảnh'
        >
          <ImageIcon size={16} />
        </button>

        {/* Context Menu for Groups */}
        {activeTab === 'groups' && (
          <div className='relative' ref={contextMenuRef}>
            <button
              className='p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100'
              onClick={toggleContextMenu}
              title='Tạo thêm'
            >
              <Calendar size={16} />
            </button>

            {showContextMenu && (
              <div className='absolute bottom-full left-0 mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50'>
                {contextMenuItems.map(item => {
                  const IconComponent = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleContextMenuClick(item.id)}
                      className='w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 text-left'
                    >
                      <IconComponent size={12} className='text-gray-700' />
                      <span className='text-gray-700'>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Message Input */}
        <input
          ref={messageInputRef}
          type='text'
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          onFocus={onInputFocus}
          placeholder={
            attachedFiles.length > 0
              ? 'Thêm tin nhắn hoặc gửi ngay'
              : 'Nhập tin nhắn...'
          }
          className='flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50'
        />

        {/* Send Button */}
        <button
          onClick={onSendMessage}
          disabled={!message.trim() && attachedFiles.length === 0}
          className='flex-shrink-0 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          <Send size={14} />
        </button>
      </div>

      {/* Modals */}
      <CreatePollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={pollData => {
          onCreatePoll(pollData)
          setShowPollModal(false)
        }}
        currentChat={currentChat}
      />

      <CreateReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSubmit={reminderData => {
          onCreateReminder(reminderData)
          setShowReminderModal(false)
        }}
        currentChat={currentChat}
      />

      <CreateNoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSubmit={noteData => {
          onCreateNote(noteData)
          setShowNoteModal(false)
        }}
        onUpdate={noteData => {
          onUpdateNote(noteData)
          setShowNoteModal(false)
        }}
        currentChat={currentChat}
      />
    </div>
  )
})

ChatPopupMessageInput.displayName = 'ChatPopupMessageInput'

export default ChatPopupMessageInput