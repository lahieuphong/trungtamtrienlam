const CHAT_PIN_STORAGE_KEY = 'trungtamtrienlam:pinned-chats:v1'

const canUseStorage = () => typeof window !== 'undefined' && window.localStorage

const normalizeChatId = value => String(value ?? '').trim()

export const getChatIdentity = chat =>
  chat?.id ?? chat?.ID ?? chat?.chatID ?? chat?.ChatID ?? ''

const getStoredPinMap = () => {
  if (!canUseStorage()) return {}

  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_PIN_STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

const saveStoredPinMap = pinMap => {
  if (!canUseStorage()) return

  const entries = Object.entries(pinMap || {}).filter(
    ([chatId, pinDate]) => normalizeChatId(chatId) && pinDate
  )

  if (entries.length === 0) {
    localStorage.removeItem(CHAT_PIN_STORAGE_KEY)
    return
  }

  localStorage.setItem(CHAT_PIN_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
}

const getStoredPinDateById = chatId => {
  const targetId = normalizeChatId(chatId)
  if (!targetId) return ''

  return getStoredPinMap()[targetId] || ''
}

export const setStoredChatPinDate = (chatId, pinDate, dispatchEvent = true) => {
  const targetId = normalizeChatId(chatId)
  if (!targetId || !canUseStorage()) return

  const pinMap = getStoredPinMap()
  if (pinDate) {
    pinMap[targetId] = pinDate
  } else {
    delete pinMap[targetId]
  }
  saveStoredPinMap(pinMap)

  if (dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent('chatPinChanged', {
        detail: { chatId: targetId, pinDate: pinDate || null }
      })
    )
  }
}

const PIN_DATE_FIELDS = [
  'pinDate',
  'PinDate',
  'pinnedAt',
  'PinnedAt',
  'pinnedDate',
  'PinnedDate',
  'pinAt',
  'PinAt'
]

const getServerChatPinDate = chat => {
  if (!chat) return null

  const pinDateField = PIN_DATE_FIELDS.find(field =>
    Object.prototype.hasOwnProperty.call(chat, field)
  )

  return pinDateField ? chat[pinDateField] || '' : null
}

const hasServerPinFlag = chat =>
  chat?.isPin === true ||
  chat?.IsPin === true ||
  chat?.isPinned === true ||
  chat?.IsPinned === true

const getFallbackPinDate = chat =>
  chat?.lastMessageDate ||
  chat?.LastMessageDate ||
  chat?.lastMessageTime ||
  chat?.LastMessageTime ||
  chat?.updatedAt ||
  chat?.UpdatedAt ||
  chat?.createdDate ||
  chat?.CreatedDate ||
  new Date().toISOString()

export const getChatPinDate = chat => {
  const serverPinDate = getServerChatPinDate(chat)
  if (serverPinDate !== null) return serverPinDate

  const storedPinDate = getStoredPinDateById(getChatIdentity(chat))
  if (storedPinDate) return storedPinDate

  return ''
}

export const isChatPinned = chat =>
  Boolean(getChatPinDate(chat) || hasServerPinFlag(chat))

export const getNextChatPinDate = chat =>
  isChatPinned(chat) ? null : new Date().toISOString()

export const applyChatPinState = (chat, pinDate) => {
  const pinned = Boolean(pinDate)

  return {
    ...chat,
    pinDate,
    PinDate: pinDate,
    isPin: pinned,
    IsPin: pinned,
    isPinned: pinned,
    IsPinned: pinned
  }
}

export const hydrateChatPinState = chat => {
  if (!chat) return chat

  const chatId = getChatIdentity(chat)
  const pinDate = getChatPinDate(chat)
  if (pinDate) return applyChatPinState(chat, pinDate)

  if (hasServerPinFlag(chat)) {
    const fallbackPinDate = getFallbackPinDate(chat)
    setStoredChatPinDate(chatId, fallbackPinDate, false)
    return applyChatPinState(chat, fallbackPinDate)
  }

  return chat
}
