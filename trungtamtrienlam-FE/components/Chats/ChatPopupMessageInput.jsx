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
  Archive
} from 'lucide-react'
import CreatePollModal from './CreatePollModal'
import CreateReminderModal from './CreateReminderModal'
import CreateNoteModal from './CreateNoteModal'
import PendingAttachmentPreview from './PendingAttachmentPreview'
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
  onInputFocus,
  isAI = false
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
  }), [])

  const resizeMessageInput = () => {
    if (!messageInputRef.current) return

    messageInputRef.current.style.height = 'auto'
    messageInputRef.current.style.height = `${Math.min(
      messageInputRef.current.scrollHeight,
      128
    )}px`
  }

  const handleKeyDown = e => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.isComposing &&
      !e.nativeEvent?.isComposing
    ) {
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

  useEffect(() => {
    resizeMessageInput()
  }, [message])

  const contextMenuItems = [
    { id: 'poll', label: 'Tạo bình chọn', icon: Users },
    { id: 'reminder', label: 'Tạo nhắc hẹn', icon: Bell },
    { id: 'note', label: 'Tạo ghi chú', icon: FileText }
  ]

  return (
    <div className={`p-3 ${isAI ? 'bg-amber-50/70' : ''}`}>
      {/* Hiển thị tin nhắn đang trả lời */}
      {replyToMessage && (
        <div
          className={`mb-2 flex items-start justify-between rounded border-l-4 p-2 ${
            isAI
              ? 'border-amber-500 bg-amber-100/70'
              : 'border-blue-500 bg-gray-50'
          }`}
        >
          <div>
            <div
              className={`mb-1 text-xs font-medium ${
                isAI ? 'text-amber-800' : 'text-blue-600'
              }`}
            >
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

      <PendingAttachmentPreview
        files={attachedFiles}
        onRemoveFile={onRemoveFile}
        compact
      />

      {/* Input Area */}
      <div className='flex items-end gap-1 min-w-0'>
        {/* Hidden File Inputs */}
        <input
          type='file'
          ref={fileInputRef}
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
          className={`rounded-full p-1.5 ${
            isAI
              ? 'text-amber-600 hover:bg-amber-100 hover:text-amber-800'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
          onClick={() => fileInputRef.current?.click()}
          title='Đính kèm file'
        >
          <Paperclip size={16} />
        </button>

        {/* Image Upload Button */}
        <button
          className={`rounded-full p-1.5 ${
            isAI
              ? 'text-amber-600 hover:bg-amber-100 hover:text-amber-800'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
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
        <textarea
          ref={messageInputRef}
          rows={1}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={onInputFocus}
          placeholder={
            attachedFiles.length > 0
              ? 'Thêm tin nhắn hoặc gửi ngay'
              : 'Nhập tin nhắn...'
          }
          className={`min-h-[38px] max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-md border px-3 py-2 text-sm leading-5 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${
            isAI
              ? 'border-amber-300 bg-white/90 focus:border-amber-400'
              : 'border-gray-300 bg-gray-100 focus:border-gray-300'
          }`}
        />

        {/* Send Button */}
        <button
          onClick={onSendMessage}
          disabled={!message.trim() && attachedFiles.length === 0}
          className={`flex-shrink-0 rounded-full p-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isAI
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
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
