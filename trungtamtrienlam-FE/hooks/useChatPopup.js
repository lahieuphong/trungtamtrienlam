'use client'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react'
import {
  loadMes,
  sendMessage as sendMessageApi,
  sendMessageAI,
  getListUserByChatID,
  getPollsByChatID,
  votePoll,
  getRemindersByChatID,
  editReminder,
  confirmJoinReminder,
  createNote,
  updateNote,
  createPoll,
  createReminder,
  recallMessage,
  markMessageAsSeen,
  pinMessage,
  unpinMessage,
  createOptionsPoll,
  loadUserRequest,
  acceptUserRequest
} from '@/lib/api/chatsApi'
import { fetchUsersDropdownForChats } from '@/lib/api/dropdownApi'
import { useSignalR } from '@/contexts/SignalRContext'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { useToast } from '@/contexts/ToastContext'
import {
  ChatAwaitConfirmConstants,
  ChatConstants,
  ChatMessageConstants
} from '@/constants/chatConstants'
import { parseTextToParts } from '@/helpers/stringHelpers'
import { normalizeChatFiles } from '@/helpers/chatFileHelpers'

const POPUP_MESSAGE_PAGE_SIZE = 30
const OLDER_MESSAGES_SPINNER_MIN_MS = 250

const dispatchChatListRefresh = chatId => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('chatListShouldRefresh', {
      detail: { chatId }
    })
  )
}

const getSendChatResultPayload = response => {
  let payload = response?.data ?? response
  let guard = 0

  while (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'data') &&
    guard < 4
  ) {
    const hasResultFields = Boolean(
      payload.chatID ||
        payload.chatId ||
        payload.ChatID ||
        payload.id ||
        payload.ID ||
        payload.message ||
        payload.Message ||
        payload.messageID ||
        payload.messageId
    )
    if (hasResultFields) break
    payload = payload.data
    guard += 1
  }

  return payload
}

const getSendChatId = (response, fallback = '') => {
  const payload = getSendChatResultPayload(response)
  if (payload && typeof payload === 'object') {
    return String(
      payload.chatID ??
        payload.chatId ??
        payload.ChatID ??
        payload.id ??
        payload.ID ??
        fallback ??
        ''
    ).trim()
  }
  return String(payload || fallback || '').trim()
}

const normalizeChatIdentity = value => {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

const getCurrentUserIdentities = userInfo => {
  if (!userInfo) return []

  return [
    userInfo.userID,
    userInfo.UserID,
    userInfo.id,
    userInfo.ID,
    userInfo.username,
    userInfo.userName,
    userInfo.email,
    userInfo.Email
  ]
    .map(normalizeChatIdentity)
    .filter(Boolean)
}

const getStoredUserInfo = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('userInfo')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const getCurrentUserId = userInfo => {
  const source = userInfo || getStoredUserInfo()

  return (
    [
      source?.userID,
      source?.UserID,
      source?.id,
      source?.ID
    ]
      .map(value =>
        value === null || value === undefined ? '' : String(value).trim()
      )
      .find(Boolean) || ''
  )
}

const isCurrentUserMessage = (senderId, userInfo) => {
  const sender = normalizeChatIdentity(senderId)
  return Boolean(sender && getCurrentUserIdentities(userInfo).includes(sender))
}

/* ---------- Helpers ---------- */
const safeParseJSON = (v, fallback) => {
  if (!v) return fallback
  if (Array.isArray(v) || typeof v === 'object') return v
  try {
    return JSON.parse(v)
  } catch {
    return fallback
  }
}

const safeParseFiles = jsonString => {
  if (!jsonString) return []
  if (Array.isArray(jsonString)) return jsonString
  if (typeof jsonString !== 'string') return []

  try {
    const parsed = JSON.parse(jsonString)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return [parsed]
    return []
  } catch (e) {
    try {
      const files = []
      const idMatches = jsonString.match(/\"ID\":\"([^\"]+)\"/g)
      const fileNameMatches = jsonString.match(/\"FileName\":\"([^\"]+)\"/g)
      const fileMatches = jsonString.match(/\"File\":\"([^\"]+)\"/g)
      const extensionMatches = jsonString.match(/\"Extension\":\"([^\"]+)\"/g)

      if (idMatches && fileNameMatches) {
        for (
          let i = 0;
          i < Math.min(idMatches.length, fileNameMatches.length);
          i++
        ) {
          const idMatch = idMatches[i].match(/\"ID\":\"([^\"]+)\"/)
          const fileNameMatch = fileNameMatches[i].match(
            /\"FileName\":\"([^\"]+)\"/
          )
          const fileMatch =
            fileMatches && i < fileMatches.length
              ? fileMatches[i].match(/\"File\":\"([^\"]+)\"/)
              : null
          const extensionMatch =
            extensionMatches && i < extensionMatches.length
              ? extensionMatches[i].match(/\"Extension\":\"([^\"]+)\"/)
              : null

          if (idMatch && fileNameMatch) {
            files.push({
              ID: idMatch[1],
              FileName: fileNameMatch[1],
              File: fileMatch ? fileMatch[1] : '',
              Extension: extensionMatch ? extensionMatch[1] : '',
              Size: '0'
            })
          }
        }
      }
      return files
    } catch (regexError) {
      console.error('Không thể trích xuất thông tin file:', regexError)
      return []
    }
  }
}

const safeParseSeenBy = jsonString => {
  if (!jsonString) return []
  if (Array.isArray(jsonString)) return jsonString
  if (typeof jsonString !== 'string') return []

  try {
    // Thử parse bình thường
    const parsed = JSON.parse(jsonString)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return [parsed]
    return []
  } catch (e) {
    try {
      const seenByArray = []
      // Regex để tìm ID, UserID và Avatar
      const idMatches = jsonString.match(/\"ID\":\"([^\"]+)\"/g)
      const userIDMatches = jsonString.match(/\"UserID\":\"([^\"]+)\"/g)
      const avatarMatches = jsonString.match(/\"Avatar\":\"([^\"]+)\"/g)

      if (idMatches && userIDMatches && avatarMatches) {
        for (
          let i = 0;
          i <
          Math.min(
            idMatches.length,
            userIDMatches.length,
            avatarMatches.length
          );
          i++
        ) {
          const idMatch = idMatches[i].match(/\"ID\":\"([^\"]+)\"/)
          const userIDMatch = userIDMatches[i].match(/\"UserID\":\"([^\"]+)\"/)
          const avatarMatch =
            avatarMatches && i < avatarMatches.length
              ? avatarMatches[i].match(/\"Avatar\":\"([^\"]+)\"/)
              : null

          if (idMatch && userIDMatch && avatarMatch) {
            seenByArray.push({
              ID: idMatch[1],
              UserID: userIDMatch[1],
              Avatar: avatarMatch[1]
            })
          }
        }
      }
      return seenByArray
    } catch (regexError) {
      console.error('Không thể trích xuất thông tin seenBy:', regexError)
      return []
    }
  }
}

const normalizeSeenUser = user => {
  const id = user?.id ?? user?.ID ?? user?.userID ?? user?.UserID ?? ''
  const userID = user?.userID ?? user?.UserID ?? user?.id ?? user?.ID ?? ''
  const avatar =
    user?.avatar ?? user?.Avatar ?? user?.senderAvatar ?? user?.SenderAvatar ?? ''
  const fullName =
    user?.fullName ??
    user?.FullName ??
    user?.name ??
    user?.Name ??
    user?.userName ??
    user?.UserName ??
    ''

  return {
    ...user,
    id,
    ID: id,
    userID,
    UserID: userID,
    avatar,
    Avatar: avatar,
    fullName,
    FullName: fullName,
    name: user?.name ?? user?.Name ?? fullName,
    Name: user?.Name ?? user?.name ?? fullName
  }
}

const normalizeSeenUsers = seenBy =>
  safeParseSeenBy(seenBy)
    .map(normalizeSeenUser)
    .filter(user => user.userID || user.id)

const getRawMessages = response => {
  const payload = response?.data?.data || {}
  const messages = payload.dataChatMessage

  if (Array.isArray(messages)) return messages
  if (Array.isArray(messages?.data)) return messages.data
  if (Array.isArray(messages?.items)) return messages.items
  if (Array.isArray(messages?.records)) return messages.records

  return []
}

const getTotalMessages = response => {
  const payload = response?.data?.data || {}
  const messages = payload.dataChatMessage

  return (
    payload.totalCount ??
    payload.totalRecords ??
    payload.totalItems ??
    payload.totalItem ??
    messages?.totalCount ??
    messages?.totalRecords ??
    messages?.totalItems ??
    messages?.totalItem ??
    null
  )
}

const sortMessagesByTime = list =>
  [...list].sort(
    (a, b) =>
      new Date(a.timestamp || a.createdDate || 0) -
      new Date(b.timestamp || b.createdDate || 0)
  )

const withReplyInfo = list => {
  const byId = new Map(list.map(message => [message.id, message]))

  return list.map(message => {
    if (!message.replyToID) return message

    const parent = byId.get(message.replyToID)
    if (!parent) return message

    return {
      ...message,
      replyToMessage: {
        id: parent.id,
        content: parent.content,
        sender: parent.sender,
        senderName: parent.senderName,
        files: parent.files
      }
    }
  })
}

const getMessageClientTempId = message =>
  message?.clientTempId || message?.ClientTempID || message?.clientTempID || ''

const mergeMessages = (...messageGroups) => {
  const byId = new Map()

  messageGroups.flat().forEach(message => {
    if (!message?.id) return

    const clientTempId = getMessageClientTempId(message)
    const matchingKey = clientTempId
      ? Array.from(byId.entries()).find(
          ([, item]) => getMessageClientTempId(item) === clientTempId
        )?.[0]
      : null

    const key = matchingKey || message.id
    const merged = { ...(byId.get(key) || {}), ...message }

    if (matchingKey && matchingKey !== message.id && !String(message.id).startsWith('tmp-')) {
      byId.delete(matchingKey)
      byId.set(message.id, merged)
      return
    }

    byId.set(key, merged)
  })

  return withReplyInfo(sortMessagesByTime(Array.from(byId.values())))
}

export function useChatMessages (chatId, userId, chatType, chat) {
  const { userInfo } = useLoadLocalStorage()
  const { registerChatCallback, onlineUsers, isConnected } = useSignalR()
  const toast = useToast()
  const currentUserID = useMemo(() => getCurrentUserId(userInfo), [
    userInfo?.userID,
    userInfo?.UserID,
    userInfo?.id,
    userInfo?.ID
  ])

  const [isLoading, setIsLoading] = useState(() => Boolean(chatId || userId))
  const [isSending, setIsSending] = useState(false)
  const [isChatsAI, setIsChatsAI] = useState(false)
  const [messages, setMessages] = useState([])
  const [attachedFiles, setAttachedFiles] = useState([])
  const [replyToMessage, setReplyToMessage] = useState(null)
  const [ListUsers, setListUsers] = useState([])
  const [polls, setPolls] = useState([])
  const [reminders, setReminders] = useState([])
  const [userRequests, setUserRequests] = useState([])
  const [individualUsersList, setIndividualUsersList] = useState([])
  const [sortDelay, setSortDelay] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentChatId, setCurrentChatId] = useState(chatId)
  const [messagePage, setMessagePage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const messageListRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messageHistoryRef = useRef([])
  const isMessageHistoryCompleteRef = useRef(false)
  const isLoadingOlderRef = useRef(false)
  const seenMessagesRef = useRef(new Set())
  const debounceTimerRef = useRef(null)
  const effectiveId = currentChatId || chatId || userId || chat?.chatID || chat?.ChatID || chat?.id || chat?.ID || ''
  const isGroup = (chatType || chat?.type) === 'group'
  const isAIChat = useMemo(() => {
    return !!(isChatsAI || chat?.isAI || effectiveId === 'heritage-assistant')
  }, [isChatsAI, chat?.isAI, effectiveId])

  const loadIndividualUsersList = useCallback(async () => {
    try {
      const res = await fetchUsersDropdownForChats()
      const users = res?.data?.data?.users || []
      if (!Array.isArray(users)) {
        console.warn('Users data is not an array:', users)
        setIndividualUsersList([])
        return []
      }

      const individualChats = users.map(user => ({
        id: user.id,
        name: user.fullName,
        avatar: user.avatar,
        role: user.roleName,
        department: user.departmentName
      }))
      setIndividualUsersList(individualChats)
      return individualChats
    } catch (error) {
      console.warn('Error loading individual users list:', error)
      setIndividualUsersList([])
      return []
    }
  }, [])

  useEffect(() => {
    if (sortDelay > 0) {
      const timer = setTimeout(() => {
        setSortDelay(0)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [sortDelay])

  useEffect(() => {
    if (isGroup && individualUsersList.length === 0) {
      loadIndividualUsersList()
    }
  }, [isGroup, loadIndividualUsersList])

  useEffect(() => {
    if (typeof window !== 'undefined' && effectiveId) {
      const storedUnreadCount = parseInt(
        localStorage.getItem(`unreadCount_${effectiveId}`) || '0'
      )
      setUnreadCount(storedUnreadCount)
    }
  }, [effectiveId])

  useEffect(() => {
    const handleUnreadCountChange = event => {
      if (event.detail && event.detail.chatId === effectiveId) {
        setUnreadCount(event.detail.count)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('unreadCountChanged', handleUnreadCountChange)
      return () => {
        window.removeEventListener(
          'unreadCountChanged',
          handleUnreadCountChange
        )
      }
    }
  }, [effectiveId])

  const scrollToBottom = useCallback(() => {
    const box = messageListRef.current
    if (!box) return
    setTimeout(() => {
      requestAnimationFrame(() => {
        box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
      })
    }, 40)
  }, [])

  const scrollToBottomInstantly = useCallback(() => {
    const scrollToLatestMessage = () => {
      const box = messageListRef.current
      if (!box) return

      const previousScrollBehavior = box.style.scrollBehavior
      box.style.scrollBehavior = 'auto'
      box.scrollTop = box.scrollHeight
      box.style.scrollBehavior = previousScrollBehavior
    }

    scrollToLatestMessage()
    requestAnimationFrame(scrollToLatestMessage)
    setTimeout(scrollToLatestMessage, 80)
  }, [])

  const isAtBottom = useCallback(() => {
    const box = messageListRef.current
    if (!box) return false
    return box.scrollHeight - box.scrollTop - box.clientHeight < 100
  }, [])

  const normalizeIncomingMessage = useCallback(
    msg => {
      if (!msg) return null

      const files = msg.chatFiles
        ? normalizeChatFiles(safeParseFiles(msg.chatFiles))
        : Array.isArray(msg.files)
        ? normalizeChatFiles(msg.files)
        : []

      const seenBy = normalizeSeenUsers(msg.seenBy)
      const clientTempId = getMessageClientTempId(msg)

      return {
        ...msg,
        id: msg.id || msg.ID || clientTempId,
        clientTempId,
        ClientTempID: clientTempId,
        content: msg.content ?? msg.Content ?? '',
        message: msg.messageType ?? msg.MessageType,
        messageType: msg.messageType ?? msg.MessageType,
        sender: isCurrentUserMessage(msg.senderID ?? msg.SenderID, userInfo)
          ? 'me'
          : 'other',
        senderID: msg.senderID ?? msg.SenderID,
        timestamp:
          msg.createdDate || msg.CreatedDate || msg.timestamp || new Date(),
        createdDate:
          msg.createdDate || msg.CreatedDate || msg.timestamp || new Date(),
        avatar: msg.avatar || msg.Avatar || msg.senderAvatar || msg.SenderAvatar,
        senderName: msg.senderName || msg.SenderName,
        files,
        chatLinks: msg.chatLinks || msg.ChatLinks || '',
        isUnsend: msg.isUnsend || msg.IsUnsend || false,
        eventID: msg.eventID || msg.EventID || null,
        eventType: msg.eventType ?? msg.EventType ?? null,
        isPin: msg.isPin || msg.IsPin || false,
        NotePin: msg.notePin || msg.NotePin || false,
        seenBy,
        ListUserJoinReminder:
          msg.listUserJoinRemind || msg.ListUserJoinReminder || [],
        replyToID: msg.replyToID || msg.ReplyToID || null,
        replyToMessage: msg.replyToMessage
      }
    },
    [userInfo]
  )

  const upsertMessage = useCallback(
    (incomingMessage, { scroll = false, instant = false } = {}) => {
      const nextMessage = normalizeIncomingMessage(incomingMessage)
      if (!nextMessage?.id) return

      setMessages(prev => {
        const next = mergeMessages(prev, [nextMessage])
        messageHistoryRef.current = mergeMessages(
          messageHistoryRef.current,
          [nextMessage]
        )
        return next
      })

      if (scroll) {
        if (instant) {
          scrollToBottomInstantly()
        } else {
          setTimeout(scrollToBottom, 40)
        }
      }
    },
    [normalizeIncomingMessage, scrollToBottom, scrollToBottomInstantly]
  )

  const loadGroupMembers = useCallback(async () => {
    if (!isGroup || !effectiveId) {
      return
    }
    try {
      const users = await getListUserByChatID(effectiveId, currentUserID)
      const userData = users?.data?.data || []
      setListUsers(userData)
    } catch (e) {
      console.error('❌ Error in loadGroupMembers:', e)
      setListUsers([])
    }
  }, [isGroup, effectiveId, currentUserID])

  const loadPollsByChatID = useCallback(async id => {
    try {
      if (!id) return
      const res = await getPollsByChatID(id)
      setPolls(res?.data?.data || [])
    } catch {
      setPolls([])
    }
  }, [])

  const loadRemindersByChatID = useCallback(async id => {
    try {
      if (!id) return
      const res = await getRemindersByChatID(id)
      setReminders(res?.data?.data || [])
    } catch {
      setReminders([])
    }
  }, [])

  const loadUserRequestsByChatID = useCallback(
    async (id, usersList = null) => {
      try {
        if (!id || !isGroup) return
        const res = await loadUserRequest(id)
        const requests = res?.data?.data || []
        const currentIndividualUsersList = usersList || individualUsersList

        const enrichedRequests = requests.map(request => {
          const userInfo =
            currentIndividualUsersList.find(
              user => user.id === request.userID || user.id === request.createdBy
            ) ||
            {
              name:
                request.senderName ||
                request.fullName ||
                request.name ||
                'Ng\u01b0\u1eddi d\u00f9ng kh\u00f4ng x\u00e1c \u0111\u1ecbnh',
              avatar: request.senderAvatar || request.avatar || '',
              role: request.senderRole || request.role || '',
              department: request.senderDepartment || request.department || ''
            }

          return {
            ...request,
            senderName: userInfo?.name || 'Người dùng không xác định',
            senderAvatar: userInfo?.avatar || '',
            senderRole: userInfo?.role || '',
            senderDepartment: userInfo?.department || ''
          }
        })

        setUserRequests(enrichedRequests)
      } catch (error) {
        console.warn('Error loading user requests:', error)
        setUserRequests([])
      }
    },
    [isGroup]
  )

  const normalizeMessages = useCallback(
    rawMsgs => {
      const mapped = rawMsgs.map(m => {
        const files = normalizeChatFiles(safeParseFiles(m.chatFiles))
        const seenBy = normalizeSeenUsers(m.seenBy)

        return {
          id: m.id,
          content: m.content,
          timestamp: m.createdDate,
          messageType: m.messageType,
          sender: isCurrentUserMessage(m.senderID, userInfo) ? 'me' : 'other',
          avatar: m.senderAvatar,
          senderName: m.senderName,
          senderID: m.senderID,
          files,
          chatLinks: m.chatLinks || m.ChatLinks || '',
          isUnsend: m.isUnsend || false,
          eventID: m.eventID || null,
          eventType: m.eventType || null,
          isPin: m.isPin || false,
          NotePin: m.notePin || false,
          replyToID: m.replyToID || null,
          replyToMessage: undefined,
          seenBy,
          ListUserJoinReminder: m.listUserJoinRemind || []
        }
      })

      return withReplyInfo(sortMessagesByTime(mapped))
    },
    [userInfo]
  )

  /* -------- load messages -------- */
  const loadMessages = useCallback(
    async (id, options = {}) => {
      if (!id) return

      const {
        page = 1,
        prepend = false,
        loadMeta = page === 1,
        scrollToBottomAfterLoad = !prepend,
        silent = false
      } = options
      const box = messageListRef.current
      const previousScrollHeight = box?.scrollHeight || 0
      const previousScrollTop = box?.scrollTop || 0

      if (prepend) {
        if (isLoadingOlderRef.current) return
        isLoadingOlderRef.current = true
        setIsLoadingOlder(true)
      } else if (!silent) {
        setIsLoading(true)
      }

      try {
        const loadingStartedAt = Date.now()
        let res = null
        let nextMessages = []

        if (page === 1) {
          res = await loadMes(id, {
            page: 1,
            pageSize: POPUP_MESSAGE_PAGE_SIZE,
            currentUserID
          })
          setIsChatsAI(!!res?.data?.data?.dataChat?.isAI)

          const allMessages = normalizeMessages(getRawMessages(res))
          const totalMessages = Number(getTotalMessages(res))
          const hasTotalMessages = Number.isFinite(totalMessages)

          if (hasTotalMessages) {
            messageHistoryRef.current = []
            isMessageHistoryCompleteRef.current = false
            nextMessages = allMessages
            setHasMoreMessages(POPUP_MESSAGE_PAGE_SIZE < totalMessages)
          } else {
            messageHistoryRef.current = allMessages
            isMessageHistoryCompleteRef.current = true

            const startIndex = Math.max(
              allMessages.length - POPUP_MESSAGE_PAGE_SIZE,
              0
            )
            nextMessages = allMessages.slice(startIndex)
            setHasMoreMessages(startIndex > 0)
          }

          setMessagePage(1)
          setMessages(nextMessages)
        } else if (
          isMessageHistoryCompleteRef.current &&
          messageHistoryRef.current.length > 0
        ) {
          const loadedCount = Math.min(
            messageHistoryRef.current.length,
            page * POPUP_MESSAGE_PAGE_SIZE
          )
          const startIndex = Math.max(
            messageHistoryRef.current.length - loadedCount,
            0
          )

          nextMessages = messageHistoryRef.current.slice(startIndex)

          setHasMoreMessages(startIndex > 0)
          setMessagePage(page)
          setMessages(prev => mergeMessages(nextMessages, prev))
        } else {
          res = await loadMes(id, {
            page,
            pageSize: POPUP_MESSAGE_PAGE_SIZE,
            currentUserID
          })
          setIsChatsAI(!!res?.data?.data?.dataChat?.isAI)

          const responseMessages = getRawMessages(res)
          nextMessages = normalizeMessages(responseMessages)
          const totalMessages = Number(getTotalMessages(res))
          const hasTotalMessages = Number.isFinite(totalMessages)

          setHasMoreMessages(
            hasTotalMessages
              ? page * POPUP_MESSAGE_PAGE_SIZE < totalMessages
              : responseMessages.length >= POPUP_MESSAGE_PAGE_SIZE
          )
          setMessagePage(page)
          setMessages(prev =>
            prepend ? mergeMessages(nextMessages, prev) : nextMessages
          )
        }

        if (loadMeta) {
          await Promise.allSettled([
            isGroup ? loadGroupMembers() : Promise.resolve(),
            loadPollsByChatID(id),
            loadRemindersByChatID(id)
          ])

          if (isGroup) {
            let usersList = individualUsersList
            if (individualUsersList.length === 0) {
              usersList = await loadIndividualUsersList()
            }
            await loadUserRequestsByChatID(id, usersList)
          }
        }

        if (prepend) {
          const elapsed = Date.now() - loadingStartedAt
          if (elapsed < OLDER_MESSAGES_SPINNER_MIN_MS) {
            await new Promise(resolve =>
              setTimeout(resolve, OLDER_MESSAGES_SPINNER_MIN_MS - elapsed)
            )
          }

          requestAnimationFrame(() => {
            const currentBox = messageListRef.current
            if (!currentBox) return
            currentBox.scrollTop =
              currentBox.scrollHeight - previousScrollHeight + previousScrollTop
          })
        } else if (scrollToBottomAfterLoad) {
          setTimeout(scrollToBottomInstantly, 0)
        }
      } finally {
        if (prepend) {
          isLoadingOlderRef.current = false
          setIsLoadingOlder(false)
        } else if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [
      isGroup,
      individualUsersList,
      loadGroupMembers,
      loadIndividualUsersList,
      loadPollsByChatID,
      loadRemindersByChatID,
      loadUserRequestsByChatID,
      normalizeMessages,
      scrollToBottomInstantly,
      currentUserID
    ]
  )

  const loadOlderMessages = useCallback(() => {
    const activeChatId = currentChatId || chatId || userId
    if (!activeChatId || isLoadingOlder || !hasMoreMessages) return null

    return loadMessages(activeChatId, {
      page: messagePage + 1,
      prepend: true,
      loadMeta: false,
      scrollToBottomAfterLoad: false
    })
  }, [
    currentChatId,
    chatId,
    userId,
    isLoadingOlder,
    hasMoreMessages,
    loadMessages,
    messagePage
  ])

  useEffect(() => {
    if (isConnected || !effectiveId) return

    let isPolling = false
    const pollMessages = async () => {
      const activeChatId = currentChatId || chatId || userId || effectiveId
      if (!activeChatId || isPolling) return
      if (typeof document !== 'undefined' && document.hidden) return

      isPolling = true
      try {
        await loadMessages(activeChatId, {
          loadMeta: false,
          silent: true,
          scrollToBottomAfterLoad: isAtBottom()
        })
      } finally {
        isPolling = false
      }
    }

    const timer = setInterval(pollMessages, 800)
    pollMessages()
    return () => clearInterval(timer)
  }, [
    isConnected,
    effectiveId,
    currentChatId,
    chatId,
    userId,
    loadMessages,
    isAtBottom
  ])

  // SignalR callback to listen for new messages and updates
  useEffect(() => {
    if (!registerChatCallback || !effectiveId) return

    const unregister = registerChatCallback(msg => {
      // Only process messages for current chat
      if (msg.chatID !== effectiveId) return

      if (msg.isSeenUpdate || msg.IsSeenUpdate) {
        console.log('[chat-seen:realtime-popup-received]', {
          effectiveId,
          messageId: msg?.id,
          seenBy: msg?.seenBy,
          msg
        })
        setMessages(prev => {
          const incomingTempId = getMessageClientTempId(msg)
          const idx = prev.findIndex(c =>
            c.id === msg.id ||
            (incomingTempId && getMessageClientTempId(c) === incomingTempId)
          )
          if (idx === -1) {
            console.log('[chat-seen:realtime-popup-miss]', {
              messageId: msg?.id,
              currentMessageIds: prev.map(item => item.id)
            })
            return prev
          }

          const next = [...prev]
          next[idx] = { ...next[idx], ...msg }
          console.log('[chat-seen:realtime-popup-merged]', {
            messageId: msg?.id,
            beforeSeenBy: prev[idx]?.seenBy,
            incomingSeenBy: msg?.seenBy,
            afterSeenBy: next[idx]?.seenBy
          })
          messageHistoryRef.current = mergeMessages(
            messageHistoryRef.current,
            [next[idx]]
          )
          return next
        })
        return
      }

      // Handle polls updates (eventType 2 = poll)
      if (
        msg.eventType === 2 &&
        msg.content &&
        msg.content.toLowerCase().includes('tạo bình chọn')
      ) {
        loadPollsByChatID(effectiveId)
        loadMessages(effectiveId)
        return // Don't process as regular message since we're reloading all
      }

      // Handle notes updates
      if (msg.content && msg.content.toLowerCase().includes('ghi chú')) {
        loadMessages(effectiveId)
        return // Don't process as regular message since we're reloading all
      }

      // Handle reminders updates (eventType 3 = reminder)
      if (
        msg.eventType === 3 &&
        msg.content &&
        msg.content.toLowerCase().includes('nhắc hẹn')
      ) {
        loadRemindersByChatID(effectiveId)
        loadMessages(effectiveId)
        return // Don't process as regular message since we're reloading all
      }

      if (
        msg.messageType === 6 ||
        msg.messageType === 7 ||
        msg.messageType === 5 ||
        msg.messageType === 8 ||
        msg.messageType === 10
      ) {
        loadMessages(effectiveId)
      }

      // Handle regular messages
      if (msg.messageType !== 5) {
        upsertMessage(
          { ...msg, isPending: false },
          { scroll: true, instant: false }
        )
      }
    })

    return unregister
  }, [
    registerChatCallback,
    effectiveId,
    loadPollsByChatID,
    loadRemindersByChatID,
    loadMessages,
    upsertMessage,
    currentUserID
  ])

  useEffect(() => {
    if (!effectiveId) return
    if (currentChatId || chatId) {
      loadMessages(currentChatId || chatId)
    } else if (userId) {
      loadMessages(userId)
    }
  }, [effectiveId, currentChatId, chatId, userId, loadMessages])

  useEffect(() => {
    if (!registerChatCallback) return
    const unregister = registerChatCallback(msg => {
      const belongs =
        msg.chatID === effectiveId ||
        msg.chatID === currentChatId ||
        msg.chatID === chatId ||
        (msg.isAI && effectiveId === 'heritage-assistant') ||
        (msg.senderID === 'heritage-1' &&
          (msg.chatID === currentChatId || msg.chatID === chatId))

      if (!belongs) return

      if (msg.isSeenUpdate || msg.IsSeenUpdate) {
        setMessages(prev => {
          const incomingTempId = getMessageClientTempId(msg)
          const idx = prev.findIndex(m =>
            m.id === msg.id ||
            (incomingTempId && getMessageClientTempId(m) === incomingTempId)
          )
          if (idx === -1) return prev

          const next = [...prev]
          next[idx] = { ...next[idx], ...msg }
          messageHistoryRef.current = mergeMessages(
            messageHistoryRef.current,
            [next[idx]]
          )
          return next
        })
        return
      }

      upsertMessage(
        { ...msg, isPending: false },
        { scroll: isAtBottom(), instant: false }
      )
    })
    return unregister
  }, [
    registerChatCallback,
    chatId,
    currentChatId,
    chat?.id,
    currentUserID,
    effectiveId,
    scrollToBottom,
    isAtBottom,
    upsertMessage
  ])

  const handleFileUpload = useCallback(
    files => {
      const fileArray = Array.from(files)

      setAttachedFiles(prevFiles => {
        const totalFiles = prevFiles.length + fileArray.length

        if (totalFiles > 5) {
          const remainingSlots = 5 - prevFiles.length
          if (remainingSlots <= 0) {
            toast.error('Chỉ được chọn tối đa 5 file')
            return prevFiles
          }

          const limitedFiles = fileArray.slice(0, remainingSlots)
          toast.warning(
            `Chỉ có thể thêm ${remainingSlots} file nữa. Đã chọn ${limitedFiles.length} file đầu tiên.`
          )
          return [...prevFiles, ...limitedFiles]
        }

        return [...prevFiles, ...fileArray]
      })
    },
    [toast]
  )

  const handleSendMessage = useCallback(
    async rawText => {
      let clientTempId = ''
      try {
        if (!currentUserID || !effectiveId) {
          console.error('Missing userInfo or effectiveId:', {
            userInfo: currentUserID,
            effectiveId
          })
          return
        }

        const text = rawText?.trim() || ''
        const hasFiles = attachedFiles.length > 0
        if (!text && !hasFiles) {
          return
        }

        const parts = parseTextToParts(text)
        const links = []
        parts.forEach(p => {
          if (p.isLink) links.push(p.content)
        })

        const isPrivate = !isGroup
        const isAI = isAIChat

        // For group chats, prioritize chat?.id, for individual chats use currentChatId || chatId
        const activeChatId = isGroup
          ? chat?.id || currentChatId || chatId
          : currentChatId || chatId

        clientTempId = `tmp-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`
        const sentAt = new Date().toISOString()
        const optimisticFiles = hasFiles
          ? normalizeChatFiles(attachedFiles).map((file, index) => ({
              ...file,
              id: `${clientTempId}-${index}`,
              ID: `${clientTempId}-${index}`
            }))
          : []

        const payload = {
          SenderID: currentUserID,
          MessageType: hasFiles
            ? ChatMessageConstants.MessageType.File
            : ChatMessageConstants.MessageType.Text,
          ReplyToID: replyToMessage ? replyToMessage.id : null,
          Content: text,
          ChatID: activeChatId || '', // Use group ID for groups, currentChatId/chatId for individual chats
          ChatType: isPrivate
            ? ChatConstants.Type.PRIVATE
            : ChatConstants.Type.GROUP,
          ChatUsers: isPrivate
            ? JSON.stringify([
                { UserID: isAI ? 'heritage-1' : userId || effectiveId }
              ])
            : null,
          ChatFiles: hasFiles ? attachedFiles : '',
          ChatLinks: links.length ? JSON.stringify(links) : '',
          ClientTempID: clientTempId,
          IsAI: isAI
        }

        upsertMessage(
          {
            id: clientTempId,
            clientTempId,
            ClientTempID: clientTempId,
            senderID: currentUserID,
            senderName: userInfo?.fullName || userInfo?.FullName || 'B\u1ea1n',
            avatar: userInfo?.avatar || '',
            content: text,
            messageType: payload.MessageType,
            chatID: activeChatId || effectiveId,
            createdDate: sentAt,
            timestamp: sentAt,
            files: optimisticFiles,
            chatLinks: payload.ChatLinks,
            replyToID: replyToMessage ? replyToMessage.id : null,
            replyToMessage,
            seenBy: [],
            isPending: true
          },
          { scroll: true, instant: true }
        )

        const res = await sendMessageApi(payload)
        setAttachedFiles([])
        setReplyToMessage(null)

        const responsePayload = getSendChatResultPayload(res)
        const responseMessage = responsePayload?.message || responsePayload?.Message
        if (responseMessage) {
          upsertMessage(
            { ...responseMessage, clientTempId, ClientTempID: clientTempId, isPending: false },
            { scroll: true, instant: true }
          )
        }

        const newChatID = getSendChatId(res, activeChatId)
        dispatchChatListRefresh(newChatID)
        if (newChatID && newChatID !== currentChatId && !activeChatId) {
          setCurrentChatId(newChatID)
          const fallbackTimeout = setTimeout(() => {
            if (messages.length === 0) {
              loadMessages(newChatID)
            }
          }, 1000)

          const originalLength = messages.length
          const checkInterval = setInterval(() => {
            if (messages.length > originalLength) {
              clearTimeout(fallbackTimeout)
              clearInterval(checkInterval)
            }
          }, 100)
        }

        if (isAI && text) {
          const chatID_AI = newChatID

          try {
            const messageAll = [
              {
                role: 'system',
                content:
                  'Bạn là trợ lý ảo thông minh, có khả năng tìm kiếm thông tin và trả lời bất cứ câu hỏi. Các thông tin tìm kiếm phải chính thống, có nguồn gốc rõ ràng, ưu tiên cập nhật các thông tin về nghị quyết, thông tư của Nhà nước Chính Phủ Việt Nam, liên quan nhiều lĩnh vực ngành nghề, ưu tiên ngành Văn Hóa Di Sản, Công Nghệ. Còn lại bạn có thể thoải mái trả lời các câu hỏi khó khăn thông minh, tình cảm giống như ChatGPT thế hệ mới.'
              },
              ...messages
                .filter(item => item?.content?.trim()?.length > 0)
                .map(item => ({
                  role:
                    isCurrentUserMessage(item.senderID, userInfo) ? 'user' : 'assistant',
                  content: item.content
                })),
              {
                role: 'user',
                content: text.trim()
              }
            ]

            setIsSending(true)

            const res = await sendMessageAI(text.trim(), undefined, messageAll)

            if (res?.status === 200) {
              const aiReply =
                res?.data?.message || 'Xin lỗi, tôi không có câu trả lời.'

              const messageDataAI = {
                SenderID: 'heritage-1',
                MessageType: ChatMessageConstants.MessageType.Text,
                ReplyToID: null,
                Content: aiReply.trim(),
                ChatID: chatID_AI,
                ChatUsers: isPrivate
                  ? JSON.stringify([{ UserID: userId || effectiveId }])
                  : null,
                ChatFiles: null,
                IsAI: true
              }

              const responseAI = await sendMessageApi(messageDataAI)

              setIsSending(false)

              if (responseAI?.status === 200) {
                dispatchChatListRefresh(chatID_AI)
                const currentMessagesCount = messages.length

                setTimeout(async () => {
                  if (messages.length === currentMessagesCount) {
                    await loadMessages(chatID_AI)
                  }
                  setTimeout(scrollToBottom, 100)
                }, 1000)
              }
            } else {
              const fallbackMessage = {
                SenderID: 'heritage-1',
                MessageType: ChatMessageConstants.MessageType.Text,
                ReplyToID: null,
                Content:
                  'Xin lỗi, AI hiện tại không khả dụng. Vui lòng thử lại sau.',
                ChatID: chatID_AI,
                ChatUsers: isPrivate
                  ? JSON.stringify([{ UserID: userId || effectiveId }])
                  : null,
                ChatFiles: null,
                IsAI: true
              }

              const fallbackResponse = await sendMessageApi(fallbackMessage)
              setIsSending(false)

              if (fallbackResponse?.status === 200) {
                dispatchChatListRefresh(chatID_AI)
                setTimeout(async () => {
                  await loadMessages(chatID_AI)
                  setTimeout(scrollToBottom, 100)
                }, 500)
              }
            }
          } catch (error) {
            console.error('Error in AI chat:', error)
            const errorMessage = {
              SenderID: 'heritage-1',
              MessageType: ChatMessageConstants.MessageType.Text,
              ReplyToID: null,
              Content:
                'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
              ChatID: chatID_AI,
              ChatUsers: isPrivate
                ? JSON.stringify([{ UserID: userId || effectiveId }])
                : null,
              ChatFiles: null,
              IsAI: true
            }

            const errorResponse = await sendMessageApi(errorMessage)

            setIsSending(false)

            // Load lại messages để hiển thị tin nhắn lỗi
            if (errorResponse?.status === 200) {
              dispatchChatListRefresh(chatID_AI)
              setTimeout(async () => {
                await loadMessages(chatID_AI)
                setTimeout(scrollToBottom, 100)
              }, 500)
            }
          }
        }

        setTimeout(scrollToBottom, 80)
      } catch (error) {
        console.error('Error in handleSendMessage:', error)
        if (clientTempId) {
          setMessages(prev => {
            const next = prev.map(item =>
              item.id === clientTempId ||
              getMessageClientTempId(item) === clientTempId
                ? { ...item, isPending: false, isFailed: true }
                : item
            )
            messageHistoryRef.current = mergeMessages(
              messageHistoryRef.current,
              next
            )
            return next
          })
        }
        setIsSending(false)
        toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.')
      }
    },
    [
      currentUserID,
      currentChatId,
      chatId,
      userId,
      effectiveId,
      attachedFiles,
      replyToMessage,
      isGroup,
      isAIChat,
      messages,
      loadMessages,
      scrollToBottom,
      upsertMessage,
      userInfo
    ]
  )

  const handleMarkMessageAsSeen = useCallback(
    async messageId => {
      try {
        // Kiểm tra nếu message đã được mark as seen rồi thì không gọi API nữa
        const currentUserId =
          currentUserID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID
        if (!currentUserId) {
          console.log('[chat-seen:popup-skip-no-current-user]', {
            messageId,
            userInfo
          })
          return
        }

        console.log('[chat-seen:popup-mark-start]', {
          messageId,
          currentUserId,
          effectiveId,
          message: messages.find(m => m.id === messageId)
        })

        if (seenMessagesRef.current.has(messageId)) {
          console.log('[chat-seen:popup-skip-cache]', { messageId, currentUserId })
          return
        }

        // Kiểm tra nếu user hiện tại đã seen message này rồi
        const message = messages.find(m => m.id === messageId)
        if (message) {
          let seenBy = Array.isArray(message.seenBy)
            ? message.seenBy
            : safeParseJSON(message.seenBy, [])

          const alreadySeen = seenBy.some(
            u =>
              String(u?.UserID || u?.userID || u?.id || u?.ID || '') ===
              String(currentUserId)
          )
          if (alreadySeen) {
            console.log('[chat-seen:popup-skip-already-seen]', {
              messageId,
              currentUserId,
              seenBy
            })
            seenMessagesRef.current.add(messageId)
            return
          }
        }

        // Debounce để tránh gọi API quá nhiều
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(async () => {
          try {
            // Kiểm tra lại lần nữa trước khi gọi API
            if (seenMessagesRef.current.has(messageId)) {
              return
            }

            const response = await markMessageAsSeen(messageId, currentUserId)
            console.log('[chat-seen:popup-mark-success]', {
              messageId,
              currentUserId,
              response
            })

            // Mark message đã được xử lý
            seenMessagesRef.current.add(messageId)

            setMessages(prev =>
              prev.map(m => {
                if (m.id !== messageId) return m
                let seen = Array.isArray(m.seenBy)
                  ? m.seenBy
                  : safeParseJSON(m.seenBy, [])
                const exist = seen.some(
                  u =>
                    String(u?.UserID || u?.userID || u?.id || u?.ID || '') ===
                    String(currentUserId)
                )
                if (!exist) {
                  seen = [
                    ...seen,
                    {
                      UserID: currentUserId,
                      userID: currentUserId,
                      FullName: userInfo?.fullName,
                      fullName: userInfo?.fullName,
                      Avatar: userInfo?.avatar,
                      avatar: userInfo?.avatar
                    }
                  ]
                }
                return { ...m, seenBy: seen }
              })
            )
          } catch (error) {
            // Nếu API call fail thì remove khỏi seen set để có thể thử lại
            seenMessagesRef.current.delete(messageId)
            console.warn('Error marking message as seen:', error)
          }
        }, 500) // Debounce 500ms
      } catch (error) {
        console.error('Error in handleMarkMessageAsSeen:', error)
      }
    },
    [
      messages,
      currentUserID,
      userInfo?.UserID,
      userInfo?.id,
      userInfo?.ID,
      userInfo?.fullName,
      userInfo?.avatar
    ]
  )

  const handleRecallMessage = useCallback(
    async messageId => {
      try {
        const response = await recallMessage(messageId)
        if (response.status === 200) {
          toast.success('Đã thu hồi tin nhắn')
          const activeChatId = currentChatId || chatId
          if (activeChatId) await loadMessages(activeChatId)
        }
      } catch (error) {
        console.error('Error recalling message:', error)
        toast.error('Không thể thu hồi tin nhắn')
      }
    },
    [currentChatId, chatId, loadMessages, toast]
  )

  const handleVoteOnPoll = useCallback(
    async voteData => {
      const payload = { ...voteData }
      if (!payload.ChatID && effectiveId) payload.ChatID = effectiveId
      if (typeof payload.OptionIDs === 'string')
        payload.OptionIDs = [payload.OptionIDs]
      if (!Array.isArray(payload.OptionIDs) && payload.OptionID) {
        payload.OptionIDs = [payload.OptionID]
        delete payload.OptionID
      }
      if (payload.Options) delete payload.Options
      const res = await votePoll(payload)
      if (res?.status === 200) await loadPollsByChatID(effectiveId)
    },
    [effectiveId, loadPollsByChatID]
  )

  const handleEditReminder = useCallback(
    async reminderData => {
      const res = await editReminder(reminderData)
      if (res?.status === 200) {
        const activeChatId = currentChatId || chatId
        if (activeChatId) await loadMessages(activeChatId)
        await loadRemindersByChatID(effectiveId)
      }
    },
    [currentChatId, chatId, effectiveId, loadMessages, loadRemindersByChatID]
  )

  const handleCreateNote = useCallback(
    async noteData => {
      const res = await createNote(noteData)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200 && activeChatId) await loadMessages(activeChatId)
    },
    [currentChatId, chatId, loadMessages]
  )

  const handleUpdateNote = useCallback(
    async noteData => {
      const res = await updateNote(noteData)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200 && activeChatId) await loadMessages(activeChatId)
    },
    [currentChatId, chatId, loadMessages]
  )

  const clearUnreadCount = useCallback(() => {
    if (typeof window !== 'undefined' && effectiveId) {
      setUnreadCount(0)
      localStorage.removeItem(`unreadCount_${effectiveId}`)
      window.dispatchEvent(
        new CustomEvent('unreadCountChanged', {
          detail: { chatId: effectiveId, count: 0 }
        })
      )
    }
  }, [effectiveId])

  const incrementUnreadCount = useCallback(() => {
    if (typeof window !== 'undefined' && effectiveId) {
      setUnreadCount(prevCount => {
        const newCount = prevCount + 1
        localStorage.setItem(`unreadCount_${effectiveId}`, newCount.toString())
        window.dispatchEvent(
          new CustomEvent('unreadCountChanged', {
            detail: { chatId: effectiveId, count: newCount }
          })
        )
        return newCount
      })
    }
  }, [effectiveId])

  const handleCreatePoll = useCallback(
    async pollData => {
      const res = await createPoll(pollData)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200) await loadMessages(activeChatId)
    },
    [currentChatId, chatId, loadMessages]
  )

  const handleCreateReminder = useCallback(
    async reminderData => {
      const res = await createReminder(reminderData)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200) {
        await loadMessages(activeChatId)
        await loadRemindersByChatID(activeChatId)
      }
    },
    [currentChatId, chatId, loadMessages, loadRemindersByChatID]
  )

  const handleJoinReminder = useCallback(
    async (ID, type) => {
      const res = await confirmJoinReminder(ID, type)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200) {
        await loadMessages(activeChatId)
        await loadRemindersByChatID(activeChatId)
      }
    },
    [currentChatId, chatId, loadMessages, loadRemindersByChatID]
  )

  const handleDeclineReminder = useCallback(
    async (ID, type) => {
      const res = await confirmJoinReminder(ID, type)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200) {
        await loadMessages(activeChatId)
        await loadRemindersByChatID(activeChatId)
      }
    },
    [currentChatId, chatId, loadMessages, loadRemindersByChatID]
  )

  const handlePinMessage = useCallback(
    async messageId => {
      try {
        const response = await pinMessage(messageId)
        if (response.status === 200) {
          toast.success('Đã ghim tin nhắn')
          const activeChatId = currentChatId || chatId
          if (activeChatId) await loadMessages(activeChatId)
        }
      } catch (error) {
        console.error('Error pinning message:', error)
        toast.error('Không thể ghim tin nhắn')
      }
    },
    [currentChatId, chatId, loadMessages, toast]
  )

  const handleUnpinMessage = useCallback(
    async payload => {
      const toArr = v => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [])
      let messageID = []
      let eventID = []
      if (Array.isArray(payload)) messageID = payload.filter(Boolean)
      else if (payload && typeof payload === 'object') {
        messageID = toArr(payload.messageID)
        eventID = toArr(payload.eventID)
      } else if (payload) messageID = [payload]
      if (messageID.length === 0 && eventID.length === 0) return
      const res = await unpinMessage({ messageID, eventID })
      const activeChatId = currentChatId || chatId
      if (res?.status === 200) await loadMessages(activeChatId)
    },
    [currentChatId, chatId, loadMessages]
  )

  const handleAddNewOption = useCallback(
    async pollData => {
      const res = await createOptionsPoll(pollData)
      const activeChatId = currentChatId || chatId
      if (res?.status === 200) {
        await loadMessages(activeChatId)
        await loadPollsByChatID(activeChatId)
      }
    },
    [currentChatId, chatId, loadMessages, loadPollsByChatID]
  )

  const handleReplyMessage = useCallback(message => {
    setReplyToMessage(message)
  }, [])

  const handleAcceptUserRequest = useCallback(
    async requestId => {
      try {
        setIsSending(true)
        const response = await acceptUserRequest(
          requestId,
          ChatAwaitConfirmConstants.Status.Accepted,
          currentUserID
        ) // 1 = Accepted
        if (response.status === 200) {
          const request = userRequests.find(req => req.id === requestId)
          toast.success(
            `Đã chấp nhận yêu cầu của ${request?.senderName || 'người dùng'}`
          )
          const activeChatId = currentChatId || chatId

          // Ensure individual users list is loaded before loading user requests
          let usersList = individualUsersList
          if (individualUsersList.length === 0) {
            usersList = await loadIndividualUsersList()
          }

          await loadUserRequestsByChatID(activeChatId, usersList)
          await loadMessages(activeChatId)
        }
      } catch (error) {
        console.error('Error accepting user request:', error)
        toast.error('Không thể chấp nhận yêu cầu')
      } finally {
        setIsSending(false)
      }
    },
    [
      currentChatId,
      chatId,
      userRequests,
      loadIndividualUsersList,
      loadUserRequestsByChatID,
      loadMessages,
      currentUserID,
      toast
    ]
  )

  const handleRejectUserRequest = useCallback(
    async requestId => {
      try {
        setIsSending(true)
        const response = await acceptUserRequest(
          requestId,
          ChatAwaitConfirmConstants.Status.Rejected,
          currentUserID
        )
        if (response.status === 200) {
          const request = userRequests.find(req => req.id === requestId)
          toast.success(
            `Đã từ chối yêu cầu của ${request?.senderName || 'người dùng'}`
          )
          const activeChatId = currentChatId || chatId

          // Ensure individual users list is loaded before loading user requests
          let usersList = individualUsersList
          if (individualUsersList.length === 0) {
            usersList = await loadIndividualUsersList()
          }

          await loadUserRequestsByChatID(activeChatId, usersList)
        }
      } catch (error) {
        console.error('Error rejecting user request:', error)
        toast.error('Không thể từ chối yêu cầu')
      } finally {
        setIsSending(false)
      }
    },
    [
      currentChatId,
      chatId,
      userRequests,
      loadIndividualUsersList,
      loadUserRequestsByChatID,
      currentUserID,
      toast
    ]
  )

  const handleInputFocus = useCallback(async () => {
    try {
      // Clear unread count ngay lập tức
      clearUnreadCount()

      // Tìm tin nhắn cuối cùng từ người khác (chưa đọc)
      const unreadMessages = messages.filter(
        msg => msg.sender !== 'me' && !msg.isMe
      )

      if (unreadMessages.length > 0) {
        // Lấy tin nhắn cuối cùng từ người khác
        const lastOtherMessage = unreadMessages[unreadMessages.length - 1]

        if (lastOtherMessage) {
          // Đánh dấu tin nhắn cuối cùng là đã đọc
          await handleMarkMessageAsSeen(lastOtherMessage.id)
        }
      }
    } catch (error) {
      console.error('Error handling input focus:', error)
    }
  }, [messages, clearUnreadCount, handleMarkMessageAsSeen])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setMessagePage(1)
    setHasMoreMessages(false)
    setIsLoadingOlder(false)
    setMessages([])
    setPolls([])
    setReminders([])
    setUserRequests([])
    messageHistoryRef.current = []
    isMessageHistoryCompleteRef.current = false
    isLoadingOlderRef.current = false
    seenMessagesRef.current.clear()
  }, [effectiveId])

  return {
    messages,
    isLoading,
    isSending,
    isChatsAI,
    attachedFiles,
    setAttachedFiles,
    replyToMessage,
    setReplyToMessage,
    ListUsers,
    individualUsersList,
    polls,
    reminders,
    userRequests,
    unreadCount,
    sortDelay,
    hasMoreMessages,
    isLoadingOlder,

    messagesEndRef,
    messageListRef,

    handleSendMessage,
    handleMarkMessageAsSeen,
    handleRecallMessage,
    handleReplyMessage,
    handleInputFocus,
    handleVoteOnPoll,
    handleEditReminder,
    handleFileUpload,
    handleCreateNote,
    handleUpdateNote,
    handleCreatePoll,
    handleCreateReminder,
    handleJoinReminder,
    handleDeclineReminder,
    handlePinMessage,
    handleUnpinMessage,
    handleAddNewOption,
    handleAcceptUserRequest,
    handleRejectUserRequest,
    clearUnreadCount,
    incrementUnreadCount,
    loadOlderMessages,
    scrollToBottom,
    isAtBottom,
    reload: () => {
      const activeChatId = currentChatId || chatId || userId
      return activeChatId ? loadMessages(activeChatId) : null
    },

    // Status flags
    isGroup,
    isAIChat,
    onlineUsers
  }
}
