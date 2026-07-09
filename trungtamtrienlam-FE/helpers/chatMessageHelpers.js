export const normalizeChatIdentity = value => {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

export const getCurrentUserIdentities = userInfo => {
  if (!userInfo) return []

  return [
    userInfo.userID,
    userInfo.UserID,
    userInfo.id,
    userInfo.ID,
    userInfo.username,
    userInfo.userName,
    userInfo.email,
    userInfo.Email,
    userInfo.fullName,
    userInfo.FullName,
    userInfo.name,
    userInfo.Name
  ]
    .map(normalizeChatIdentity)
    .filter(Boolean)
}

export const isCurrentUserMessage = (messageOrSenderId, userInfo) => {
  const message =
    typeof messageOrSenderId === 'object' && messageOrSenderId !== null
      ? messageOrSenderId
      : { senderID: messageOrSenderId }

  if (message?.sender === 'me' || message?.isMe) return true

  const identities = getCurrentUserIdentities(userInfo)
  if (!identities.length) return false

  return [
    message?.senderID,
    message?.SenderID,
    message?.senderId,
    message?.fromUserID,
    message?.FromUserID,
    message?.userID,
    message?.UserID,
    message?.createdBy,
    message?.CreatedBy,
    message?.senderName,
    message?.SenderName,
    message?.sender
  ]
    .map(normalizeChatIdentity)
    .some(value => value && identities.includes(value))
}
