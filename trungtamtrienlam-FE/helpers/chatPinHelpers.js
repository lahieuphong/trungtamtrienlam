export const getChatPinDate = chat =>
  chat?.pinDate ||
  chat?.PinDate ||
  chat?.pinnedAt ||
  chat?.PinnedAt ||
  chat?.pinnedDate ||
  chat?.PinnedDate ||
  chat?.pinAt ||
  chat?.PinAt ||
  ''

export const isChatPinned = chat =>
  Boolean(
    getChatPinDate(chat) ||
      chat?.isPin === true ||
      chat?.IsPin === true ||
      chat?.isPinned === true ||
      chat?.IsPinned === true
  )

export const getChatIdentity = chat =>
  chat?.id ?? chat?.ID ?? chat?.chatID ?? chat?.ChatID ?? ''

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
