export const getChatUnreadCount = chat => {
  const value =
    chat?.unreadCount ??
    chat?.UnreadCount ??
    chat?.countUnread ??
    chat?.CountUnread ??
    0
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

const normalizeValue = value => String(value ?? '').trim()
const normalizeName = value => normalizeValue(value).toLowerCase()

const getCurrentUserIds = userInfo =>
  [userInfo?.userID, userInfo?.UserID, userInfo?.id, userInfo?.ID]
    .map(normalizeValue)
    .filter(Boolean)

const getCurrentUserNames = userInfo =>
  [
    userInfo?.fullName,
    userInfo?.FullName,
    userInfo?.full_name,
    userInfo?.name,
    userInfo?.Name,
    userInfo?.userName,
    userInfo?.UserName,
    userInfo?.username,
    userInfo?.email,
    userInfo?.Email
  ]
    .map(normalizeName)
    .filter(Boolean)

const getChatIds = chat =>
  [chat?.id, chat?.ID, chat?.chatID, chat?.ChatID, chat?.userID, chat?.UserID]
    .map(normalizeValue)
    .filter(Boolean)

const getChatNames = chat =>
  [chat?.name, chat?.Name, chat?.fullName, chat?.FullName]
    .map(normalizeName)
    .filter(Boolean)

const isCurrentUserChat = (chat, userInfo) => {
  const currentIds = getCurrentUserIds(userInfo)
  const currentNames = getCurrentUserNames(userInfo)

  return (
    getChatIds(chat).some(id => currentIds.includes(id)) ||
    getChatNames(chat).some(name => currentNames.includes(name))
  )
}

const getChatUniqueKey = chat =>
  normalizeName(chat?.name ?? chat?.Name) ||
  normalizeValue(chat?.id ?? chat?.ID ?? chat?.chatID ?? chat?.ChatID ?? chat?.userID ?? chat?.UserID)

const getChatTimestamp = chat => {
  const timestamp =
    chat?.lastMessageDate ??
    chat?.LastMessageDate ??
    chat?.lastMessageTime ??
    chat?.LastMessageTime ??
    chat?.updatedAt ??
    chat?.UpdatedAt ??
    chat?.createdDate ??
    chat?.CreatedDate ??
    0
  const time = new Date(timestamp).getTime()
  return Number.isFinite(time) ? time : 0
}

export const getUniqueUnreadChats = (
  chats = [],
  { userInfo = null, excludeCurrentUser = false } = {}
) => {
  const uniqueChats = new Map()

  ;(Array.isArray(chats) ? chats : []).forEach(chat => {
    if (!chat) return
    if (excludeCurrentUser && isCurrentUserChat(chat, userInfo)) return

    const key = getChatUniqueKey(chat)
    if (!key) return

    const current = uniqueChats.get(key)
    if (!current || getChatTimestamp(chat) > getChatTimestamp(current)) {
      uniqueChats.set(key, chat)
    }
  })

  return Array.from(uniqueChats.values())
}

export const sumUniqueChatUnreadCount = (chats = [], options = {}) =>
  getUniqueUnreadChats(chats, options).reduce(
    (total, chat) => total + getChatUnreadCount(chat),
    0
  )