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

export default function ChatPinActionNotice ({
  message
}) {
  const messageType = getChatPinActionMessageType(message)
  if (!messageType) {
    return null
  }

  const label =
    messageType === UNPIN_MESSAGE_TYPE
      ? '\u0110\u00e3 b\u1ecf ghim tin nh\u1eafn'
      : '\u0110\u00e3 ghim tin nh\u1eafn'

  return (
    <div className='my-4 flex items-center px-4'>
      <div className='flex-grow border-t border-gray-300'></div>
      <div className='mx-4 flex items-center'>
        <span className='text-xs font-medium text-gray-500'>{label}</span>
      </div>
      <div className='flex-grow border-t border-gray-300'></div>
    </div>
  )
}
