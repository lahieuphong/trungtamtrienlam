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
import PendingAttachmentPreview from './PendingAttachmentPreview'
import { useToast } from '@/contexts/ToastContext' // Import Toast context
import { Button } from '../Form'
import { useSignalR } from '@/contexts/SignalRContext'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'

const MessageInput = forwardRef(({
  message,
  setMessage,
  onSendMessage,
  onFileUpload,
  attachedFiles = [],
  onRemoveFile,
  activeTab,
  onCreateNote,
  onCreatePoll,
  currentChat,
  replyToMessage,
  onCancelReply,
  onCreateReminder,
  onInputFocus,
  chatId
}, ref) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const contextMenuRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const textInputRef = useRef(null)
  const toast = useToast()
  const { userInfo } = useLoadLocalStorage()

  const { sendTyping, registerTypingCallback, typingUsers } = useSignalR();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (textInputRef.current) {
        textInputRef.current.focus()
      }
    }
  }), [])

  const resizeTextInput = () => {
    if (!textInputRef.current) return

    textInputRef.current.style.height = 'auto'
    textInputRef.current.style.height = `${Math.min(textInputRef.current.scrollHeight, 128)}px`
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !e.nativeEvent?.isComposing) {
      e.preventDefault()
      onSendMessage()
    }
  }
  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData || window.clipboardData
    const items = clipboardData.items

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
    
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        
        const blob = item.getAsFile()
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const fileName = `screenshot-${timestamp}.png`

          const file = new File([blob], fileName, { type: blob.type })
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

  const handleInput = (e) => {
    setMessage(e.target.value);
    sendTyping(chatId, userInfo?.userID, true);
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      sendTyping(chatId, userInfo?.userID, false);
    }, 1500);
  };

  useEffect(() => {
    resizeTextInput()
  }, [message])
  return (
    <div className='min-h-16 bg-white border-t border-gray-200 relative flex items-center px-3 md:px-4 py-2'>
      <div className='flex w-full items-end gap-2'>
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
              // Xử lý file hình ảnh
              if (onFileUpload) {
                onFileUpload(e.target.files)
              } else {
                toast.info('Đính kèm hình ảnh sẽ có trong phiên bản tiếp theo')
              }
            }
            // Reset để có thể chọn lại file
            e.target.value = ''
          }}
          multiple
        />

        <Button
          className='p-2 text-gray-400 hover:text-gray-600'
          onClick={() => fileInputRef.current?.click()}
          title='Đính kèm file'
          variant='ghost'
        >
          <Paperclip size={20} />
        </Button>

        <Button
          className='p-2 text-gray-400 hover:text-gray-600'
          onClick={() => imageInputRef.current?.click()}
          title='Đính kèm hình ảnh'
          variant='ghost'
        >
          <ImageIcon size={20} />
        </Button>
        {activeTab === 'groups' && (
          <div className='relative' ref={contextMenuRef}>
            <Button
              variant='ghost'
              className='p-2 text-gray-400 hover:text-gray-600'
              onClick={toggleContextMenu}
            >
              <Calendar size={20} />
            </Button>

            {showContextMenu && (
              <div className='absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50'>
                {contextMenuItems.map(item => {
                  const IconComponent = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleContextMenuClick(item.id)}
                      className='w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 text-left'
                    >
                      <IconComponent size={16} className='text-gray-700' />
                      <span className='text-gray-700'>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className='flex-1 relative'>
          {/* Hiển thị tin nhắn đang trả lời */}
          {replyToMessage && (
            <div className='relative mb-2 rounded border-l-4 border-blue-500 bg-gray-50 py-2 pl-2 pr-8'>
              <div className='min-w-0'>
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
              <button
                type='button'
                onClick={onCancelReply}
                className='absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 hover:text-gray-900'
                aria-label={'Gỡ trả lời'}
                title={'Gỡ trả lời'}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}

          <PendingAttachmentPreview
            files={attachedFiles}
            onRemoveFile={onRemoveFile}
          />

          <textarea
            ref={textInputRef}
            rows={1}
            value={message}
            onChange={handleInput}
            onFocus={onInputFocus}
            onPaste={handlePaste}
            placeholder={
              attachedFiles.length > 0
                ? 'Thêm tin nhắn hoặc gửi ngay'
                : 'Nhập tin nhắn'
            }
            className='block w-full min-h-[38px] max-h-32 resize-none overflow-y-auto px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300 text-sm leading-5 placeholder:text-gray-400'
            onKeyDown={handleKeyDown}
          />
        </div>

        <Button
          className='p-1.5 sm:p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50'
          disabled={!message.trim() && attachedFiles.length === 0}
          onClick={onSendMessage}
        >
          <Send size={16} />
        </Button>
      </div>

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
        currentChat={currentChat}
      />
    </div>
  )
})

MessageInput.displayName = 'MessageInput'

export default MessageInput
