const PIN_MESSAGE_TYPE = 7
const UNPIN_MESSAGE_TYPE = 8

export const isChatPinActionMessage = message => {
  const messageType = Number(message?.messageType ?? message?.MessageType)
  return messageType === PIN_MESSAGE_TYPE || messageType === UNPIN_MESSAGE_TYPE
}

export default function ChatPinActionNotice ({
  message,
  isOwn = false,
  hasPinnedMessages = false,
  onViewAll
}) {
  const messageType = Number(message?.messageType ?? message?.MessageType)
  if (messageType !== PIN_MESSAGE_TYPE && messageType !== UNPIN_MESSAGE_TYPE) {
    return null
  }

  const senderName =
    message?.senderName || message?.SenderName || 'Một thành viên'
  const actorName = isOwn ? 'Bạn' : senderName
  const action = messageType === PIN_MESSAGE_TYPE ? 'ghim' : 'bỏ ghim'

  return (
    <div className='my-3 flex items-center justify-center gap-1 text-center text-xs text-gray-500'>
      <span>{actorName} đã {action} một tin nhắn.</span>
      {hasPinnedMessages && typeof onViewAll === 'function' && (
        <button
          type='button'
          onClick={onViewAll}
          className='font-medium text-blue-600 hover:text-blue-700 hover:underline'
        >
          Xem tất cả
        </button>
      )}
    </div>
  )
}
