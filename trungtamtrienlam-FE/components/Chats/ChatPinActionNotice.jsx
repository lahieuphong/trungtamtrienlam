import { useState } from 'react'
import { ArrowUpRight, MoreHorizontal, PinIcon, PinOff, X } from 'lucide-react'

const PIN_MESSAGE_TYPE = 7
const UNPIN_MESSAGE_TYPE = 8

const normalizeActionContent = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const getPinActionTypeFromContent = message => {
  const content = normalizeActionContent(
    message?.content ?? message?.Content ?? message?.message ?? message?.Message
  )

  if (!content.includes('ghim') || !content.includes('tin nhan')) {
    return null
  }

  return content.includes('bo ghim') ? UNPIN_MESSAGE_TYPE : PIN_MESSAGE_TYPE
}

export const getChatPinActionMessageType = message => {
  const messageType = Number(message?.messageType ?? message?.MessageType)

  if (messageType === PIN_MESSAGE_TYPE || messageType === UNPIN_MESSAGE_TYPE) {
    return messageType
  }

  return getPinActionTypeFromContent(message)
}

export const isChatPinActionMessage = message => {
  return Boolean(getChatPinActionMessageType(message))
}

const getMessageId = message =>
  message?.id ?? message?.ID ?? message?.messageID ?? message?.MessageID ?? ''

const getMessageEventId = message =>
  message?.eventID ??
  message?.EventID ??
  message?.eventId ??
  message?.EventId ??
  ''

const getNavigableMessageId = message => getMessageId(message) || getMessageEventId(message)

const getPinnedMessageActionId = message => {
  if (message?.isPin || message?.IsPin) return getMessageId(message)
  if (message?.NotePin || message?.notePin) return getMessageEventId(message)

  return getNavigableMessageId(message)
}

export const getChatPinActionTargetId = message =>
  message?.eventID ??
  message?.EventID ??
  message?.eventId ??
  message?.EventId ??
  ''

const getMessageContent = message => {
  const content = message?.content ?? message?.Content ?? ''
  return typeof content === 'string' ? content : String(content || '')
}

const getMessageFiles = message => {
  if (!message) return []
  if (Array.isArray(message.files)) return message.files
  if (Array.isArray(message.Files)) return message.Files

  const rawFiles = message.chatFiles ?? message.ChatFiles
  if (!rawFiles || typeof rawFiles !== 'string') return []

  try {
    const parsed = JSON.parse(rawFiles)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getFileName = file =>
  file?.fileName ?? file?.FileName ?? file?.name ?? file?.Name ?? 'Tệp đính kèm'

const formatMessageTime = message => {
  const value =
    message?.timestamp ?? message?.createdDate ?? message?.CreatedDate ?? message?.time
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export default function ChatPinActionNotice ({
  message,
  targetMessage = null,
  pinnedMessages = null,
  onUnpin,
  onScrollToMessage
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [openActionMenuKey, setOpenActionMenuKey] = useState(null)
  const messageType = getChatPinActionMessageType(message)
  if (!messageType) {
    return null
  }

  const label =
    messageType === UNPIN_MESSAGE_TYPE
      ? '\u0110\u00e3 b\u1ecf ghim tin nh\u1eafn'
      : '\u0110\u00e3 ghim tin nh\u1eafn'
  const isUnpinAction = messageType === UNPIN_MESSAGE_TYPE
  const Icon = isUnpinAction ? PinOff : PinIcon
  const modalTitle = 'Tin nhắn đã ghim'
  const visiblePinnedMessages = Array.isArray(pinnedMessages)
    ? pinnedMessages
    : targetMessage
    ? [targetMessage]
    : []

  const closePreview = () => {
    setOpenActionMenuKey(null)
    setIsPreviewOpen(false)
  }

  const handleJumpToMessage = targetMessageId => {
    if (!targetMessageId || typeof onScrollToMessage !== 'function') return
    closePreview()
    onScrollToMessage(targetMessageId)
  }

  const handleUnpinPinnedMessage = targetId => {
    if (!targetId || typeof onUnpin !== 'function') return

    setOpenActionMenuKey(null)
    onUnpin(targetId)
  }

  const renderPinnedMessage = (pinnedMessage, index) => {
    const content = getMessageContent(pinnedMessage)
    const files = getMessageFiles(pinnedMessage)
    const sender =
      pinnedMessage?.senderName ?? pinnedMessage?.SenderName ?? 'Không rõ người gửi'
    const time = formatMessageTime(pinnedMessage)
    const targetMessageId = getNavigableMessageId(pinnedMessage)
    const unpinTargetId = getPinnedMessageActionId(pinnedMessage)
    const canJumpToMessage = Boolean(
      targetMessageId && typeof onScrollToMessage === 'function'
    )
    const canUnpinMessage = Boolean(unpinTargetId && typeof onUnpin === 'function')
    const key = targetMessageId || `${sender}-${time}-${index}`
    const isActionMenuOpen = openActionMenuKey === key

    return (
      <div
        key={key}
        className='rounded-xl border border-gray-100 bg-gray-50 px-3 py-3'
      >
        <div className='mb-2 flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-gray-900'>
              {sender}
            </p>
            {time && <p className='text-xs text-gray-500'>{time}</p>}
          </div>
          <div className='relative shrink-0'>
            <button
              type='button'
              onClick={() => setOpenActionMenuKey(isActionMenuOpen ? null : key)}
              className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-gray-800'
              aria-label='Tùy chọn tin nhắn ghim'
            >
              <MoreHorizontal size={17} />
            </button>

            {isActionMenuOpen && (
              <>
                <button
                  type='button'
                  className='fixed inset-0 z-[10001] cursor-default'
                  aria-label='Đóng menu tùy chọn'
                  onClick={() => setOpenActionMenuKey(null)}
                />
                <div className='absolute right-0 top-full z-[10002] mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 text-sm shadow-lg'>
                  <button
                    type='button'
                    onClick={() => handleJumpToMessage(targetMessageId)}
                    disabled={!canJumpToMessage}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <ArrowUpRight size={15} className='shrink-0 text-gray-500' />
                    Đi tới
                  </button>
                  <button
                    type='button'
                    onClick={() => handleUnpinPinnedMessage(unpinTargetId)}
                    disabled={!canUnpinMessage}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <PinOff size={15} className='shrink-0 text-red-500' />
                    Bỏ ghim tin nhắn
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className='rounded-lg border border-gray-100 bg-white px-3 py-2.5'>
          {content ? (
            <p className='whitespace-pre-wrap break-words text-sm leading-5 text-gray-800'>
              {content}
            </p>
          ) : (
            <p className='text-sm italic text-gray-500'>
              Tin nhắn này không có nội dung chữ.
            </p>
          )}
        </div>

        {files.length > 0 && (
          <div className='mt-3 space-y-2'>
            <div className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
              Tệp đính kèm
            </div>
            <div className='space-y-2'>
              {files.map((file, fileIndex) => (
                <div
                  key={`${getFileName(file)}-${fileIndex}`}
                  className='truncate rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700'
                  title={getFileName(file)}
                >
                  {getFileName(file)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className='my-1.5 flex justify-center px-4'>
        <div className='inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600'>
          <Icon
            size={14}
            strokeWidth={2.2}
            className={isUnpinAction ? 'text-red-500' : 'text-blue-500'}
            fill={isUnpinAction ? 'none' : 'currentColor'}
          />
          <span className='truncate'>{label}</span>
          <button
            type='button'
            onClick={() => setIsPreviewOpen(true)}
            className='ml-1 inline-block font-semibold text-blue-500 hover:underline'
          >
            Xem tất cả
          </button>
        </div>
      </div>

      {isPreviewOpen && (
        <div
          className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4 py-6'
          onClick={closePreview}
        >
          <div
            className='w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl'
            onClick={event => event.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3'>
              <div className='flex min-w-0 items-center gap-2'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100'>
                  <PinIcon
                    size={16}
                    strokeWidth={2.2}
                    className='text-blue-500'
                    fill='currentColor'
                  />
                </div>
                <div className='min-w-0'>
                  <h3 className='truncate text-sm font-semibold text-gray-900'>
                    {modalTitle}
                  </h3>
                  <p className='truncate text-xs text-gray-500'>
                    {visiblePinnedMessages.length > 0
                      ? `${visiblePinnedMessages.length} tin nhắn đang ghim`
                      : 'Hiện không có tin nhắn đang ghim'}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={closePreview}
                className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                aria-label='Đóng'
              >
                <X size={16} />
              </button>
            </div>

            <div className='max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4'>
              {visiblePinnedMessages.length > 0 ? (
                visiblePinnedMessages.map(renderPinnedMessage)
              ) : (
                <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500'>
                  Hiện không còn tin nhắn nào đang được ghim.
                </div>
              )}
            </div>

            <div className='flex justify-end border-t border-gray-100 px-4 py-3'>
              <button
                type='button'
                onClick={closePreview}
                className='rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
