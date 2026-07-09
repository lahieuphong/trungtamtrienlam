export const getUserIdentity = userInfo => {
  if (!userInfo) return ''

  return String(
    userInfo.userID ??
      userInfo.UserID ??
      userInfo.id ??
      userInfo.ID ??
      ''
  ).trim()
}

export const normalizeReminderUserList = value => {
  if (value === null || value === undefined) return []

  if (Array.isArray(value)) {
    return value
      .flatMap(normalizeReminderUserList)
      .map(item => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      return normalizeReminderUserList(JSON.parse(trimmed))
    } catch {
      return trimmed
        .split(',')
        .map(item => item.trim().replace(/^[\[{"]+|[\]}"]+$/g, ''))
        .filter(Boolean)
    }
  }

  if (typeof value === 'object') {
    const candidates =
      value.userIDs ??
      value.UserIDs ??
      value.userIds ??
      value.UserIds ??
      value.users ??
      value.Users ??
      value.id ??
      value.ID ??
      value.userID ??
      value.UserID

    if (candidates !== undefined) {
      return normalizeReminderUserList(candidates)
    }

    return Object.values(value).flatMap(normalizeReminderUserList)
  }

  return [String(value).trim()].filter(Boolean)
}

export const isReminderForUser = (reminderUsers, userInfo) => {
  const currentUserID = getUserIdentity(userInfo)
  if (!currentUserID) return false

  return normalizeReminderUserList(reminderUsers).includes(currentUserID)
}
