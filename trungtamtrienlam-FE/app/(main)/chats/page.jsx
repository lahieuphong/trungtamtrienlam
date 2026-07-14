'use client'
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  use,
  Suspense
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FormAddGroup from '@/components/Chats/FormAddGroup'
import ChatSidebar from '@/components/Chats/ChatSidebar'
import ChatHeader from '@/components/Chats/ChatHeader'
import MessageList from '@/components/Chats/MessageList'
import MessageInput from '@/components/Chats/MessageInput'
import GroupInfoSidebar from '@/components/Chats/GroupInfoSidebar'
import IndividualInfoSidebar from '@/components/Chats/IndividualInfoSidebar'
import UserRequestsModal from '@/components/Chats/UserRequestsModal'
import SearchModal from '@/components/Chats/SearchModal'
import {
  CreateChat,
  getGroupChats,
  updateChatName,
  updateChatAvatar,
  sendMessage,
  sendMessageAI,
  loadMes,
  loadUserRequest,
  acceptUserRequest,
  leaveGroup,
  disbandGroup,
  addUserToGroup,
  recallMessage,
  promoteToViceLeader,
  removeViceLeader,
  removeMemberFromGroup,
  transferGroupLeader,
  changeLeaderAndLeaveGroup,
  getListUserByChatID,
  createNote,
  updateNote,
  createPoll,
  getPollsByChatID,
  votePoll,
  markMessageAsSeen,
  createReminder,
  getRemindersByChatID,
  editReminder,
  confirmJoinReminder,
  pinMessage,
  unpinMessage,
  createOptionsPoll,
  pinChat
} from '@/lib/api/chatsApi'
import { useToast } from '@/contexts/ToastContext'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { useSignalR } from '@/contexts/SignalRContext'
import { useChatAttachments } from '@/contexts/ChatAttachmentsContext'
import { useNotification } from '@/contexts/NotificationPushContext'
import { MessageConstants as NotificationsConstants } from '@/constants/notificationContants'
import { readNotification } from '@/lib/api/notificationApi'
import { onMessageForeground } from '@/app/web-push-notification'
import {
  ChatConstants,
  ChatMessageConstants,
  ChatAwaitConfirmConstants,
  ChatUserConstants,
  EventType
} from '@/constants/chatConstants'
import {
  fetchDepartmentDropdown,
  fetchUsersDropdownForChats
} from '@/lib/api/dropdownApi'
import LoadingContext from '@/contexts/LoadingContext'
import { Loader2, UserIcon } from 'lucide-react'
import { parseTextToParts } from '@/helpers/stringHelpers'
import { isCurrentUserMessage } from '@/helpers/chatMessageHelpers'
import { normalizeChatFiles } from '@/helpers/chatFileHelpers'
import {
  applyChatPinState,
  getChatIdentity,
  getNextChatPinDate,
  hydrateChatPinState,
  setStoredChatPinDate
} from '@/helpers/chatPinHelpers'
import { se } from 'date-fns/locale'

const CHAT_MESSAGE_PAGE_SIZE = 30
const CHAT_TABS = {
  individual: 'individual',
  groups: 'groups'
}

const CHAT_TAB_QUERY_VALUES = {
  [CHAT_TABS.individual]: 'individual',
  [CHAT_TABS.groups]: 'groups'
}

const CHAT_TAB_QUERY_ALIASES = {
  individual: CHAT_TABS.individual,
  personal: CHAT_TABS.individual,
  'ca-nhan': CHAT_TABS.individual,
  canhan: CHAT_TABS.individual,
  groups: CHAT_TABS.groups,
  group: CHAT_TABS.groups,
  nhom: CHAT_TABS.groups
}

const normalizeChatTab = value => {
  const key = String(value || '').trim().toLowerCase()
  return CHAT_TAB_QUERY_ALIASES[key] || CHAT_TABS.individual
}

const getChatTabQueryValue = tab =>
  CHAT_TAB_QUERY_VALUES[normalizeChatTab(tab)]

const buildChatsUrl = (pathname, searchParams, tab, options = {}) => {
  const params = new URLSearchParams(searchParams?.toString?.() || '')
  params.set('tab', getChatTabQueryValue(tab))

  if (options.keepChatId === false) {
    params.delete('id')
    params.delete('chatId')
  } else if (options.chatId) {
    params.set('id', options.chatId)
    params.delete('chatId')
  }

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}`
}

const createInitialChatTabLoadState = () => ({
  [CHAT_TABS.individual]: {
    isLoaded: false,
    isLoading: false,
    error: null
  },
  [CHAT_TABS.groups]: {
    isLoaded: false,
    isLoading: false,
    error: null
  }
})
const normalizeChatId = value => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const getChatUnreadCount = chat => {
  const value =
    chat?.unreadCount ??
    chat?.UnreadCount ??
    chat?.countUnread ??
    chat?.CountUnread ??
    0
  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

const getStoredChatUnreadCount = chatId => {
  if (typeof window === 'undefined' || !chatId) return 0
  const count = Number(localStorage.getItem(`unreadCount_${chatId}`) || 0)
  return Number.isFinite(count) ? count : 0
}

const setStoredChatUnreadCount = (chatId, count, dispatchEvent = true) => {
  if (typeof window === 'undefined' || !chatId) return

  const syncUnreadCount = () => {
    if (count > 0) {
      localStorage.setItem(`unreadCount_${chatId}`, String(count))
    } else {
      localStorage.removeItem(`unreadCount_${chatId}`)
    }

    if (dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('unreadCountChanged', {
          detail: { chatId, count }
        })
      )
    }
  }

  if (dispatchEvent) {
    window.setTimeout(syncUnreadCount, 0)
    return
  }

  syncUnreadCount()
}
const getChatLastMessageId = chat =>
  chat?.lastMessageId ||
  chat?.lastMessageID ||
  chat?.messageId ||
  chat?.messageID ||
  chat?.chatMessageId ||
  chat?.chatMessageID ||
  chat?.id

const getChatMemberId = member =>
  normalizeChatId(member?.userID ?? member?.UserID ?? member?.id ?? member?.ID)

const getChatMemberRole = member =>
  Number(member?.role ?? member?.Role ?? ChatUserConstants.Role.Member)

const getCurrentUserId = user =>
  normalizeChatId(user?.userID ?? user?.UserID ?? user?.id ?? user?.ID)

const getIncomingChatId = message =>
  normalizeChatId(message?.chatID ?? message?.ChatID ?? message?.chatId ?? message?.ChatId)

const getIncomingSenderId = message =>
  normalizeChatId(
    message?.senderID ??
      message?.SenderID ??
      message?.senderId ??
      message?.SenderId
  )

const getIncomingSenderName = message =>
  normalizeChatId(
    message?.senderName ??
      message?.SenderName ??
      message?.senderFullName ??
      message?.SenderFullName
  ).toLowerCase()

const getChatPeerIds = (chat, currentUserId = '') =>
  [
    chat?.userID,
    chat?.UserID,
    chat?.otherUserID,
    chat?.OtherUserID,
    chat?.senderID,
    chat?.SenderID,
    ...(Array.isArray(chat?.members)
      ? chat.members.map(member => member?.userID ?? member?.UserID ?? member?.id ?? member?.ID)
      : [])
  ]
    .map(normalizeChatId)
    .filter(id => id && id !== currentUserId)

const parseIncomingChatUserIds = message => {
  const rawUsers = message?.chatUsers ?? message?.ChatUsers
  if (!rawUsers) return []

  try {
    const users = typeof rawUsers === 'string' ? JSON.parse(rawUsers) : rawUsers
    if (!Array.isArray(users)) return []

    return users
      .map(user => user?.UserID ?? user?.userID ?? user?.id ?? user?.ID)
      .map(normalizeChatId)
      .filter(Boolean)
  } catch {
    return []
  }
}

const getChatDisplayNameKey = chat =>
  normalizeChatId(chat?.name ?? chat?.Name ?? chat?.fullName ?? chat?.FullName).toLowerCase()
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

const getMessageClientTempId = message =>
  message?.clientTempId || message?.ClientTempID || message?.clientTempID || ''

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

const isCurrentMemberChatManager = (member, currentUserId) => {
  if (!member || !currentUserId) return false

  const sameUser = getChatMemberId(member) === currentUserId
  if (!sameUser) return false

  const role = getChatMemberRole(member)
  return Boolean(
    member?.isCreator ||
      member?.IsCreator ||
      role === ChatUserConstants.Role.Leader ||
      role === ChatUserConstants.Role.ViceLeader
  )
}

const ChatsPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loadingContext = useContext(LoadingContext)
  const { registerChatCallback, onlineUsers, isConnected } = useSignalR()
  const { notificationData, setNotificationData } = useNotification()
  const [activeTab, setActiveTab] = useState(() =>
    normalizeChatTab(searchParams.get('tab'))
  )
  const [selectedChat, setSelectedChat] = useState(null)
  const [selectedChatLinkId, setSelectedChatLinkId] = useState(null)
  const [chatOpenUnreadSnapshot, setChatOpenUnreadSnapshot] = useState({
    chatId: null,
    unreadCount: 0
  })
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [tabNotificationCounts, setTabNotificationCounts] = useState({
    individual: 0,
    groups: 0
  })
  const [chatTabLoadState, setChatTabLoadState] = useState(() => createInitialChatTabLoadState())

  // Listen for Web Push chat notifications
  useEffect(() => {
    const unsubscribe = onMessageForeground(payload => {
      console.log(payload)
      if (payload && payload.data && payload.data.type === '10') {
        // Chat notification
        try {
          const pushData = (payload.data)

          const chatID = pushData.refID

          if (chatID) {
            const notification = {
              id: pushData.ID || crypto.randomUUID(),
              type: 10, // Chat type
              refID: chatID,
              title: payload.data.title || 'Tin nhắn',
              content: pushData.Content || payload.data.body,
              isRead: false,
              createdDate: pushData.CreatedDate || new Date().toISOString(),
              senderName: pushData.SenderName || 'Unknown',
              data: pushData
            }

            setNotificationData(prev => {
              const existing = prev.find(n => n.id === notification.id)
              if (existing) return prev
              return [notification, ...prev]
            })
          }
        } catch (error) {
          console.error('Error parsing Web Push notification data:', error)
        }
      }
    })

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [setNotificationData])
  const [isOpen, setIsOpen] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const { userInfo } = useLoadLocalStorage()
  const { triggerReloadAttachments } = useChatAttachments()
  const [groupChatList, setGroupChatList] = useState([])
  const [userChatList, setUserChatList] = useState([])
  const [individualChatList, setIndividualChatList] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [messagePage, setMessagePage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const [isChatsAI, setIsChatsAI] = useState(false)
  const [userRequests, setUserRequests] = useState([])
  const [userRequestsChatId, setUserRequestsChatId] = useState(null)
  const [showUserRequestsModal, setShowUserRequestsModal] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isCurrentUserLeader, setIsCurrentUserLeader] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [replyToMessage, setReplyToMessage] = useState(null)
  const [polls, setPolls] = useState([])
  const [reminders, setReminders] = useState([])
  const [sortDelay, setSortDelay] = useState(0)
  const [chatsWithNewMembers, setChatsWithNewMembers] = useState(new Set())
  const [pendingNewGroupSelection, setPendingNewGroupSelection] = useState(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState(null)
  const loadUserReqRef = useRef(false)
  const selectedChatRef = useRef(selectedChat)
  const activeTabRef = useRef(activeTab)
  const isApplyingUrlTabRef = useRef(false)
  const pendingLocalTabRef = useRef(null)
  const messageInputRef = useRef(null)
  const latestLoadChatIdRef = useRef(null)
  const messagePaneLoadingChatRef = useRef(null)
  const lastSilentMessageLoadRef = useRef({ chatId: null, at: 0 })
  const chatMessageHistoryRef = useRef([])
  const isLoadingOlderMessagesRef = useRef(false)
  const knownChatIdsRef = useRef(new Set())
  const userChatListRef = useRef(userChatList)
  const groupChatListRef = useRef(groupChatList)
  const individualChatListRef = useRef(individualChatList)
  const chatTabLoadRef = useRef(createInitialChatTabLoadState())
  const unresolvedPrivateSelectionRef = useRef({ chatId: null, checkedAt: 0 })

  const replaceChatsUrl = useCallback(
    (tab, options = {}) => {
      if (typeof window === 'undefined') return

      const nextUrl = buildChatsUrl(
        window.location.pathname,
        searchParams,
        tab,
        options
      )
      const currentUrl = `${window.location.pathname}${window.location.search}`

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false })
      }
    },
    [router, searchParams]
  )

  const isExistingChatId = useCallback(
    chatId => {
      if (!chatId) return false
      if (chatId === 'heritage-assistant') return true

      return (
        knownChatIdsRef.current.has(chatId) ||
        userChatList.some(chat => chat.id === chatId || chat.chatID === chatId) ||
        groupChatList.some(chat => chat.id === chatId || chat.chatID === chatId)
      )
    },
    [userChatList, groupChatList]
  )

  const resolveActiveRealtimeChat = useCallback(
    message => {
      const selectedId = normalizeChatId(selectedChatRef.current)
      if (!selectedId) return { matches: false }

      const incomingChatId = getIncomingChatId(message)
      if (incomingChatId && incomingChatId === selectedId) {
        return { matches: true, chatId: incomingChatId }
      }

      if (message?.isAI && selectedId === 'heritage-assistant') {
        return { matches: true, chatId: incomingChatId || selectedId }
      }

      if (activeTabRef.current !== CHAT_TABS.individual) {
        return { matches: false }
      }

      const currentUserId = getCurrentUserId(userInfo)
      const senderId = getIncomingSenderId(message)
      const senderNameKey = getIncomingSenderName(message)
      const participantIds = parseIncomingChatUserIds(message).filter(
        id => id && id !== currentUserId
      )
      const selectedChatItem = userChatListRef.current.find(chat => {
        const ids = [chat?.id, chat?.chatID, chat?.ChatID, chat?.userID, chat?.UserID]
          .map(normalizeChatId)
          .filter(Boolean)
        return ids.includes(selectedId)
      })
      const selectedUser = individualChatListRef.current.find(user => {
        const ids = [user?.id, user?.ID, user?.userID, user?.UserID]
          .map(normalizeChatId)
          .filter(Boolean)
        return ids.includes(selectedId)
      })
      const peerIds = new Set([
        ...getChatPeerIds(selectedChatItem, currentUserId),
        ...getChatPeerIds(selectedUser, currentUserId),
        selectedId
      ])
      const selectedNameKey =
        getChatDisplayNameKey(selectedChatItem) || getChatDisplayNameKey(selectedUser)
      const matchesPeerId =
        (senderId && peerIds.has(senderId)) ||
        participantIds.some(id => peerIds.has(id))
      const matchesPeerName = Boolean(
        senderNameKey && selectedNameKey && senderNameKey === selectedNameKey
      )

      if (!matchesPeerId && !matchesPeerName) return { matches: false }

      return {
        matches: true,
        chatId: incomingChatId || normalizeChatId(selectedChatItem?.id) || selectedId,
        shouldSwitchToChatId: Boolean(incomingChatId && incomingChatId !== selectedId)
      }
    },
    [userInfo]
  )
  const markChatAsRead = useCallback(
    chatOrId => {
      const chat =
        typeof chatOrId === 'object'
          ? chatOrId
          : [...userChatList, ...groupChatList].find(
            item => item.id === chatOrId || item.chatID === chatOrId
          )
      const chatId =
        typeof chatOrId === 'object' ? chatOrId?.id || chatOrId?.chatID : chatOrId
      const targetId = chat ? getChatLastMessageId(chat) : chatId
      const currentUserId =
        userInfo?.userID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID

      if (targetId && currentUserId && (!chat || getChatUnreadCount(chat) > 0)) {
        markMessageAsSeen(targetId, currentUserId).catch(error => {
          console.error('Error marking chat as seen:', error)
        })
      }

      if (chatId && typeof window !== 'undefined') {
        localStorage.removeItem(`unreadCount_${chatId}`)
        window.dispatchEvent(
          new CustomEvent('unreadCountChanged', {
            detail: { chatId, count: 0 }
          })
        )
      }
    },
    [userChatList, groupChatList, userInfo]
  )

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    userChatListRef.current = userChatList
  }, [userChatList])

  useEffect(() => {
    groupChatListRef.current = groupChatList
  }, [groupChatList])

  useEffect(() => {
    individualChatListRef.current = individualChatList
  }, [individualChatList])
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (!tabParam) return

    const nextTab = normalizeChatTab(tabParam)

    if (pendingLocalTabRef.current) {
      if (nextTab === pendingLocalTabRef.current) {
        pendingLocalTabRef.current = null
      } else {
        return
      }
    }

    if (nextTab === activeTabRef.current) return

    isApplyingUrlTabRef.current = true
    setActiveTab(nextTab)
    setSelectedChat(null)
    setChatMessages([])
    resetMessagePagination()
    setUserRequests([])
    setShowGroupInfo(false)
  }, [searchParams])

  useEffect(() => {
    if (pendingLocalTabRef.current) {
      return
    }

    if (isApplyingUrlTabRef.current) {
      isApplyingUrlTabRef.current = false
      return
    }

    const tabParam = searchParams.get('tab')
    const expectedTabParam = getChatTabQueryValue(activeTab)
    if (tabParam === expectedTabParam) return

    replaceChatsUrl(activeTab)
  }, [searchParams, activeTab, replaceChatsUrl])

  useEffect(() => {
    const unregister = registerChatCallback(msgArray => {
      // Handle array format - take first message
      const msg = Array.isArray(msgArray) ? msgArray[0] : msgArray

      if (!msg) {
        return
      }
      // Extract message properties for easier use
      const messageType = msg.messageType
      const content = msg.content
      const chatID = getIncomingChatId(msg)
      const senderID = getIncomingSenderId(msg)
      const activeRealtimeChat = resolveActiveRealtimeChat(msg)
      const isActiveRealtimeChat = activeRealtimeChat.matches
      const resolvedRealtimeChatId = activeRealtimeChat.chatId || chatID

      if (activeRealtimeChat.shouldSwitchToChatId && chatID) {
        knownChatIdsRef.current.add(chatID)
        selectedChatRef.current = chatID
        latestLoadChatIdRef.current = chatID
        setSelectedChat(chatID)
        replaceChatsUrl(activeTabRef.current, { chatId: chatID })
      }
      const isDisbandGroupEvent =
        msg.chatDeleted ||
        msg.isDeleted ||
        (messageType === 5 &&
          content &&
          (content.includes('giải tán nhóm') ||
            content.includes('giải tán nhóm')))

      if (isDisbandGroupEvent) {
        if (isActiveRealtimeChat) {
          setSelectedChat(null)
          setChatMessages([])
          resetMessagePagination()
          setShowGroupInfo(false)
        }

        setTimeout(() => {
          loadData()
          loadChatUser()
          if (activeTab === 'groups') {
            loadChatUser()
            setSelectedChat(null)
            setShowGroupInfo(false)
          }
        }, 500)
      }

      // Handle message pin/unpin realtime
      if (
        messageType === 8 &&
        content &&
        (content.includes('Message unpinned') || content.includes('Message pinned'))
      ) {
        // Reload messages để cập nhật trạng thái pin
        if (isActiveRealtimeChat) {
          loadMessages(resolvedRealtimeChatId, { scrollToBottomAfterLoad: isAtBottom() })
        }

        // Reload chat data để cập nhật danh sách
        setTimeout(() => {
          loadData()
          loadChatUser()

          // Nếu đang ở tab groups, reload group data
          if (activeTab === 'groups') {
            forceReloadGroupData()
          }
        }, 500)

        // Toast notification
        if (content.includes('Message pinned')) {
          toast.success('Tin nhắn đã được ghim')
        } else if (content.includes('Message unpinned')) {
          toast.success('Tin nhắn đã được bỏ ghim')
        }
      }
      if (chatID && chatsWithNewMembers.has(chatID)) {
        setChatsWithNewMembers(prev => {
          const newSet = new Set(prev)
          newSet.delete(chatID)
          return newSet
        })
      }

      // Handle user added to group - reload group list in groups tab
      if (
        messageType === 5 &&
        content &&
        (content.includes('đã được thêm vào nhóm') ||
          content.includes('thêm vào nhóm'))
      ) {
        if (isActiveRealtimeChat) {
          loadMessages(resolvedRealtimeChatId)
        }

        // Force reload both individual and group chats
        Promise.all([loadChatUser(), forceReloadGroupData()])

        // If on groups tab, reload group list multiple times to ensure data appears
        if (activeTab === 'groups') {
          setTimeout(() => {
            forceReloadGroupData()
          }, 300)

          setTimeout(() => {
            forceReloadGroupData()
          }, 800)

          setTimeout(() => {
            forceReloadGroupData()
          }, 1500)
        } else {
          setTimeout(() => {
            forceReloadGroupData()
          }, 1000)
        }

        // Also check if current user was added to this group
        if (userInfo?.userID) {
          const currentUserPattern = new RegExp(`\\{${userInfo.userID}\\}`)
          const isCurrentUserAdded = content.match(currentUserPattern)

          if (isCurrentUserAdded) {
            setTimeout(() => {
              handleUserAddedToGroup(chatID)
            }, 500)

            setTimeout(() => {
              handleUserAddedToGroup(chatID)
            }, 1200)
          }
        }
      }

      // Handle user left group - reload group list in groups tab
      if (
        messageType === 5 &&
        content &&
        (content.includes('đã rời nhóm') || content.includes('rời nhóm'))
      ) {
        // Reload messages if currently viewing this chat
        if (isActiveRealtimeChat) {
          loadMessages(resolvedRealtimeChatId)
        }

        // Always reload chat list and users when someone leaves group
        loadChatUser()
        loadData()

        // If on groups tab, reload group list
        if (activeTab === 'groups') {
          setTimeout(() => {
            loadData()
          }, 500)
        }
      }

      // Handle role changes (promotion/demotion) - reload group list in groups tab
      if (
        messageType === 5 &&
        content &&
        (content.includes('đã bổ nhiệm') ||
          content.includes('thành trưởng nhóm') ||
          content.includes('thành phó nhóm') ||
          content.includes('xóa quyền phó nhóm') ||
          content.includes('xoá quyền phó nhóm'))
      ) {
        // Reload messages if currently viewing this chat
        if (isActiveRealtimeChat) {
          loadMessages(resolvedRealtimeChatId)
        }

        // Always reload chat list and users when roles change
        loadChatUser()
        loadData()

        // If on groups tab, reload group list
        if (activeTab === 'groups') {
          setTimeout(() => {
            loadData()
          }, 500)
        }
      }

      if (
        messageType === 6 ||
        messageType === 7 ||
        messageType === 5 ||
        messageType === 10 ||
        messageType === 8
      ) {
        if (chatID && selectedChat && isActiveRealtimeChat) {
          loadMessages(resolvedRealtimeChatId, { scrollToBottomAfterLoad: isAtBottom() })
        }
        loadChatUser()
        if (activeTab === 'groups' || msg.chatType === ChatConstants.Type.GROUP) {
          loadData()
        }
      }

      // Handle reminder realtime updates
      if (msg.eventType === EventType.Type.Remind && chatID) {
        // Always reload reminders when there's a reminder event, regardless of selected chat
        loadRemindersByChatID(chatID)

        // If currently viewing this chat, also reload messages to show the reminder message
        if (isActiveRealtimeChat) {
          loadMessages(resolvedRealtimeChatId, { scrollToBottomAfterLoad: isAtBottom() })
        }

        // Force UI update to show reminder in message list
        setTimeout(() => {
          if (isActiveRealtimeChat) {
            loadMessages(resolvedRealtimeChatId, { scrollToBottomAfterLoad: isAtBottom() })
          }
        }, 500)
      }

      if (
        chatID &&
        activeTab === 'groups' &&
        isActiveRealtimeChat &&
        selectedChat
      ) {
        setTimeout(() => {
          loadUserReq(chatID)
        }, 500)
      }

      if (
        selectedChat &&
        (isActiveRealtimeChat ||
          (msg.isAI && selectedChat == 'heritage-assistant'))
      ) {
        if (msg.isAI && selectedChat == 'heritage-assistant') {
          setSelectedChat(chatID)
          loadChatUser()
        }

        const shouldScrollAfterRealtime =
          isAtBottom() || isCurrentUserMessage(msg, userInfo)

        setChatMessages(prev => {
          const incomingTempId = getMessageClientTempId(msg)
          const idx = prev.findIndex(
            c =>
              c.id === msg.id ||
              (incomingTempId && getMessageClientTempId(c) === incomingTempId)
          )
          if (idx !== -1) {
            if (msg.isSeenUpdate || msg.IsSeenUpdate) {
              console.log('[chat-seen:realtime-page-received]', {
                selectedChat,
                messageId: msg?.id,
                seenBy: msg?.seenBy,
                msg
              })
            }
            const next = [...prev]
            next[idx] = { ...next[idx], ...msg, isPending: false }
            if (msg.isSeenUpdate || msg.IsSeenUpdate) {
              console.log('[chat-seen:realtime-page-merged]', {
                messageId: msg?.id,
                beforeSeenBy: prev[idx]?.seenBy,
                incomingSeenBy: msg?.seenBy,
                afterSeenBy: next[idx]?.seenBy
              })
            }
            chatMessageHistoryRef.current = mergeChatMessagesById(
              chatMessageHistoryRef.current,
              [next[idx]]
            )
            return next
          }

          if (msg.isSeenUpdate || msg.IsSeenUpdate) {
            console.log('[chat-seen:realtime-page-miss]', {
              selectedChat,
              messageId: msg?.id,
              seenBy: msg?.seenBy,
              currentMessageIds: prev.map(item => item.id)
            })
            return prev
          }

          // Xử lý chatFiles nếu có
          let files = []

          // Nếu có chatFiles
          if (msg.chatFiles) {
            const parsedFiles = safeParseFiles(msg.chatFiles)

            if (Array.isArray(parsedFiles)) {
              files = normalizeChatFiles(parsedFiles)
            }
          }
          // Nếu đã có files được xử lý
          else if (msg.files && Array.isArray(msg.files)) {
            files = normalizeChatFiles(msg.files)
          }

          const seenBy = normalizeSeenUsers(msg.seenBy)

          const isCurrentUserSender = isCurrentUserMessage(msg, userInfo)

          const clientTempId = getMessageClientTempId(msg)
          const newMessage = {
            ...msg,
            id: msg.id || msg.ID || clientTempId,
            clientTempId,
            ClientTempID: clientTempId,
            content: msg.content ?? msg.Content ?? '',
            message: msg.messageType ?? msg.MessageType,
            messageType: msg.messageType ?? msg.MessageType,
            sender: isCurrentUserSender ? 'me' : 'other',
            timestamp: msg.createdDate || msg.timestamp || new Date(),
            avatar: msg.avatar,
            senderName: msg.senderName,
            files: files,
            chatLinks: msg.chatLinks || msg.ChatLinks || '',
            isUnsend: msg.isUnsend || false,
            eventID: msg.eventID ?? msg.EventID ?? null,
            eventType: msg.eventType ?? msg.EventType ?? null,
            isPin: msg.isPin || msg.IsPin || false,
            NotePin: msg.notePin || msg.NotePin || false,
            seenBy: seenBy,
            ListUserJoinReminder:
              msg.listUserJoinRemind || msg.ListUserJoinReminder || [],
            isPending: false
          }
          chatMessageHistoryRef.current = mergeChatMessagesById(
            chatMessageHistoryRef.current,
            [newMessage]
          )
          setHasMoreMessages(
            prev.length + 1 < chatMessageHistoryRef.current.length
          )
          // Only auto-scroll when the user is already reading the latest messages.
          if (shouldScrollAfterRealtime) {
            requestAnimationFrame(() => scrollToBottom())
          }

          return [...prev, newMessage]
        })
      }

      if (msg.isSeenUpdate || msg.IsSeenUpdate) {
        return
      }

      setSortDelay(prev => prev + 1)

      setUserChatList(prev => {
        let isIndividualChat = msg.chatType === ChatConstants.Type.PRIVATE

        if (!msg.chatType && msg.chatUsers && msg.chatUsers !== null) {
          try {
            const chatUsers = JSON.parse(msg.chatUsers || '[]')
            isIndividualChat = Array.isArray(chatUsers) && chatUsers.length <= 2
          } catch (e) {
            isIndividualChat = false
          }
        }

        if (msg.chatType && msg.chatType === ChatConstants.Type.GROUP) {
          return prev
        }
        if (!isIndividualChat) {
          return prev
        }

        const existingChatIndex = prev.findIndex(chat => chat.id === chatID)
        if (existingChatIndex !== -1) {
          return prev.map(chat => {
            if (chat.id === chatID) {
              const isFromOther = !isCurrentUserMessage(msg, userInfo)
              const nextUnreadCount = isFromOther
                ? (chat.unreadCount || 0) + 1
                : chat.unreadCount || 0

              if (isFromOther) {
                setStoredChatUnreadCount(chat.id, nextUnreadCount)
              }

              return {
                ...chat,
                lastMessage: msg.content || msg.Content,
                lastMessageDate:
                  msg.createdDate || msg.timestamp || new Date().toISOString(),
                lastMessageSender: msg.senderName || 'Unknown',
                 lastMessageSenderId: msg.senderID ?? msg.SenderID,
                 messageType: msg.messageType ?? msg.MessageType,
                 chatFiles: msg.chatFiles ?? msg.ChatFiles,
                 files: msg.files ?? msg.Files,
                unreadCount: nextUnreadCount,
                hasNotification: nextUnreadCount > 0
              }
            }
            return chat
          })
        } else {
          let chatUser = null
          let chatUserID = null
          try {
            const chatUsers = JSON.parse(msg.chatUsers || '[]')
            const otherUserId = chatUsers.find(
              u => u.UserID !== userInfo?.userID
            )?.UserID
            if (otherUserId && otherUserId === userInfo?.userID) {
              return prev
            }

            if (otherUserId) {
              chatUserID = otherUserId
              chatUser = individualChatList.find(
                user => user.id === otherUserId
              )
            }

            if (!chatUser) {
              chatUserID = msg.senderID
              if (chatUserID === userInfo?.userID) {
                return prev
              }
              chatUser = individualChatList.find(
                user => user.id === msg.senderID
              )
            }
          } catch (e) {
            chatUserID = msg.senderID
            if (chatUserID === userInfo?.userID) {
              return prev
            }
            chatUser = individualChatList.find(user => user.id === msg.senderID)
          }

          const existingChatWithUser = prev.find(
            chat =>
              chat.type === 'individual' &&
              (chat.id === chatUserID ||
                chat.name === (chatUser?.name || msg.senderName))
          )

          if (existingChatWithUser) {
            return prev.map(chat => {
              if (chat.id === existingChatWithUser.id) {
                const isFromOther = !isCurrentUserMessage(msg, userInfo)
                const nextUnreadCount = isFromOther
                  ? (chat.unreadCount || 0) + 1
                  : chat.unreadCount || 0

                if (isFromOther) {
                  setStoredChatUnreadCount(chat.id, nextUnreadCount)
                }

                return {
                  ...chat,
                  lastMessage: msg.content || msg.Content,
                  lastMessageDate:
                    msg.createdDate ||
                    msg.timestamp ||
                    new Date().toISOString(),
                  lastMessageSender: msg.senderName || 'Unknown',
                   lastMessageSenderId: msg.senderID ?? msg.SenderID,
                   messageType: msg.messageType ?? msg.MessageType,
                   chatFiles: msg.chatFiles ?? msg.ChatFiles,
                   files: msg.files ?? msg.Files,
                  unreadCount: nextUnreadCount,
                  hasNotification: nextUnreadCount > 0
                }
              }
              return chat
            })
          }

          if (chatUser) {
            const isFromOther = !isCurrentUserMessage(msg, userInfo)
            const nextUnreadCount = isFromOther ? 1 : 0

            if (isFromOther) {
              setStoredChatUnreadCount(chatID, nextUnreadCount)
            }

            const newChat = {
              id: chatID,
              type: 'individual',
              name: chatUser.name || msg.senderName || 'Unknown',
              avatar: chatUser.avatar || msg.senderAvatar,
              role: chatUser.role,
              department: chatUser.department,
              lastMessage: msg.content || msg.Content,
              lastMessageDate:
                msg.createdDate || msg.timestamp || new Date().toISOString(),
              lastMessageSender: msg.senderName || 'Unknown',
               lastMessageSenderId: msg.senderID ?? msg.SenderID,
               messageType: msg.messageType ?? msg.MessageType,
               chatFiles: msg.chatFiles ?? msg.ChatFiles,
               files: msg.files ?? msg.Files,
              unreadCount: nextUnreadCount,
              isOnline: onlineUsers.includes(chatUserID),
              hasNotification: nextUnreadCount > 0,
              createdDate:
                msg.createdDate || msg.timestamp || new Date().toISOString(),
              userID: chatUserID
            }

            if (!isFromOther) {
              setTimeout(() => {
                setSelectedChat(chatID)
                setActiveTab('individual')
              }, 100)
            }

            return [newChat, ...prev]
          }

          return prev
        }
      })

      setGroupChatList(prev => {
        // Chỉ xử lý tin nhắn từ group chat (GROUP)
        // Fallback: nếu không có chatType, check theo chatUsers (group thường có >2 users)
        let isGroupChat = msg.chatType === ChatConstants.Type.GROUP

        if (!msg.chatType && msg.chatUsers && msg.chatUsers !== null) {
          try {
            const chatUsers = JSON.parse(msg.chatUsers || '[]')
            isGroupChat = Array.isArray(chatUsers) && chatUsers.length > 2
          } catch (e) {
            isGroupChat = false
          }
        }

        if (msg.chatType && msg.chatType === ChatConstants.Type.PRIVATE) {
          return prev
        }
        if (!isGroupChat) {
          return prev
        }

        const existingChatIndex = prev.findIndex(chat => chat.id === chatID)

        if (existingChatIndex !== -1) {
          return prev.map(chat => {
            if (chat.id === chatID) {
              const isFromOther = !isCurrentUserMessage(msg, userInfo)
              let newUnreadCount = chat.unreadCount || 0
              if (isFromOther) {
                newUnreadCount += 1
                setStoredChatUnreadCount(chat.id, newUnreadCount)
              }

              return {
                ...chat,
                lastMessage: msg.content || msg.Content,
                lastMessageDate:
                  msg.createdDate || msg.timestamp || new Date().toISOString(),
                lastMessageSender: msg.senderName || 'Unknown',
                 lastMessageSenderId: msg.senderID ?? msg.SenderID,
                 messageType: msg.messageType ?? msg.MessageType,
                 chatFiles: msg.chatFiles ?? msg.ChatFiles,
                 files: msg.files ?? msg.Files,
                unreadCount: newUnreadCount,
                hasNotification: newUnreadCount > 0
              }
            }
            return chat
          })
        } else if (msg.chatType === ChatConstants.Type.GROUP) {
          const isFromOther = !isCurrentUserMessage(msg, userInfo)
          const nextUnreadCount = isFromOther ? 1 : 0

          if (isFromOther) {
            setStoredChatUnreadCount(chatID, nextUnreadCount)
          }

          const newGroupChat = {
            id: chatID,
            type: 'group',
            name: msg.chatName || 'Nhóm mới',
            avatar: msg.chatAvatar || '/user-groups.png',
            lastMessage: msg.content || msg.Content,
            lastMessageDate:
              msg.createdDate || msg.timestamp || new Date().toISOString(),
            lastMessageSender: msg.senderName || 'Unknown',
            lastMessageSenderId: msg.senderID ?? msg.SenderID,
            messageType: msg.messageType ?? msg.MessageType,
            chatFiles: msg.chatFiles ?? msg.ChatFiles,
            files: msg.files ?? msg.Files,
            unreadCount: nextUnreadCount,
            hasNotification: nextUnreadCount > 0,
            countUser: msg.countUser || 2,
            createdDate:
              msg.createdDate || msg.timestamp || new Date().toISOString()
          }

          // Auto-focus vào group chat mới khi user gửi tin nhắn (không phải nhận)
          if (!isFromOther) {
            setTimeout(() => {
              setSelectedChat(chatID)
              setActiveTab('groups')
            }, 100)
          }

          // Thêm nhóm mới vào đầu danh sách
          return [newGroupChat, ...prev]
        }

        return prev
      })
    })

    return unregister
  }, [registerChatCallback, replaceChatsUrl, resolveActiveRealtimeChat, selectedChat, userInfo])

  // useEffect để xử lý URL parameter và tự động chọn chat
  useEffect(() => {
    if (pendingLocalTabRef.current) return

    const chatId = searchParams.get('id') || searchParams.get('chatId')
    if (chatId && chatId !== selectedChat) {
      const autoSelectChat = () => {
        const individualChat = userChatList.find(chat => chat.id === chatId)
        if (individualChat) {
          setActiveTab('individual')
          handleChatSelect(chatId, true) // fromUrl = true to preserve notifications
          return
        }

        const unchattedUser = individualChatList.find(chat => chat.id === chatId)
        if (unchattedUser) {
          setActiveTab('individual')
          handleChatSelect(chatId, true)
          return
        }

        const groupChat = groupChatList.find(chat => chat.id === chatId)
        if (groupChat) {
          setActiveTab('groups')
          handleChatSelect(chatId, true) // fromUrl = true to preserve notifications
          return
        }

        if (
          userChatList.length === 0 &&
          groupChatList.length === 0 &&
          individualChatList.length === 0
        ) {
          setTimeout(autoSelectChat, 500)
        }
      }

      autoSelectChat()
    }
  }, [searchParams, userChatList, groupChatList, individualChatList, selectedChat])

  useEffect(() => {
    if (selectedChat && activeTab === 'groups') {
      loadUserBychatID(selectedChat)
    } else {
      setGroupMembers([])
    }

    if (selectedChat) {
      loadPollsByChatID(selectedChat)
    }

    if (selectedChat) {
      loadRemindersByChatID(selectedChat)
    }
  }, [selectedChat, activeTab])

  useEffect(() => {
    if (sortDelay > 0) {
      const timer = setTimeout(() => {
        setSortDelay(0)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [sortDelay])

  useEffect(() => {
    if (selectedChat && selectedChat !== 'heritage-assistant') {
      if (!isExistingChatId(selectedChat)) {
        if (activeTab === CHAT_TABS.individual) {
          const pendingSelectedChat = selectedChat
          const pendingSelectedChatKey = normalizeChatId(pendingSelectedChat)
          const lastUnresolved = unresolvedPrivateSelectionRef.current
          const wasRecentlyChecked =
            lastUnresolved.chatId === pendingSelectedChatKey &&
            Date.now() - lastUnresolved.checkedAt < 30000

          if (wasRecentlyChecked) {
            clearMessagesForUnresolvedPrivateSelection(pendingSelectedChat)
            return
          }

          resolvePrivateChatSelection(pendingSelectedChat)
            .then(resolvedChatId => {
              if (
                resolvedChatId ||
                normalizeChatId(selectedChatRef.current) !== pendingSelectedChatKey
              ) {
                return
              }

              unresolvedPrivateSelectionRef.current = {
                chatId: pendingSelectedChatKey,
                checkedAt: Date.now()
              }
              clearMessagesForUnresolvedPrivateSelection(pendingSelectedChat)
            })
            .catch(error => {
              console.warn('Error resolving private chat selection:', error)
              if (normalizeChatId(selectedChatRef.current) !== pendingSelectedChatKey) {
                return
              }

              unresolvedPrivateSelectionRef.current = {
                chatId: pendingSelectedChatKey,
                checkedAt: Date.now()
              }
              clearMessagesForUnresolvedPrivateSelection(pendingSelectedChat)
            })
          return
        }

        clearMessagesForUnresolvedPrivateSelection(selectedChat)
        return
      }
      loadMessages(selectedChat)

      if (activeTab === 'groups' && selectedChat) {
        loadUserReq(selectedChat)
      }

      if (chatsWithNewMembers.has(selectedChat)) {
        setTimeout(() => {
          loadMessages(selectedChat)
          if (activeTab === 'groups' && selectedChat) {
            loadUserReq(selectedChat)
          }
        }, 1000)
      }
    }
  }, [selectedChat, chatsWithNewMembers, activeTab, isExistingChatId])

  // Listen for unread count changes để sync với ChatSidebar
  useEffect(() => {
    const handleUnreadCountChange = event => {
      if (event.detail && event.detail.chatId) {
        const { chatId, count } = event.detail

        // Update userChatList
        setUserChatList(prev =>
          prev.map(chat =>
            normalizeChatId(chat.id) === normalizeChatId(chatId) ||
            normalizeChatId(chat.chatID) === normalizeChatId(chatId)
              ? { ...chat, unreadCount: count, hasNotification: count > 0 }
              : chat
          )
        )

        // Update groupChatList
        setGroupChatList(prev =>
          prev.map(chat =>
            normalizeChatId(chat.id) === normalizeChatId(chatId) ||
            normalizeChatId(chat.chatID) === normalizeChatId(chatId)
              ? { ...chat, unreadCount: count, hasNotification: count > 0 }
              : chat
          )
        )
      }
    }

    window.addEventListener('unreadCountChanged', handleUnreadCountChange)

    return () => {
      window.removeEventListener('unreadCountChanged', handleUnreadCountChange)
    }
  }, [])

  const loadUserBychatID = async (chatId = selectedChatRef.current) => {
    const requestChatId = normalizeChatId(chatId)

    try {
      if (!requestChatId) {
        setGroupMembers([])
        return
      }

      const users = await getListUserByChatID(requestChatId, userInfo?.userID)
      if (normalizeChatId(selectedChatRef.current) !== requestChatId) return

      setGroupMembers(users.data.data)
    } catch (error) {
      console.error('Error loading users by chat ID:', error)
    }
  }

  const loadPollsByChatID = async chatID => {
    try {
      if (!chatID) return
      const response = await getPollsByChatID(chatID)
      if (response && response.data) {
        const pollsData = response.data.data || []
        setPolls(pollsData)
      }
    } catch (error) {
      console.error('Error loading polls by chat ID:', error)
      setPolls([])
    }
  }

  const loadRemindersByChatID = async chatID => {
    try {
      if (!chatID) return
      const response = await getRemindersByChatID(chatID)
      if (response && response.data) {
        const remindersData = response.data.data || []
        setReminders(remindersData)
      }
    } catch (error) {
      console.error('Error loading reminders by chat ID:', error)
      setReminders([])
    }
  }

  // Kiểm tra xem người dùng hiện tại có phải là trưởng nhóm không
  useEffect(() => {
    if (userInfo && groupMembers && groupMembers.length > 0) {
      const currentUserId = getCurrentUserId(userInfo)
      const currentUserMember = groupMembers.find(
        member => getChatMemberId(member) === currentUserId
      )

      setIsCurrentUserLeader(
        isCurrentMemberChatManager(currentUserMember, currentUserId)
      )
    } else {
      setIsCurrentUserLeader(false)
    }
  }, [userInfo, groupMembers])

  const safeParseFiles = jsonString => {
    if (!jsonString) return []

    if (Array.isArray(jsonString)) return jsonString
    if (typeof jsonString !== 'string') return []

    try {
      return JSON.parse(jsonString)
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
      return JSON.parse(jsonString)
    } catch (e) {
      try {
        const seenByArray = []
        // Regex để tìm ID, FileName và File path
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
            const userIDMatch = userIDMatches[i].match(
              /\"UserID\":\"([^\"]+)\"/
            )
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
        console.error('Không thể trích xuất thông tin file:', regexError)
        return []
      }
    }
  }

  const normalizeSeenUsers = seenBy =>
    safeParseSeenBy(seenBy)
      .map(normalizeSeenUser)
      .filter(user => user.userID || user.id)

  const normalizeIncomingChatMessage = msg => {
    if (!msg) return null

    const clientTempId = getMessageClientTempId(msg)
    const files = msg.chatFiles
      ? normalizeChatFiles(safeParseFiles(msg.chatFiles))
      : Array.isArray(msg.files)
      ? normalizeChatFiles(msg.files)
      : []

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
      seenBy: normalizeSeenUsers(msg.seenBy),
      ListUserJoinReminder:
        msg.listUserJoinRemind || msg.ListUserJoinReminder || [],
      replyToID: msg.replyToID || msg.ReplyToID || null,
      replyToMessage: msg.replyToMessage
    }
  }

  const messageListRef = useRef(null)

  const scrollToBottom = ({ smooth = true } = {}) => {
    const scrollLatest = () => {
      const box = messageListRef.current
      if (!box) return

      if (smooth) {
        box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
        return
      }

      const previousScrollBehavior = box.style.scrollBehavior
      box.style.scrollBehavior = 'auto'
      box.scrollTop = box.scrollHeight
      box.scrollTo({ top: box.scrollHeight, behavior: 'auto' })
      box.style.scrollBehavior = previousScrollBehavior
    }

    if (smooth) {
      setTimeout(() => {
        requestAnimationFrame(scrollLatest)
      }, 40)
      return
    }

    scrollLatest()
    requestAnimationFrame(scrollLatest)
    setTimeout(scrollLatest, 80)
  }

  const isAtBottom = () => {
    const box = messageListRef.current
    if (!box) return false
    return box.scrollHeight - box.scrollTop - box.clientHeight < 100
  }

  const getPagedChatMessages = (sourceMessages, page = 1) => {
    const allMessages = Array.isArray(sourceMessages) ? sourceMessages : []
    const loadedCount = Math.min(
      allMessages.length,
      Math.max(page, 1) * CHAT_MESSAGE_PAGE_SIZE
    )
    const startIndex = Math.max(allMessages.length - loadedCount, 0)

    return allMessages.slice(startIndex)
  }

  const resetMessagePagination = () => {
    chatMessageHistoryRef.current = []
    isLoadingOlderMessagesRef.current = false
    setMessagePage(1)
    setHasMoreMessages(false)
    setIsLoadingOlderMessages(false)
  }

  const mergeChatMessagesById = (...messageGroups) => {
    const byId = new Map()

    messageGroups.flat().forEach(msg => {
      const messageId = msg?.id || msg?.ID || getMessageClientTempId(msg)
      if (!messageId) return

      const message = { ...msg, id: messageId }
      const clientTempId = getMessageClientTempId(message)
      const matchingKey = clientTempId
        ? Array.from(byId.entries()).find(
            ([, item]) => getMessageClientTempId(item) === clientTempId
          )?.[0]
        : null

      const key = matchingKey || String(messageId)
      const merged = { ...(byId.get(key) || {}), ...message }

      if (matchingKey && !String(messageId).startsWith('tmp-')) {
        byId.delete(matchingKey)
        byId.set(String(messageId), merged)
        return
      }

      byId.set(key, merged)
    })

    return Array.from(byId.values()).sort(
      (a, b) =>
        new Date(a.timestamp || a.createdDate || 0) -
        new Date(b.timestamp || b.createdDate || 0)
    )
  }

  const upsertChatMessage = (incomingMessage, { scroll = false, instant = false } = {}) => {
    const nextMessage = normalizeIncomingChatMessage(incomingMessage)
    if (!nextMessage?.id) return null

    setChatMessages(() => {
      const nextHistory = mergeChatMessagesById(
        chatMessageHistoryRef.current,
        [nextMessage]
      )
      const nextVisible = getPagedChatMessages(nextHistory, messagePage)
      chatMessageHistoryRef.current = nextHistory
      setHasMoreMessages(nextVisible.length < nextHistory.length)
      return nextVisible
    })

    if (scroll) {
      if (instant) {
        scrollToBottom({ smooth: false })
      } else {
        setTimeout(() => scrollToBottom(), 40)
      }
    }

    return nextMessage
  }

  useEffect(() => {
    setIndividualChatList(prev => {
      return prev.map(user => ({
        ...user,
        isOnline: onlineUsers.includes(user.id)
      }))
    })

    // Cập nhật trạng thái online cho chat cá nhân
    setUserChatList(prev => {
      return prev.map(chat => {
        const actualUserID = chat.userID || chat.id

        return {
          ...chat,
          isOnline: onlineUsers.includes(actualUserID)
        }
      })
    })

    // Cập nhật trạng thái online cho chat nhóm
    setGroupChatList(prev => {
      return prev.map(chat => {
        const onlineMembersCount = chat.members
          ? chat.members.filter(member => onlineUsers.includes(member.id))
            .length
          : 0

        return {
          ...chat,
          onlineMembersCount,
          isActive: onlineMembersCount > 0
        }
      })
    })
  }, [onlineUsers])


  useEffect(() => {
    if (activeTab === 'groups' && selectedChat && !loadUserReqRef.current) {
      loadUserReqRef.current = true

      setTimeout(() => {
        loadUserReq(selectedChat).finally(() => {
          setTimeout(() => {
            loadUserReqRef.current = false
          }, 100)
        })
      }, 0)
    }
  }, [activeTab, selectedChat])

  const loadUserReq = async (chatId = selectedChatRef.current) => {
    const requestChatId = normalizeChatId(chatId)

    try {
      if (!requestChatId || activeTabRef.current !== 'groups') {
        setUserRequests([])
        setUserRequestsChatId(null)
        return []
      }
      const res = await loadUserRequest(requestChatId)
      const requests = res.data.data || []
      const enrichedRequests = requests.map(request => {
        const requestOwnChatId = normalizeChatId(
          request.chatID ?? request.ChatID ?? request.chatId
        )
        const userInfo =
          individualChatList.find(user => user.id === request.userID) ||
          individualChatList.find(user => user.id === request.createdBy) ||
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
          chatID: requestOwnChatId || requestChatId,
          ChatID: requestOwnChatId || requestChatId,
          senderName: userInfo?.name || 'Người dùng không xác định',
          senderAvatar: userInfo?.avatar || '',
          senderRole: userInfo?.role || '',
          senderDepartment: userInfo?.department || ''
        }
      })

      const filteredRequests = enrichedRequests.filter(
        request =>
          normalizeChatId(request.chatID ?? request.ChatID ?? request.chatId) ===
          requestChatId
      )

      if (
        activeTabRef.current !== 'groups' ||
        normalizeChatId(selectedChatRef.current) !== requestChatId
      ) {
        return filteredRequests
      }

      setUserRequests(filteredRequests)
      setUserRequestsChatId(requestChatId)
      return filteredRequests
    } catch (error) {
      console.warn('Error loading user requests:', error)
      if (normalizeChatId(selectedChatRef.current) === requestChatId) {
        setUserRequests([])
        setUserRequestsChatId(requestChatId)
      }
      return []
    }
  }

  const loadChatUser = async () => {
    if (!userInfo?.userID) return []

    try {
      const res = await getGroupChats(ChatConstants.Type.PRIVATE, userInfo?.userID)
      const chatsWithOnlineStatus = (res.data.data || []).map(chat => {
        if (chat.id) knownChatIdsRef.current.add(chat.id)
        if (chat.chatID) knownChatIdsRef.current.add(chat.chatID)

        // Sync unread count từ localStorage
        const serverUnreadCount = getChatUnreadCount(chat)
        const storedUnreadCount = getStoredChatUnreadCount(chat.id)
        if (storedUnreadCount !== serverUnreadCount) {
          setStoredChatUnreadCount(chat.id, serverUnreadCount)
        }

        return hydrateChatPinState({
          ...chat,
          isOnline: onlineUsers.includes(chat.id),
          unreadCount: serverUnreadCount,
          hasNotification: serverUnreadCount > 0
        })
      })

      setUserChatList(chatsWithOnlineStatus)
      return chatsWithOnlineStatus
    } catch (error) {
      console.warn('Error fetching user chats:', error)
      return []
    }
  }
  const findPrivateChatByPeerId = (peerId, chats = userChatListRef.current) => {
    const targetId = normalizeChatId(peerId)
    if (!targetId) return null

    const currentUserId = getCurrentUserId(userInfo)

    return (
      (Array.isArray(chats) ? chats : []).find(chat => {
        const rawChatUsers = chat?.chatUsers ?? chat?.ChatUsers
        let chatUserIds = []

        if (rawChatUsers) {
          try {
            const parsedUsers =
              typeof rawChatUsers === 'string'
                ? JSON.parse(rawChatUsers)
                : rawChatUsers

            if (Array.isArray(parsedUsers)) {
              chatUserIds = parsedUsers
                .map(user => user?.UserID ?? user?.userID ?? user?.id ?? user?.ID)
                .map(normalizeChatId)
                .filter(id => id && id !== currentUserId)
            }
          } catch {
            chatUserIds = []
          }
        }

        const ids = [
          chat?.id,
          chat?.ID,
          chat?.chatID,
          chat?.ChatID,
          chat?.userID,
          chat?.UserID,
          ...getChatPeerIds(chat, currentUserId),
          ...chatUserIds
        ]
          .map(normalizeChatId)
          .filter(Boolean)

        return ids.includes(targetId)
      }) || null
    )
  }

  const getResolvedChatId = chat =>
    normalizeChatId(chat?.id ?? chat?.ID ?? chat?.chatID ?? chat?.ChatID)

  const switchToResolvedPrivateChat = (chat, fallbackId = '') => {
    const actualChatId = getResolvedChatId(chat)
    if (!actualChatId) return ''

    knownChatIdsRef.current.add(actualChatId)
    unresolvedPrivateSelectionRef.current = { chatId: null, checkedAt: 0 }

    if (actualChatId !== normalizeChatId(fallbackId)) {
      selectedChatRef.current = actualChatId
      latestLoadChatIdRef.current = actualChatId
      setSelectedChat(actualChatId)
      replaceChatsUrl(CHAT_TABS.individual, { chatId: actualChatId })
    }

    return actualChatId
  }

  const resolvePrivateChatSelection = async (chatId, options = {}) => {
    const targetId = normalizeChatId(chatId)
    if (
      !targetId ||
      targetId === 'heritage-assistant' ||
      activeTabRef.current !== CHAT_TABS.individual
    ) {
      return ''
    }

    const localMatch = findPrivateChatByPeerId(targetId)
    if (localMatch) {
      const actualChatId = getResolvedChatId(localMatch)
      return options.switchSelection === false
        ? actualChatId
        : switchToResolvedPrivateChat(localMatch, targetId)
    }

    const latestChats = await loadChatUser()
    const latestMatch = findPrivateChatByPeerId(targetId, latestChats)
    if (!latestMatch) return ''

    const actualChatId = getResolvedChatId(latestMatch)
    return options.switchSelection === false
      ? actualChatId
      : switchToResolvedPrivateChat(latestMatch, targetId)
  }

  const clearMessagesForUnresolvedPrivateSelection = chatId => {
    latestLoadChatIdRef.current = chatId
    setChatMessages([])
    resetMessagePagination()
    setSelectedChatLinkId(null)
    setIsChatsAI(false)
  }
  const loadMessages = async (chatId, options = {}) => {
    if (!chatId) {
      console.warn('loadMessages: chatId is null or undefined')
      return
    }

    const {
      showPaneLoading = false,
      scrollToBottomAfterLoad = true,
      force = false,
      silent = false
    } = options
    if (!showPaneLoading && !force) {
      const now = Date.now()
      const lastLoad = lastSilentMessageLoadRef.current
      if (lastLoad.chatId === chatId && now - lastLoad.at < 350) {
        return
      }
      lastSilentMessageLoadRef.current = { chatId, at: now }
    }

    if (showPaneLoading) {
      messagePaneLoadingChatRef.current = chatId
      setIsMessagesLoading(true)
    }

    latestLoadChatIdRef.current = chatId
    if (chatId !== 'heritage-assistant' && !isExistingChatId(chatId)) {
      setChatMessages([])
      resetMessagePagination()
      setSelectedChatLinkId(null)
      setIsChatsAI(false)
      if (showPaneLoading && messagePaneLoadingChatRef.current === chatId) {
        setIsMessagesLoading(false)
        messagePaneLoadingChatRef.current = null
      }
      return
    }

    setIsChatsAI(false)
    try {
      if (!silent) setIsLoading(true)

      if (chatId === 'heritage-assistant') {
        setIsChatsAI(true) // Set AI flag for heritage assistant
        const heritageMessages = [
          {
            id: 'heritage-1',
            content:
              'Chào mừng bạn đến với trợ lý ảo của Trung tâm Bảo tồn và Phát huy Giá trị Di tích Lịch sử - Văn hoá Thành phố Hồ Chí Minh. Bạn có thể hỏi mình về văn bản pháp luật liên quan đến công nghệ và di sản.',
            timestamp: new Date(Date.now() - 60000), // 1 phút trước
            sender: 'Trợ lý trung tâm bảo tồn di tích',
            avatar: '/TTBT_icon_anim_idle.gif',
            senderName: 'Trợ lý trung tâm bảo tồn di tích'
          }
        ]
        if (latestLoadChatIdRef.current !== chatId) return
        chatMessageHistoryRef.current = heritageMessages
        setMessagePage(1)
        setHasMoreMessages(false)
        setIsLoadingOlderMessages(false)
        setChatMessages(heritageMessages)

        if (scrollToBottomAfterLoad) {
          scrollToBottom({ smooth: false })
        }
        if (!silent) setIsLoading(false)
        return
      }

      const res = await loadMes(chatId, { currentUserID: userInfo?.userID })
      if (latestLoadChatIdRef.current !== chatId) return

      setIsChatsAI(res?.data?.data?.dataChat?.isAI)

      if (res?.data?.data?.dataChat?.linkId) {
        setSelectedChatLinkId(res?.data?.data?.dataChat?.linkId)
      }

      const messages = res.data.data.dataChatMessage || []

      const safeParseFiles = jsonString => {
        if (!jsonString) return []
        if (Array.isArray(jsonString)) return jsonString

        if (typeof jsonString !== 'string') return []

        try {
          // Thử parse bình thường
          return JSON.parse(jsonString)
        } catch (e) {
          // Thử trích xuất thông tin bằng regex
          try {
            const files = []
            // Regex để tìm ID, FileName và File path
            const idMatches = jsonString.match(/\"ID\":\"([^\"]+)\"/g)
            const fileNameMatches = jsonString.match(
              /\"FileName\":\"([^\"]+)\"/g
            )
            const fileMatches = jsonString.match(/\"File\":\"([^\"]+)\"/g)
            const extensionMatches = jsonString.match(
              /\"Extension\":\"([^\"]+)\"/g
            )

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
                    Extension: extensionMatch ? extensionMatch[1] : ''
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
          return JSON.parse(jsonString)
        } catch (e) {
          // Thử trích xuất thông tin bằng regex
          try {
            const seenByArray = []
            // Regex để tìm ID, FileName và File path
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
                const userIDMatch = userIDMatches[i].match(
                  /\"UserID\":\"([^\"]+)\"/
                )
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
            console.error('Không thể trích xuất thông tin file:', regexError)
            return []
          }
        }
      }

      const mockMessages = messages.map(msg => {
        // Xử lý chatFiles an toàn
        let files = []

        if (msg.chatFiles) {
          const parsedFiles = safeParseFiles(msg.chatFiles)

          if (Array.isArray(parsedFiles)) {
            files = normalizeChatFiles(parsedFiles)
          }
        }

        const seenBy = normalizeSeenUsers(msg.seenBy)

        return {
          id: msg.id,
          content: msg.content,
          message: msg.messageType ?? msg.MessageType,
          messageType: msg.messageType ?? msg.MessageType,
          timestamp: msg.createdDate,
          sender: isCurrentUserMessage(msg, userInfo) ? 'me' : 'other',
          avatar: msg.senderAvatar,
          senderName: msg.senderName,
          senderID: msg.senderID || msg.SenderID,
          files: files,
          chatLinks: msg.chatLinks || msg.ChatLinks || '',
          isUnsend: msg.isUnsend || false,
          eventID: msg.eventID ?? msg.EventID ?? null,
          eventType: msg.eventType ?? msg.EventType ?? null,
          isPin: msg.isPin || msg.IsPin || false,
          NotePin: msg.notePin || msg.NotePin || false,
          replyToID: msg.replyToID || msg.ReplyToID || null,
          seenBy: seenBy,
          ListUserJoinReminder:
            msg.listUserJoinRemind || msg.ListUserJoinReminder || []
        }
      })

      // Associate replies with their parent messages
      const messagesWithReplyInfo = mockMessages.map(msg => {
        if (msg.replyToID) {
          const parentMessage = mockMessages.find(m => m.id === msg.replyToID)
          if (parentMessage) {
            return {
              ...msg,
              replyToMessage: {
                id: parentMessage.id,
                content: parentMessage.content,
                sender: parentMessage.sender,
                senderName: parentMessage.senderName,
                files: parentMessage.files
              }
            }
          }
        }
        return msg
      })

      const sortedMessages = messagesWithReplyInfo.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      )

      const messagesWithSeenBy = sortedMessages.map(msg => {
        // Process seenBy data
        if (msg.seenBy) {
          try {
            if (typeof msg.seenBy === 'string') {
              let cleanedSeenBy = msg.seenBy
              if (cleanedSeenBy.includes('][')) {
                const parts = cleanedSeenBy.split('][')
                cleanedSeenBy = parts[0] + ']'
              }

              cleanedSeenBy = cleanedSeenBy.replace(/,\{[^}]*$/, '')

              const parsed = JSON.parse(cleanedSeenBy)
              return {
                ...msg,
                seenBy: JSON.stringify(
                  Array.isArray(parsed) ? parsed : [parsed]
                )
              }
            } else if (Array.isArray(msg.seenBy)) {
              return {
                ...msg,
                seenBy: JSON.stringify(msg.seenBy)
              }
            }
          } catch (e) {
            console.warn('Failed to parse seenBy for message:', msg.id, e)
            return {
              ...msg,
              seenBy: null
            }
          }
        }
        return msg
      })

      chatMessageHistoryRef.current = messagesWithSeenBy
      setMessagePage(1)
      setHasMoreMessages(messagesWithSeenBy.length > CHAT_MESSAGE_PAGE_SIZE)
      setIsLoadingOlderMessages(false)
      isLoadingOlderMessagesRef.current = false
      setChatMessages(getPagedChatMessages(messagesWithSeenBy, 1))
      const pollMessages = sortedMessages.filter(
        msg => msg.eventType === EventType.Type.Vote
      )
      if (pollMessages.length > 0) {
        loadPollsByChatID(chatId)
      }
      if (scrollToBottomAfterLoad) {
        scrollToBottom({ smooth: false })
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      if (latestLoadChatIdRef.current === chatId) {
        setChatMessages([])
        resetMessagePagination()
        setSelectedChatLinkId(null)
        setIsChatsAI(false)
      }
    } finally {
      if (!silent && latestLoadChatIdRef.current === chatId) {
        setIsLoading(false)
      }
      if (showPaneLoading && messagePaneLoadingChatRef.current === chatId) {
        setIsMessagesLoading(false)
        messagePaneLoadingChatRef.current = null
      }
    }
  }

  const loadOlderMessages = () => {
    const history = chatMessageHistoryRef.current || []
    if (
      isLoadingOlderMessagesRef.current ||
      isLoadingOlderMessages ||
      !hasMoreMessages ||
      chatMessages.length >= history.length
    ) {
      return
    }

    const box = messageListRef.current
    const previousScrollHeight = box?.scrollHeight || 0
    const previousScrollTop = box?.scrollTop || 0
    const nextPage = messagePage + 1
    const nextMessages = getPagedChatMessages(history, nextPage)

    isLoadingOlderMessagesRef.current = true
    setIsLoadingOlderMessages(true)
    setMessagePage(nextPage)
    setHasMoreMessages(nextMessages.length < history.length)
    setChatMessages(nextMessages)

    setTimeout(() => {
      requestAnimationFrame(() => {
        const currentBox = messageListRef.current
        if (currentBox) {
          const previousScrollBehavior = currentBox.style.scrollBehavior
          currentBox.style.scrollBehavior = 'auto'
          currentBox.scrollTop =
            currentBox.scrollHeight - previousScrollHeight + previousScrollTop
          currentBox.style.scrollBehavior = previousScrollBehavior
        }

        isLoadingOlderMessagesRef.current = false
        setIsLoadingOlderMessages(false)
      })
    }, 0)
  }

  const loadData = async () => {
    if (!userInfo?.userID) return []

    try {
      const res = await getGroupChats(ChatConstants.Type.GROUP, userInfo?.userID)
      const groupsWithStatusAndCount = (res.data.data || []).map(chat => {
        const onlineMembersCount = chat.members
          ? chat.members.filter(member => onlineUsers.includes(member.id))
            .length
          : 0

        const totalMembers =
          chat.countUser || (chat.members ? chat.members.length : 0)

        // Sync unread count từ localStorage
        const serverUnreadCount = getChatUnreadCount(chat)
        const storedUnreadCount = getStoredChatUnreadCount(chat.id)
        if (storedUnreadCount !== serverUnreadCount) {
          setStoredChatUnreadCount(chat.id, serverUnreadCount)
        }

        const finalUnreadCount = serverUnreadCount

        // Add isNew property based on notification data
        const isNew = notificationData
          ? notificationData.some(
            x =>
              x.type == NotificationsConstants.types.Chat &&
              x.refID == chat.id &&
              !x.isRead
          )
          : false

        return hydrateChatPinState({
          ...chat,
          unreadCount: finalUnreadCount,
          onlineMembersCount,
          isActive: onlineMembersCount > 0,
          totalMembers,
          isNew
        })
      })

      setGroupChatList(groupsWithStatusAndCount)
      return groupsWithStatusAndCount
    } catch (error) {
      console.error('❌ Error fetching group chats:', error)
      return []
    }
  }
  const loadDataUser = async () => {
    if (!userInfo?.userID) return []

    try {
      const res = await fetchUsersDropdownForChats()
      const users = res.data.data.users || []
      const uniqueUsers = users.filter(
        (user, index, self) =>
          user.id !== userInfo.userID &&
          index === self.findIndex(u => u.id === user.id)
      )
      const individualChats = uniqueUsers.map(user => {
        let isNew = false

        if (notificationData && userChatList.length > 0) {
          const userChat = userChatList.find(chat => {
            return (
              chat.name?.includes(user.fullName) ||
              chat.lastMessageSender?.includes(user.fullName) ||
              (chat.userID && chat.userID === user.id)
            )
          })

          if (userChat) {
            const hasNotification = notificationData.some(
              x =>
                x.type == NotificationsConstants.types.Chat &&
                x.refID == userChat.id &&
                !x.isRead
            )

            isNew = hasNotification
          }
        }

        return {
          id: user.id,
          type: 'individual',
          name: user.fullName,
          avatar: user.avatar,
          role: user.roleName,
          department: user.departmentName,
          lastMessage: '',
          time: '',
          unreadCount: 0,
          isOnline: onlineUsers.includes(user.id),
          hasNotification: false,
          isNew
        }
      })

      setIndividualChatList(individualChats)
      return individualChats
    } catch (error) {
      console.error('Error fetching users for chats:', error)
      return []
    }
  }
  const updateChatTabLoadState = (tab, patch) => {
    setChatTabLoadState(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        ...patch
      }
    }))
  }

  const loadChatTab = async (tab = activeTab, options = {}) => {
    const tabKey = tab === CHAT_TABS.groups ? CHAT_TABS.groups : CHAT_TABS.individual
    const { force = false, silent = false } = options

    if (!userInfo?.userID) return []

    const currentState = chatTabLoadRef.current[tabKey]
    if (!force && currentState?.isLoaded) {
      return tabKey === CHAT_TABS.groups ? groupChatList : userChatList
    }

    if (currentState?.isLoading) {
      return []
    }

    const requestId = (currentState?.requestId || 0) + 1
    chatTabLoadRef.current[tabKey] = {
      ...currentState,
      isLoading: true,
      requestId
    }

    if (!silent) {
      updateChatTabLoadState(tabKey, {
        isLoading: true,
        error: null
      })
    }

    try {
      const result =
        tabKey === CHAT_TABS.groups
          ? await loadData()
          : await Promise.all([loadChatUser(), loadDataUser()])

      if (chatTabLoadRef.current[tabKey]?.requestId === requestId) {
        chatTabLoadRef.current[tabKey] = {
          ...chatTabLoadRef.current[tabKey],
          isLoaded: true,
          isLoading: false,
          error: null
        }
        updateChatTabLoadState(tabKey, {
          isLoaded: true,
          isLoading: false,
          error: null
        })
      }

      return result
    } catch (error) {
      console.error(`Error loading ${tabKey} chats:`, error)
      if (chatTabLoadRef.current[tabKey]?.requestId === requestId) {
        chatTabLoadRef.current[tabKey] = {
          ...chatTabLoadRef.current[tabKey],
          isLoading: false,
          error
        }
        updateChatTabLoadState(tabKey, {
          isLoading: false,
          error
        })
      }
      return []
    } finally {
      if (chatTabLoadRef.current[tabKey]?.requestId === requestId) {
        chatTabLoadRef.current[tabKey] = {
          ...chatTabLoadRef.current[tabKey],
          isLoading: false
        }
        updateChatTabLoadState(tabKey, {
          isLoading: false
        })
      }
    }
  }
  useEffect(() => {
    if (!userInfo?.userID) return

    let isCancelled = false

    loadChatTab(activeTab)
      .then(() => {
        if (isCancelled) return

        if (activeTab === CHAT_TABS.groups && pendingNewGroupSelection) {
          setTimeout(() => {
            setSelectedChat(pendingNewGroupSelection)
            loadMessages(pendingNewGroupSelection)
          }, 300)

          setTimeout(() => {
            setSelectedChat(pendingNewGroupSelection)
            setPendingNewGroupSelection(null)
          }, 800)
        }
      })
      .catch(error => {
        console.error(`❌ Error loading ${activeTab} chats:`, error)
      })

    return () => {
      isCancelled = true
    }
  }, [activeTab, userInfo?.userID])
  // Calculate notification counts for each tab
  const getNotificationCountsForTabs = async () => {
    if (!notificationData) return { individual: 0, groups: 0 }

    try {
      const chatNotifications = notificationData.filter(
        x =>
          (x.type == NotificationsConstants.types.Chat || x.type == '10') &&
          !x.isRead &&
          x.refID !== selectedChat // Exclude currently selected chat
      )

      const activeNotifications = chatNotifications

      const groupsCount = groupChatList.reduce((count, chat) => {
        const hasNotification = activeNotifications.some(
          x => x.refID == chat.id
        )
        return hasNotification ? count + 1 : count
      }, 0)

      const individualCount = activeNotifications.reduce(
        (count, notification) => {
          const isGroupNotification = groupChatList.some(
            chat => chat.id == notification.refID
          )
          return !isGroupNotification ? count + 1 : count
        },
        0
      )

      return { individual: individualCount, groups: groupsCount }
    } catch (error) {
      console.error('Error calculating notification counts:', error)
      return { individual: 0, groups: 0 }
    }
  }

  const handleTabChange = tab => {
    const nextTab = normalizeChatTab(tab)
    const currentUrlTab = normalizeChatTab(searchParams.get('tab'))
    const hasUrlChatId = Boolean(searchParams.get('id') || searchParams.get('chatId'))

    pendingLocalTabRef.current =
      currentUrlTab !== nextTab || hasUrlChatId ? nextTab : null
    setActiveTab(nextTab)
    setSelectedChat(null)
    setChatMessages([])
    resetMessagePagination()
    setUserRequests([]) // Clear user requests khi chuyển tab
    setShowGroupInfo(false)
    replaceChatsUrl(nextTab, { keepChatId: false })
  }

  // Force reload function để gọi khi cần reload ngay lập tức
  const forceReloadGroupData = async () => {
    if (userInfo) {
      try {
        const res = await getGroupChats(ChatConstants.Type.GROUP, userInfo?.userID)
        const groups = res.data.data || []

        const groupsWithStatusAndCount = groups.map(chat => {
          const onlineMembersCount = chat.members
            ? chat.members.filter(member => onlineUsers.includes(member.id))
              .length
            : 0

          const totalMembers =
            chat.countUser || (chat.members ? chat.members.length : 0)
          const serverUnreadCount = getChatUnreadCount(chat)
          const storedUnreadCount = getStoredChatUnreadCount(chat.id)
          if (storedUnreadCount !== serverUnreadCount) {
            setStoredChatUnreadCount(chat.id, serverUnreadCount)
          }
          const finalUnreadCount = serverUnreadCount

          return hydrateChatPinState({
            ...chat,
            unreadCount: finalUnreadCount,
            onlineMembersCount,
            isActive: onlineMembersCount > 0,
            totalMembers
          })
        })

        setGroupChatList(groupsWithStatusAndCount)

        return groupsWithStatusAndCount
      } catch (error) {
        console.error('❌ Error in force reload group chats:', error)
        return []
      }
    }
    return []
  }

  // Function để handle khi user được thêm vào group mới
  useEffect(() => {
    if (isConnected || !userInfo?.userID) return

    let isPolling = false
    const pollRealtimeFallback = async () => {
      if (isPolling) return
      if (typeof document !== 'undefined' && document.hidden) return

      isPolling = true
      try {
        let activeChatId = selectedChatRef.current
        if (
          activeChatId &&
          activeTabRef.current === CHAT_TABS.individual &&
          !isExistingChatId(activeChatId)
        ) {
          activeChatId =
            (await resolvePrivateChatSelection(activeChatId)) || activeChatId
        }

        await Promise.allSettled([
          loadChatUser(),
          forceReloadGroupData(),
          activeChatId && isExistingChatId(activeChatId)
            ? loadMessages(activeChatId, {
                force: true,
                silent: true,
                scrollToBottomAfterLoad: isAtBottom()
              })
            : Promise.resolve()
        ])
      } finally {
        isPolling = false
      }
    }

    const timer = setInterval(pollRealtimeFallback, 1000)
    pollRealtimeFallback()
    return () => clearInterval(timer)
  }, [isConnected, userInfo?.userID])

  const handleUserAddedToGroup = async chatID => {
    setPendingNewGroupSelection(chatID)

    if (activeTab !== 'groups') {
      setActiveTab('groups')
    } else {
      try {
        await forceReloadGroupData()

        setTimeout(async () => {
          await forceReloadGroupData()
          setTimeout(() => {
            setSelectedChat(chatID)
            loadMessages(chatID)
            setPendingNewGroupSelection(null)
          }, 500)
        }, 800)
      } catch (error) {
        console.error('❌ Error in handleUserAddedToGroup:', error)
      }
    }
  }

  // Handle chọn chat và load messages
  const handleChatSelect = async (chatId, fromUrl = false) => {
    let hasExistingChat = isExistingChatId(chatId)

    if (!hasExistingChat && activeTabRef.current === CHAT_TABS.individual) {
      const resolvedChatId = await resolvePrivateChatSelection(chatId, {
        switchSelection: false
      })

      if (resolvedChatId) {
        chatId = resolvedChatId
        knownChatIdsRef.current.add(resolvedChatId)
        unresolvedPrivateSelectionRef.current = { chatId: null, checkedAt: 0 }
        hasExistingChat = true
      }
    }

    const chatForSelection = [...userChatList, ...groupChatList].find(
      chat => chat.id === chatId || chat.chatID === chatId
    )
    const openingUnreadCount = hasExistingChat
      ? Math.max(
          getChatUnreadCount(chatForSelection),
          getStoredChatUnreadCount(chatId)
        )
      : 0

    setChatOpenUnreadSnapshot({
      chatId,
      unreadCount: openingUnreadCount
    })
    latestLoadChatIdRef.current = chatId
    setChatMessages([])
    resetMessagePagination()
    setSelectedChatLinkId(null)
    setIsChatsAI(false)
    setReplyToMessage(null)

    setUserChatList(prev => {
      return prev.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    })

    setGroupChatList(prev => {
      return prev.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    })

    // Clear tab notification counts khi mở chat
    setTabNotificationCounts({
      individual: 0,
      groups: 0
    })

    // Clear localStorage và dispatch event để sync với ChatSidebar
    if (chatId && hasExistingChat) {
      markChatAsRead(chatId)
    } else if (chatId && typeof window !== 'undefined') {
      localStorage.removeItem(`unreadCount_${chatId}`)
      window.dispatchEvent(
        new CustomEvent('unreadCountChanged', {
          detail: { chatId, count: 0 }
        })
      )
    }

    // Clear chat id from URL when user selects another chat, but keep tab query.
    const urlChatId = searchParams.get('id') || searchParams.get('chatId')
    if (urlChatId && urlChatId !== chatId) {
      replaceChatsUrl(activeTab, { keepChatId: false })
    }

    selectedChatRef.current = chatId
    setSelectedChat(chatId)
    setUserRequests([])
    setUserRequestsChatId(activeTab === 'groups' ? normalizeChatId(chatId) : null)
    if (chatId) {
      if (!hasExistingChat) {
        return
      }

      // Mark ALL related chat notifications as read (only if not from URL)
      if (notificationData && !fromUrl) {
        const relatedNotifications = notificationData.filter(
          x =>
            x.type == NotificationsConstants.types.Chat &&
            x.refID == chatId &&
            !x.isRead
        )

        if (relatedNotifications.length > 0) {
          // Update UI immediately - mark ALL notifications as read
          setNotificationData(prev =>
            prev.map(notification =>
              relatedNotifications.some(rn => rn.id === notification.id)
                ? { ...notification, isRead: true }
                : notification
            )
          )

          // Update tab notification counts immediately
          getNotificationCountsForTabs().then(counts => {
            setTabNotificationCounts(counts)
          })

          // Mark all notifications as read in background
          relatedNotifications.forEach(notification => {
            readNotification(notification.id).catch(error => {
              console.error('Error marking notification as read:', error)
              // Revert UI change if API fails for this specific notification
              setNotificationData(prev =>
                prev.map(n =>
                  n.id === notification.id ? { ...n, isRead: false } : n
                )
              )
              // Revert tab counts
              getNotificationCountsForTabs().then(counts => {
                setTabNotificationCounts(counts)
              })
            })
          })
        }
      }

      await loadMessages(chatId, { showPaneLoading: true })

      // Load user requests cho group chat
      if (activeTab === 'groups' && chatId) {
        await loadUserReq(chatId)
      }

      // Nếu chat này vừa add member, force refresh thêm lần nữa
      if (chatsWithNewMembers.has(chatId)) {
        setTimeout(async () => {
          await loadMessages(chatId)
          // Load user requests cho group chat
          if (activeTab === 'groups' && chatId) {
            await loadUserReq(chatId)
          }
          // Scroll to bottom để thấy thông báo mới
          setTimeout(() => {
            if (messageListRef.current) {
              const box = messageListRef.current
              box.scrollTop = box.scrollHeight
            }
          }, 100)
        }, 1000)
      }
    } else {
      setChatMessages([])
      resetMessagePagination()
    }
  }

  const handleOpenAddGroup = () => {
    setIsOpen(true)
  }

  // Hàm xử lý upload file
  const handleFileUpload = async files => {
    if (!selectedChat || !userInfo?.userID) {
      toast.error('Vui lòng chọn chat trước khi gửi file')
      return
    }
    const fileArray = Array.from(files)

    setAttachedFiles(prevFiles => {
      const totalFiles = prevFiles.length + fileArray.length

      if (totalFiles > 10) {
        const remainingSlots = 10 - prevFiles.length
        if (remainingSlots <= 0) {
          toast.error('Chỉ được chọn tối đa 10 file')
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
  }

  // Handle adding new poll option and reload messages
  const handleAddNewOption = async pollData => {
    try {
      loadingContext.show()
      const response = await createOptionsPoll(pollData)

      if (response.status === 200) {
        toast.success('Đã thêm lựa chọn mới!')
        await loadMessages(selectedChat) // Reload messages to reflect changes
        await loadPollsByChatID(selectedChat) // Reload polls
      } else {
        toast.error('Không thể thêm lựa chọn mới')
      }
    } catch (error) {
      console.error('Error adding poll option:', error)
      toast.error('Không thể thêm lựa chọn mới')
    } finally {
      loadingContext.hide()
    }
  }

  const handleReplyMessage = message => {
    setReplyToMessage(message)
    // Focus vào input sau khi set reply message
    setTimeout(() => {
      if (messageInputRef.current && messageInputRef.current.focusInput) {
        messageInputRef.current.focusInput()
      }
    }, 100)
  }

  const handleVoteOnPoll = async voteData => {
    console.log(voteData)
    try {
      loadingContext.show()
      if (!voteData.ChatID && selectedChat) {
        voteData.ChatID = selectedChat
      }

      if (typeof voteData.OptionIDs === 'string') {
        voteData.OptionIDs = [voteData.OptionIDs]
      } else if (!Array.isArray(voteData.OptionIDs) && voteData.OptionID) {
        voteData.OptionIDs = [voteData.OptionID]
        delete voteData.OptionID
      } else if (!voteData.OptionIDs) {
        voteData.OptionIDs = []
      }

      if (voteData.Options) {
        delete voteData.Options
      }

      const response = await votePoll(voteData)
      if (response.status === 200) {
        toast.success('Bình chọn thành công')
        await loadPollsByChatID(selectedChat)
      } else {
        toast.error('Bình chọn thất bại')
      }
    } catch (error) {
      console.error('Error voting on poll:', error)
      const apiMessage = error?.response?.data?.message || error?.response?.data?.errors?.[0]
      toast.error(apiMessage || error.message || 'Không thể bình chọn, vui lòng thử lại sau')
    } finally {
      loadingContext.hide()
    }
  }

  const handleSendMessage = async () => {
    let clientTempId = ''
    const messageText = message.trim()
    const pendingAttachedFiles = attachedFiles
    const hasFiles = pendingAttachedFiles.length > 0

    if (
      (messageText || hasFiles) &&
      selectedChat &&
      userInfo?.userID
    ) {
      try {
        // Show loading if sending files
        if (hasFiles) {
          loadingContext.show()
        }

        const chatIDGroup = activeTab === 'groups' ? selectedChat : null
        const existingChat = userChatList.find(chat => chat.id == selectedChat)
        const isExistingChat = !!existingChat

        const isAI = isChatsAI || selectedChat === 'heritage-assistant'
        clientTempId = `tmp-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`
        const sentAt = new Date().toISOString()
        const optimisticFiles = hasFiles
          ? normalizeChatFiles(pendingAttachedFiles).map((file, index) => ({
              ...file,
              id: `${clientTempId}-${index}`,
              ID: `${clientTempId}-${index}`
            }))
          : []

        const _message = parseTextToParts(messageText)

        let listLink = []
        _message.forEach(part => {
          if (part.isLink) {
            listLink.push(part.content)
          }
        })

        const messageData = {
          SenderID: userInfo.userID,
          MessageType:
            hasFiles
              ? ChatMessageConstants.MessageType.File
              : ChatMessageConstants.MessageType.Text,
          ReplyToID: replyToMessage ? replyToMessage.id : null,
          Content: messageText,
          ChatID:
            activeTab === 'individual' && isExistingChat
              ? selectedChat
              : '' || activeTab === 'groups'
                ? chatIDGroup
                : '',
          ChatType:
            activeTab === 'individual'
              ? ChatConstants.Type.PRIVATE
              : ChatConstants.Type.GROUP,
          ChatUsers:
            activeTab === 'individual'
              ? JSON.stringify([
                {
                  UserID: isAI ? 'heritage-1' : selectedChat
                }
              ])
              : null,
          ChatFiles: hasFiles ? pendingAttachedFiles : '',
          ChatLinks: listLink.length > 0 ? JSON.stringify(listLink) : '',
          ClientTempID: clientTempId,
          IsAI: isAI
        }

        upsertChatMessage(
          {
            id: clientTempId,
            clientTempId,
            ClientTempID: clientTempId,
            senderID: userInfo.userID,
            senderName: userInfo?.fullName || userInfo?.FullName || 'B\u1ea1n',
            avatar: userInfo?.avatar || '',
            content: messageText,
            messageType: messageData.MessageType,
            chatID: selectedChat,
            createdDate: sentAt,
            timestamp: sentAt,
            files: optimisticFiles,
            chatLinks: messageData.ChatLinks,
            replyToID: replyToMessage ? replyToMessage.id : null,
            replyToMessage,
            seenBy: [],
            isPending: true
          },
          { scroll: true, instant: true }
        )

        setMessage('')
        setAttachedFiles([])
        setReplyToMessage(null)

        const response = await sendMessage(messageData)
        if (response.status == 200) {
          const responsePayload = getSendChatResultPayload(response)
          const responseMessage = responsePayload?.message || responsePayload?.Message
          const actualChatId = getSendChatId(response, selectedChat)
          const targetChatId = actualChatId || selectedChat

          if (responseMessage) {
            upsertChatMessage(
              {
                ...responseMessage,
                clientTempId,
                ClientTempID: clientTempId,
                isPending: false
              },
              { scroll: true, instant: true }
            )
          }
          if (actualChatId) {
            knownChatIdsRef.current.add(actualChatId)
          }

          if (hasFiles) {
            loadingContext.hide()
          }

          if (!responseMessage) {
            setTimeout(() => {
              const stillPending = chatMessageHistoryRef.current.some(
                item =>
                  item.id === clientTempId ||
                  getMessageClientTempId(item) === clientTempId
              )
              if (stillPending) {
                loadMessages(targetChatId, {
                  force: true,
                  silent: true,
                  scrollToBottomAfterLoad: true
                })
              }
            }, 700)
          }

          // Trigger reload attachments nếu có files hoặc links
          const hasAttachments = hasFiles || listLink.length > 0
          if (hasAttachments) {
            setTimeout(() => {
              triggerReloadAttachments(targetChatId, messageData.MessageType)
            }, 1000)
          }

          // Lấy thông tin file từ response nếu có
          // const fileURLs = response.data?.fileURLs || []

          // const sentMessage = {
          //   id: response.data?.messageID || Date.now().toString(),
          //   files: messageData.ChatFiles
          //     ? Array.isArray(messageData.ChatFiles)
          //       ? Array.from(messageData.ChatFiles).map((file, index) => ({
          //           name: file.name || file.FileName,
          //           type:
          //             file.type ||
          //             (file.Extension
          //               ? `file/${file.Extension}`
          //               : 'application/octet-stream'),
          //           size: file.size || file.Size || '0',
          //           extension:
          //             file.extension ||
          //             file.Extension ||
          //             file.name?.split('.').pop(),
          //           file:
          //             fileURLs[index] ||
          //             file.file ||
          //             file.File ||
          //             `${window.location.origin}/api/files/${
          //               response.data?.messageID
          //             }/${index}/${encodeURIComponent(
          //               file.name || file.FileName
          //             )}`
          //         }))
          //       : []
          //     : []
          // }

          // setChatMessages(prev => [...prev, sentMessage])

          // Force scroll to bottom after sending a message
          setTimeout(() => {
            if (messageListRef.current) {
              messageListRef.current.scrollTop =
                messageListRef.current.scrollHeight
            }
          }, 100)

          if (
            activeTab === CHAT_TABS.individual &&
            !isExistingChat &&
            actualChatId &&
            actualChatId !== selectedChat
          ) {
            selectedChatRef.current = actualChatId
            latestLoadChatIdRef.current = actualChatId
            knownChatIdsRef.current.add(actualChatId)
            unresolvedPrivateSelectionRef.current = { chatId: null, checkedAt: 0 }
            setSelectedChat(actualChatId)
            replaceChatsUrl(CHAT_TABS.individual, { chatId: actualChatId })
          }
          setTimeout(() => scrollToBottom(), 40)

          const messageTime = new Date().toISOString()
          const senderName = userInfo.fullName || 'You'

          if (activeTab === 'individual') {
            setUserChatList(prev => {
              const existingChat = prev.find(chat => chat.id === selectedChat)
              if (existingChat) {
                return prev.map(chat =>
                  chat.id === selectedChat
                    ? {
                      ...chat,
                      lastMessage: messageData.Content,
                      lastMessageDate: messageTime,
                      lastMessageSender: senderName,
                       lastMessageSenderId: userInfo.userID,
                       messageType: messageData.MessageType,
                       chatFiles: messageData.ChatFiles,
                       files: optimisticFiles,
                    }
                    : chat
                )
              } else {
                const userFromIndividualList = individualChatList.find(
                  user => user.id === selectedChat
                )

                const existingChatWithUser = prev.find(
                  chat =>
                    chat.type === 'individual' &&
                    (chat.name === userFromIndividualList?.name ||
                      chat.id === userFromIndividualList?.id)
                )

                if (existingChatWithUser) {
                  return prev.map(chat => {
                    if (chat.id === existingChatWithUser.id) {
                      return {
                        ...chat,
                        lastMessage: messageData.Content,
                        lastMessageDate: messageTime,
                        lastMessageSender: senderName,
                         lastMessageSenderId: userInfo.userID,
                         messageType: messageData.MessageType,
                         chatFiles: messageData.ChatFiles,
                         files: optimisticFiles,
                      }
                    }
                    return chat
                  })
                } else if (userFromIndividualList) {
                  const newChat = {
                    ...userFromIndividualList,
                    id: targetChatId,
                    chatID: targetChatId,
                    lastMessage: messageData.Content,
                    lastMessageDate: messageTime,
                    lastMessageSender: senderName,
                     lastMessageSenderId: userInfo.userID,
                     messageType: messageData.MessageType,
                     chatFiles: messageData.ChatFiles,
                     files: optimisticFiles,
                    createdDate: messageTime,
                    userID: userFromIndividualList.id,
                    isOnline: onlineUsers.includes(userFromIndividualList.id)
                  }
                  return [newChat, ...prev]
                }
                return prev
              }
            })
          }

          // Cập nhật danh sách chat nhóm
          if (activeTab === 'groups') {
            setGroupChatList(prev => {
              const existingChat = prev.find(chat => chat.id === selectedChat)
              if (existingChat) {
                return prev.map(chat =>
                  chat.id === selectedChat
                    ? {
                      ...chat,
                      lastMessage: messageData.Content,
                      lastMessageDate: messageTime,
                      lastMessageSender: senderName,
                       lastMessageSenderId: userInfo.userID,
                       messageType: messageData.MessageType,
                       chatFiles: messageData.ChatFiles,
                       files: optimisticFiles,
                    }
                    : chat
                )
              }
              return prev
            })
          }

          if (isAI) {
            if (messageText) {
              const messageAll = [
                {
                  role: 'system',
                  content:
                    'Bạn là trợ lý ảo thông minh, có khả năng tìm kiếm thông tin và trả lời bất cứ câu hỏi. Các thông tin tìm kiếm phải chính thống, có nguồn gốc rõ ràng, ưu tiên cập nhật các thông tin về nghị quyết, thông tư của Nhà nước Chính Phủ Việt Nam, liên quan nhiều lĩnh vực ngành nghề, ưu tiên ngành Văn Hóa Di Sản, Công Nghệ. Còn lại bạn có thể thoải mái trả lời các câu hỏi khó khăn thông minh, tình cảm giống như ChatGPT thế hệ mới.'
                },
                ...chatMessages
                  .filter(item => item?.content?.trim()?.length > 0)
                  .map(item => ({
                    role:
                      isCurrentUserMessage(item, userInfo) ? 'user' : 'assistant',
                    content: item.content
                  })),
                {
                  role: 'user',
                  content: messageText
                }
              ]

              const chatID_AI = targetChatId
              const res = await sendMessageAI(
                messageText,
                selectedChatLinkId,
                messageAll
              )

              if (res?.status == 200) {
                const aiReply =
                  res?.data?.message || 'Xin lỗi, tôi không có câu trả lời.'

                setSelectedChatLinkId(res?.data?.linkId)

                // const aiReply =
                //   res?.data?.choices[0]?.message?.content ||
                //   'Xin lỗi, tôi không có câu trả lời.'
                // const aiReply =
                //   res?.choices[0]?.message?.content ||
                //   'Xin lỗi, tôi không có câu trả lời.'

                const messageDataAI = {
                  SenderID: 'heritage-1',
                  MessageType: ChatMessageConstants.MessageType.Text,
                  ReplyToID: null,
                  Content: aiReply.trim(),
                  ChatID: chatID_AI,
                  ChatUsers:
                    activeTab === 'individual'
                      ? JSON.stringify([
                        {
                          UserID: selectedChat
                        }
                      ])
                      : null,
                  ChatFiles: null,
                  IsAI: isAI,
                  LinkId: selectedChatLinkId
                }

                await sendMessage(messageDataAI)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error sending message:', error)

        if (clientTempId) {
          setChatMessages(prev => {
            const next = prev.map(item =>
              item.id === clientTempId ||
              getMessageClientTempId(item) === clientTempId
                ? { ...item, isPending: false, isFailed: true }
                : item
            )
            chatMessageHistoryRef.current = mergeChatMessagesById(
              chatMessageHistoryRef.current,
              next
            )
            return next
          })
        }

        if (error.response?.status === 400) {
          if (
            error.response?.data?.title ===
            'One or more validation errors occurred.'
          ) {
            toast.error('File tải lên quá lớn')
          } else {
            toast.error('Dữ liệu không hợp lệ')
          }
        } else if (error.response?.status === 413) {
          toast.error('File tải lên quá lớn')
        } else {
          toast.error('Không thể gửi tin nhắn')
        }

        // Hide loading in case of error
        if (hasFiles) {
          loadingContext.hide()
        }
      }
    }
  }

  const handleToggleGroupInfo = () => {
    setShowGroupInfo(!showGroupInfo)
  }

  const handleOpenSearchModal = () => {
    setShowSearchModal(true)
  }

  const handleCloseSearchModal = () => {
    setShowSearchModal(false)
  }

  const handleScrollToMessage = messageId => {
    if (!messageId) return

    const targetId = normalizeChatId(messageId)
    const history = chatMessageHistoryRef.current || []
    const targetIndex = history.findIndex(
      message => normalizeChatId(message?.id) === targetId
    )
    const targetMessage = targetIndex >= 0 ? history[targetIndex] : null
    const resolvedMessageId = targetMessage?.id || messageId

    if (
      targetIndex >= 0 &&
      !chatMessages.some(message => normalizeChatId(message?.id) === targetId)
    ) {
      const requiredPage = Math.ceil(
        (history.length - targetIndex) / CHAT_MESSAGE_PAGE_SIZE
      )
      const nextPage = Math.max(requiredPage, 1)
      const nextMessages = getPagedChatMessages(history, nextPage)

      setMessagePage(nextPage)
      setHasMoreMessages(nextMessages.length < history.length)
      setChatMessages(nextMessages)
    }

    setHighlightedMessageId(resolvedMessageId)
    setShowSearchModal(false)

    const scrollToSearchResult = (attempt = 0) => {
      const messageElement = document.getElementById(`message-${resolvedMessageId}`)
      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })

        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedMessageId(null)
        }, 3000)
        return
      }

      if (attempt < 8) {
        setTimeout(() => scrollToSearchResult(attempt + 1), 80)
      }
    }

    setTimeout(() => scrollToSearchResult(), 0)
  }

  const filteredChatList = () => {
    if (activeTab === 'groups') {
      const baseList = groupChatList
      if (!searchTerm) return baseList
      return baseList.filter(chat =>
        chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    const chatted = userChatList || []

    const uniqueChats = {}
    chatted.forEach(chat => {
      const key = chat.name || chat.id
      if (
        chat.id === userInfo?.userID ||
        chat.userID === userInfo?.userID ||
        chat.name === userInfo?.fullName
      ) {
        return
      }

      if (
        !uniqueChats[key] ||
        (chat.lastMessageDate &&
          uniqueChats[key].lastMessageDate &&
          new Date(chat.lastMessageDate) >
          new Date(uniqueChats[key].lastMessageDate))
      ) {
        uniqueChats[key] = chat
      }
    })

    const uniqueChattedList = Object.values(uniqueChats).map(chat => {
      // Merge isNew property from individualChatList
      const individualUser = individualChatList.find(
        user =>
          user.name === chat.name ||
          user.id === chat.userID ||
          user.id === chat.id
      )

      return {
        ...chat,
        isNew: individualUser?.isNew || false
      }
    })

    const allUsers = individualChatList || []
    const unchattedUsers = allUsers.filter(
      user =>
        user.id !== userInfo?.userID &&
        user.name !== userInfo?.fullName &&
        !uniqueChattedList.some(
          chat =>
            chat.name === user.name ||
            chat.id === user.id ||
            chat.userID === user.id
        )
    )

    // Chỉ sort khi không có delay (giống hiệu ứng Zalo)
    const sortedChattedList =
      sortDelay > 0
        ? uniqueChattedList // Giữ nguyên vị trí khi có delay
        : uniqueChattedList.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1
          if (!a.isOnline && b.isOnline) return 1
          if (a.lastMessageDate && b.lastMessageDate) {
            return new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
          }
          if (a.lastMessageDate && !b.lastMessageDate) return -1
          if (!a.lastMessageDate && b.lastMessageDate) return 1
          return new Date(b.createdDate) - new Date(a.createdDate)
        })

    const combinedList = [
      ...sortedChattedList,
      ...unchattedUsers.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1
        if (!a.isOnline && b.isOnline) return 1
        return (a.name || '').localeCompare(b.name || '')
      })
    ]

    if (!searchTerm) return combinedList

    return combinedList.filter(
      chat =>
        chat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessageSender?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleAcceptUserRequest = async requestId => {
    try {
      loadingContext.show()
      const response = await acceptUserRequest(
        requestId,
        ChatAwaitConfirmConstants.Status.Accepted,
        userInfo?.userID
      )
      if (response.status === 200) {
        const request = userRequests.find(req => req.id === requestId)
        toast.success(
          `Đã chấp nhận yêu cầu của ${request?.senderName || 'người dùng'}`
        )
        await loadUserReq() // Tải lại danh sách yêu cầu
        await loadData() // Tải lại danh sách nhóm

        setShowUserRequestsModal(false)
      }
    } catch (error) {
      console.error('Error accepting user request:', error)
      toast.error('Không thể chấp nhận yêu cầu')
    } finally {
      loadingContext.hide()
    }
  }

  const handleLeaveGroup = async (chatId, userId) => {
    try {
      const response = await leaveGroup(
        chatId || currentChat?.id,
        userId || userInfo?.userID
      )
      if (response.status === 200) {
        toast.success('Rời nhóm thành công')
        await loadUserReq()
        await loadData()
        setMessage('')
        setIsOpen(false)
        setChatMessages([])
        resetMessagePagination()
        setSelectedChat(null)
        setShowGroupInfo(false)
      }
    } catch (error) {
      console.error('Error leaving group:', error)
    }
  }

  const handleChangeLeaderAndLeaveGroup = async (chatId, newLeaderId) => {
    try {
      const response = await changeLeaderAndLeaveGroup(chatId, newLeaderId)
      if (response.status === 200) {
        toast.success('Đã thay đổi trưởng nhóm và rời nhóm thành công')
        await loadUserReq()
        await loadData()
        setMessage('')
        setIsOpen(false)
        setChatMessages([])
        resetMessagePagination()
        setSelectedChat(null)
        setShowGroupInfo(false)
      }
    } catch (error) {
      console.error('Error changing leader and leaving group:', error)
      toast.error('Có lỗi xảy ra khi thay đổi trưởng nhóm')
    }
  }

  const findChatById = chatId => {
    const targetId = normalizeChatId(chatId)
    return [...userChatList, ...groupChatList].find(
      chat => normalizeChatId(getChatIdentity(chat)) === targetId
    )
  }

  const getPinResponsePayload = response =>
    response?.data?.data ?? response?.data ?? response ?? {}

  const resolveChatPinDate = (response, fallbackPinDate) => {
    const payload = getPinResponsePayload(response)
    const hasPinFlag =
      Object.prototype.hasOwnProperty.call(payload, 'isPinned') ||
      Object.prototype.hasOwnProperty.call(payload, 'IsPinned') ||
      Object.prototype.hasOwnProperty.call(payload, 'isPin') ||
      Object.prototype.hasOwnProperty.call(payload, 'IsPin')

    if (hasPinFlag) {
      const rawPinned =
        payload?.isPinned ?? payload?.IsPinned ?? payload?.isPin ?? payload?.IsPin
      const pinned = rawPinned === true || rawPinned === 'true' || rawPinned === 1 || rawPinned === '1'

      return pinned
        ? payload?.pinDate ?? payload?.PinDate ?? fallbackPinDate ?? new Date().toISOString()
        : null
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, 'pinDate') ||
      Object.prototype.hasOwnProperty.call(payload, 'PinDate')
    ) {
      return payload?.pinDate ?? payload?.PinDate ?? null
    }

    return fallbackPinDate
  }

  const updateChatPinState = (chatId, pinDate) => {
    const targetId = normalizeChatId(chatId)
    setStoredChatPinDate(targetId, pinDate)

    const updateList = list =>
      list.map(chat =>
        normalizeChatId(getChatIdentity(chat)) === targetId
          ? applyChatPinState(chat, pinDate)
          : hydrateChatPinState(chat)
      )

    setUserChatList(updateList)
    setGroupChatList(updateList)
  }

  const handlePinChat = async chatId => {
    const fallbackPinDate = getNextChatPinDate(findChatById(chatId))

    try {
      const response = await pinChat(chatId)
      if (response.status === 200) {
        const nextPinDate = resolveChatPinDate(response, fallbackPinDate)

        await loadUserReq()
        await loadData()
        updateChatPinState(chatId, nextPinDate)
        toast.success(nextPinDate ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại')
      }
    } catch (error) {
      console.error('Error toggling chat pin:', error)
      toast.error('Có lỗi xảy ra khi cập nhật ghim hội thoại')
    }
  }

  const handlePinChatIndividual = async chatId => {
    const fallbackPinDate = getNextChatPinDate(findChatById(chatId))

    try {
      const response = await pinChat(chatId)
      if (response.status === 200) {
        const nextPinDate = resolveChatPinDate(response, fallbackPinDate)

        await loadUserReq()
        await loadChatUser()
        await loadData()
        updateChatPinState(chatId, nextPinDate)
        toast.success(nextPinDate ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại')
      }
    } catch (error) {
      console.error('Error toggling chat pin:', error)
      toast.error('Có lỗi xảy ra khi cập nhật ghim hội thoại')
    }
  }

  const handleDisbandGroup = async () => {
    try {
      const response = await disbandGroup(currentChat?.id, userInfo?.userID)
      if (response.status === 200) {
        toast.success('Giải tán nhóm thành công')
        await loadUserReq()
        await loadData()
        setMessage('')
        setIsOpen(false)
        setChatMessages([])
        resetMessagePagination()
        setSelectedChat(null)
        setShowGroupInfo(false)
      }
    } catch (error) {
      console.error('Error disbanding group:', error)
    }
  }

  const handleAddMemberToGroup = async formData => {
    try {
      const targetChatId = currentChat?.id || selectedChat

      if (userInfo?.userID && !formData.has('currentUserID')) {
        formData.append('currentUserID', userInfo.userID)
      }

      const response = await addUserToGroup(formData)
      if (response.status === 200) {
        // Kiểm tra xem có cần approval không từ response
        const needsApproval =
          response.data?.data?.needsApproval ||
          response.data?.needsApproval ||
          response.data?.message?.includes('approval') ||
          response.data?.message?.includes('duyệt')

        if (needsApproval) {
          toast.success(
            'Yêu cầu thêm thành viên đã được gửi, đang chờ quản trị viên hoặc phó nhóm duyệt'
          )
        } else {
          toast.success('Thêm thành viên thành công')
        }

        await loadData() // Tải lại danh sách nhóm

        // Track chat này có member mới
        if (targetChatId) {
          setChatsWithNewMembers(prev => new Set([...prev, targetChatId]))

          // Force refresh messages và user requests
          const refreshMessages = async () => {
            const isStillViewingTargetChat =
              normalizeChatId(selectedChatRef.current) ===
              normalizeChatId(targetChatId)

            if (isStillViewingTargetChat) {
              await loadMessages(targetChatId)
            }
            // Load user requests để hiển thị thông báo "đang chờ duyệt"
            await loadUserReq(targetChatId)
            // Scroll to bottom để thấy thông báo mới
            setTimeout(() => {
              if (isStillViewingTargetChat && messageListRef.current) {
                const box = messageListRef.current
                box.scrollTop = box.scrollHeight
              }
            }, 100)
          }

          // Multiple refresh attempts với interval tăng dần
          setTimeout(refreshMessages, 300)
          setTimeout(refreshMessages, 800)
          setTimeout(refreshMessages, 1500)

          // Clear flag sau 10 giây
          setTimeout(() => {
            setChatsWithNewMembers(prev => {
              const newSet = new Set(prev)
              newSet.delete(targetChatId)
              return newSet
            })
          }, 10000)
        }

        setIsOpen(false)
      }
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error(error?.response?.data?.message || 'Không thể thêm thành viên')
    }
  }

  const handlePromoteToViceLeader = async (chatId, userId) => {
    try {
      const response = await promoteToViceLeader(chatId, userId, userInfo?.userID)
      if (response.status === 200) {
        toast.success('Đã thăng chức phó nhóm')
        await loadData()
        await loadMessages(chatId)
      }
    } catch (error) {
      console.error('Error promoting to vice leader:', error)
      toast.error('Không thể thăng chức phó nhóm')
    }
  }

  const handleRemoveViceLeader = async (chatId, userId) => {
    try {
      const response = await removeViceLeader(chatId, userId, userInfo?.userID)
      if (response.status === 200) {
        toast.success('Đã xóa quyền phó nhóm')
        await loadData()
        await loadMessages(chatId)
      }
    } catch (error) {
      console.error('Error removing vice leader:', error)
      toast.error(
        error?.response?.data?.message || 'Không thể xóa quyền phó nhóm'
      )
    }
  }

  const handleRemoveMemberFromGroup = async (chatId, userId) => {
    try {
      const response = await removeMemberFromGroup(chatId, userId, userInfo?.userID)
      if (response.status === 200) {
        toast.success('Đã xóa thành viên khỏi nhóm')
        await loadData()
        await loadMessages(chatId)
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Không thể xóa thành viên khỏi nhóm')
    }
  }

  const handleTransferGroupLeader = async (chatId, userId) => {
    try {
      const response = await transferGroupLeader(chatId, userId, userInfo?.userID)
      if (response.status === 200) {
        toast.success('Đã nhượng quyền trưởng nhóm')
        await loadData()
        await loadMessages(chatId)
      }
    } catch (error) {
      console.error('Error transferring group leader:', error)
      toast.error('Không thể nhượng quyền trưởng nhóm')
    }
  }

  const handleMarkMessageAsSeen = async messageId => {
    try {
      const currentUserId =
        userInfo?.userID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID
      if (!currentUserId) {
        console.log('[chat-seen:page-skip-no-current-user]', {
          messageId,
          userInfo
        })
        return
      }

      console.log('[chat-seen:page-mark-start]', {
        messageId,
        currentUserId,
        selectedChat,
        message: chatMessages.find(msg => msg.id === messageId)
      })

      const response = await markMessageAsSeen(messageId, currentUserId)
      console.log('[chat-seen:page-mark-success]', {
        messageId,
        currentUserId,
        response
      })
      setChatMessages(prev => {
        const next = prev.map(msg => {
          if (msg.id === messageId) {
            let seenByArray = []
            try {
              seenByArray =
                typeof msg.seenBy === 'string'
                  ? JSON.parse(msg.seenBy || '[]')
                  : msg.seenBy || []
            } catch (e) {
              seenByArray = []
            }

            const alreadySeen = seenByArray.some(
              user =>
                String(user.UserID || user.userID || user.id || user.ID || '') ===
                String(currentUserId)
            )

            if (!alreadySeen) {
              // Add current user to seenBy
              const updatedSeenBy = [
                ...seenByArray,
                {
                  UserID: currentUserId,
                  userID: currentUserId,
                  FullName: userInfo.fullName || 'You',
                  fullName: userInfo.fullName || 'You',
                  Avatar: userInfo.avatar || '',
                  avatar: userInfo.avatar || ''
                }
              ]

              return {
                ...msg,
                seenBy: JSON.stringify(updatedSeenBy)
              }
            }
          }
          return msg
        })
        chatMessageHistoryRef.current = mergeChatMessagesById(
          chatMessageHistoryRef.current,
          next
        )
        return next
      })
    } catch (error) {
      console.warn('Error marking message as seen:', error)
    }
  }

  const handleInputFocus = async () => {
    try {
      if (!selectedChat) return

      // Mark unread messages as seen
      const unreadMessages = chatMessages.filter(
        msg => !isCurrentUserMessage(msg, userInfo)
      )

      if (unreadMessages.length > 0) {
        const lastOtherMessage = unreadMessages[unreadMessages.length - 1]
        if (lastOtherMessage) {
          await handleMarkMessageAsSeen(lastOtherMessage.id)
        }
      }

      //Clear unread count cho chat hiện tại
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`unreadCount_${selectedChat}`)
        window.dispatchEvent(
          new CustomEvent('unreadCountChanged', {
            detail: { chatId: selectedChat, count: 0 }
          })
        )
      }

      // Clear isNew state và update tab notification counts
      const currentChatList =
        activeTab === 'individual' ? userChatList : groupChatList
      const currentChat = currentChatList.find(chat => chat.id === selectedChat)

      // Clear tab notification counts khi click vào input
      setTabNotificationCounts({
        individual: 0,
        groups: 0
      })

      if (currentChat?.isNew) {
        // Update chat list để bỏ isNew
        if (activeTab === 'individual') {
          setUserChatList(prev =>
            prev.map(chat =>
              chat.id === selectedChat ? { ...chat, isNew: false } : chat
            )
          )
        } else {
          setGroupChatList(prev =>
            prev.map(chat =>
              chat.id === selectedChat ? { ...chat, isNew: false } : chat
            )
          )
        }
      }
    } catch (error) {
      console.error('Error handling input focus:', error)
    }
  }

  const handleRecallMessage = async messageId => {
    try {
      const response = await recallMessage(messageId)
      if (response.status === 200) {
        toast.success('Đã thu hồi tin nhắn')
        if (selectedChat) {
          await loadMessages(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error recalling message:', error)
      toast.error('Không thể thu hồi tin nhắn')
    }
  }

  const handlePinMessage = async messageId => {
    try {
      const response = await pinMessage(messageId)
      if (response.status === 200) {
        toast.success('Đã ghim tin nhắn')
        if (selectedChat) {
          await loadMessages(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error pinning message:', error)
      toast.error('Không thể ghim tin nhắn')
    }
  }

  const handleUnpinMessage = async payload => {
    const toArr = v => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [])

    // Chuẩn hoá payload
    let messageID = []
    let eventID = []

    if (Array.isArray(payload)) {
      // Back-compat: mảng ID cũ → coi như messageID
      messageID = payload.filter(Boolean)
    } else if (payload && typeof payload === 'object') {
      messageID = toArr(payload.messageID)
      eventID = toArr(payload.eventID)
    } else if (payload) {
      // 1 id đơn lẻ → coi như messageID
      messageID = [payload]
    }

    if (messageID.length === 0 && eventID.length === 0) return

    try {
      const res = await unpinMessage({ messageID, eventID })

      if (res?.status === 200) {
        toast.success('Bỏ ghim thành công')
        if (selectedChat) {
          await loadMessages(selectedChat)
        }
      } else {
        throw new Error(res?.message || 'Bỏ ghim thất bại')
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Bỏ ghim thất bại'
      toast.error(msg)
    }
  }

  const handleRejectUserRequest = async requestId => {
    try {
      loadingContext.show()
      const response = await acceptUserRequest(
        requestId,
        ChatAwaitConfirmConstants.Status.Rejected,
        userInfo?.userID
      )
      if (response.status === 200) {
        const request = userRequests.find(req => req.id === requestId)
        toast.success(
          `Đã từ chối yêu cầu của ${request?.senderName || 'người dùng'}`
        )
        await loadUserReq()
        await loadData()

        setShowUserRequestsModal(false)
      }
    } catch (error) {
      console.error('Error rejecting user request:', error)
      toast.error('Không thể từ chối yêu cầu')
    } finally {
      loadingContext.hide()
    }
  }

  const handleSaveGroup = async formData => {
    const response = await CreateChat(formData)

    if (response.status === 200) {
      toast.success('Tạo nhóm thành công')
      loadData()
      setIsOpen(false)
    }
  }

  const handleUpdateChatName = async (chatID, newName) => {
    try {
      const response = await updateChatName(chatID, newName)
      if (response.status === 200) {
        toast.success('Đổi tên nhóm thành công')
        await loadMessages(chatID)
        await loadUserReq()
        await loadData()
      }
    } catch (error) {
      console.error('Error updating chat name:', error)
      toast.error('Cập nhật tên nhóm thất bại')
    }
  }

  const handleUpdateChatAvatar = async (chatID, avatarFile) => {
    try {
      if (!avatarFile) return

      const response = await updateChatAvatar(chatID, avatarFile)

      if (response.status === 200) {
        const avatar =
          response?.data?.data?.avatar ||
          response?.data?.avatar ||
          response?.avatar

        if (avatar) {
          setGroupChatList(prev =>
            prev.map(chat =>
              chat.id === chatID
                ? {
                  ...chat,
                  avatar
                }
                : chat
            )
          )
        }

        toast.success('Đổi ảnh đại diện nhóm thành công')
        await loadMessages(chatID)
        await loadUserReq()
        await loadData()
      }
    } catch (error) {
      console.error('Error updating chat avatar:', error)
      toast.error('Cập nhật ảnh đại diện nhóm thất bại')
    }
  }

  const handleCreateNote = async noteData => {
    try {
      const response = await createNote(noteData)
      if (response.status === 200) {
        toast.success('Tạo ghi chú thành công')
        if (selectedChat) {
          await loadMessages(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error creating note:', error)
      toast.error('Không thể tạo ghi chú')
    }
  }

  const handleUpdateNote = async noteData => {
    try {
      const response = await updateNote(noteData)
      if (response.status === 200) {
        toast.success('Cập nhật ghi chú thành công')
        if (selectedChat) {
          await loadMessages(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error('Không thể cập nhật ghi chú')
    }
  }

  const handleCreatePoll = async pollData => {
    try {
      const response = await createPoll(pollData)
      if (response.status === 200) {
        toast.success('Tạo bình chọn thành công')
        if (selectedChat) {
          await loadMessages(selectedChat)
          await loadPollsByChatID(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error creating poll:', error)
      toast.error('Không thể tạo bình chọn')
    }
  }

  const handleCreateReminder = async reminderData => {
    try {
      const response = await createReminder(reminderData)
      if (response.status === 200) {
        toast.success('Tạo nhắc hẹn thành công')
        if (selectedChat) {
          await loadMessages(selectedChat)
          await loadRemindersByChatID(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      toast.error('Không thể tạo nhắc hẹn')
    }
  }

  const handleEditReminder = async reminderData => {
    try {
      const response = await editReminder(reminderData)
      if (response.status === 200) {
        toast.success('Cập nhật nhắc hẹn thành công')
        if (selectedChat) {
          await loadMessages(selectedChat)
          await loadRemindersByChatID(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error editing reminder:', error)
      toast.error('Không thể cập nhật nhắc hẹn')
    }
  }

  const handleJoinReminder = async (ID, type) => {
    try {
      const response = await confirmJoinReminder(ID, type)
      if (response.status === 200) {
        toast.success('Bạn đã tham gia nhắc hẹn')
        if (selectedChat) {
          await loadMessages(selectedChat)
          await loadRemindersByChatID(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error joining reminder:', error)
      toast.error('Không thể tham gia nhắc hẹn')
    }
  }

  const handleDeclineReminder = async (ID, type) => {
    try {
      const response = await confirmJoinReminder(ID, type)
      if (response.status === 200) {
        toast.success('Bạn đã từ chối nhắc hẹn này')
        if (selectedChat) {
          await loadMessages(selectedChat)
          await loadRemindersByChatID(selectedChat)
        }
      }
    } catch (error) {
      console.error('Error declining reminder:', error)
      toast.error('Không thể từ chối nhắc hẹn')
    }
  }

  useEffect(() => {
    // Wait for both chat lists to be ready and notificationData to exist
    if (
      notificationData &&
      userChatList.length >= 0 &&
      groupChatList.length >= 0
    ) {
      getNotificationCountsForTabs().then(counts => {
        setTabNotificationCounts(counts)
      })
    }
  }, [notificationData, userChatList, groupChatList, selectedChat])

  const chatList = filteredChatList()

  const currentChat =
    selectedChat === 'heritage-assistant'
      ? {
        id: 'heritage-assistant',
        name: 'Trợ lý Trung tâm Bảo tồn và Phát huy Giá trị Di tích Lịch sử – Văn hoá Thành phố Hồ Chí Minh',
        avatar: '/TTBT_icon_anim_idle.gif',
        type: 'heritage-assistant',
        isOnline: true // AI luôn online
      }
      : chatList.find(
        chat =>
          normalizeChatId(chat.id) === normalizeChatId(selectedChat) ||
          normalizeChatId(chat.chatID) === normalizeChatId(selectedChat)
      )
  const visibleUserRequests =
    activeTab === 'groups' &&
      selectedChat &&
      normalizeChatId(userRequestsChatId) === normalizeChatId(selectedChat)
      ? userRequests.filter(
        request =>
          normalizeChatId(request.chatID ?? request.ChatID ?? request.chatId) ===
          normalizeChatId(selectedChat)
      )
      : []

  return (
    <>
      <div className='relative flex h-[calc(100vh-64px)] overflow-hidden bg-white'>
        <ChatSidebar
          className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full flex-shrink-0`}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          chatList={chatList}
          selectedChat={selectedChat}
          setSelectedChat={handleChatSelect}
          onOpenAddGroup={handleOpenAddGroup}
          userChatList={userChatList}
          groupChatList={groupChatList}
          listUsers={individualChatList}
          isLoading={Boolean(chatTabLoadState[activeTab]?.isLoading)}
          hasLoaded={Boolean(chatTabLoadState[activeTab]?.isLoaded)}
          tabNotificationCounts={tabNotificationCounts}
          onMarkChatAsRead={markChatAsRead}
        />
        <div
          className={`${selectedChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}
        >
          <ChatHeader
            isAI={isChatsAI}
            currentChat={currentChat}
            showGroupInfo={showGroupInfo}
            onToggleGroupInfo={handleToggleGroupInfo}
            onUpdateChatName={handleUpdateChatName}
            onUpdateChatAvatar={handleUpdateChatAvatar}
            activeTab={activeTab}
            onOpenSearch={handleOpenSearchModal}
            onBack={() => setSelectedChat(null)}
          />

          <div className='flex-1 overflow-hidden w-full flex flex-col'>
            {isMessagesLoading ? (
              <div className='flex h-full w-full flex-col items-center justify-center bg-white text-gray-500'>
                <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50'>
                  <Loader2 className='h-5 w-5 animate-spin text-blue-500' />
                </div>
                <div className='text-sm font-medium text-gray-700'>
                  Đang tải tin nhắn...
                </div>
              </div>
            ) : (
              <MessageList
                ref={messageListRef}
                onRecallMessage={handleRecallMessage}
                messages={chatMessages}
                isAI={isChatsAI}
                chatID={selectedChat}
                initialUnreadCount={
                  chatOpenUnreadSnapshot.chatId === selectedChat
                    ? chatOpenUnreadSnapshot.unreadCount
                    : 0
                }
                onUpdateNote={handleUpdateNote}
                onReply={handleReplyMessage}
                polls={polls}
                reminders={reminders}
                onVote={handleVoteOnPoll}
                onSeenMessage={handleMarkMessageAsSeen}
                onEditReminder={handleEditReminder}
                onJoinReminder={handleJoinReminder}
                onDeclineReminder={handleDeclineReminder}
                onPinMessage={handlePinMessage}
                onUnpinMessage={handleUnpinMessage}
                handleAddNewOption={handleAddNewOption}
                highlightedMessageId={highlightedMessageId}
                hasMoreMessages={hasMoreMessages}
                isLoadingOlderMessages={isLoadingOlderMessages}
                onLoadOlderMessages={loadOlderMessages}
              />
            )}
          </div>
          {/* UserRequests */}
          {activeTab === 'groups' &&
            selectedChat &&
            visibleUserRequests.length > 0 && (
              <div className='px-4 pt-2 flex flex-col items-center gap-2'>
                {visibleUserRequests.slice(0, 2).map((request, index) => (
                  <div
                    key={request.id || `${request.chatID}-${request.userID}-${index}`}
                    className='flex w-full max-w-[400px] items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-2 text-[13px] shadow-sm'
                  >
                    <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-700'>
                      <UserIcon className='h-3.5 w-3.5' />
                    </div>
                    <div className='min-w-0 flex-1 truncate whitespace-nowrap leading-5 text-gray-600'>
                      <span className='font-semibold text-gray-800'>
                        {request.senderName}
                      </span>{' '}
                      <span>
                        {isCurrentUserLeader
                          ? 'đang chờ duyệt vào nhóm.'
                          : 'đang chờ quản trị viên hoặc phó nhóm duyệt.'}
                      </span>
                    </div>
                    {isCurrentUserLeader && (
                      <button
                        type='button'
                        onClick={() => {
                          setShowUserRequestsModal(true)
                        }}
                        className='ml-1 flex-shrink-0 rounded-md bg-yellow-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-yellow-600'
                      >
                        Xét duyệt
                      </button>
                    )}
                  </div>
                ))}
                {visibleUserRequests.length > 2 && (
                  <div className='w-full max-w-[400px] rounded-lg border border-yellow-300 bg-yellow-50 py-1.5 text-center shadow-sm'>
                    <span className='text-sm text-gray-600'>
                      +{visibleUserRequests.length - 2} yêu cầu khác
                      {isCurrentUserLeader && (
                        <span
                          className='cursor-pointer hover:underline text-blue-600 ml-1'
                          onClick={() => setShowUserRequestsModal(true)}
                        >
                          - Xét duyệt
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          {currentChat && (
            <MessageInput
              ref={messageInputRef}
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              attachedFiles={attachedFiles}
              activeTab={activeTab}
              onInputFocus={handleInputFocus}
              onRemoveFile={index => {
                setAttachedFiles(prev => prev.filter((_, i) => i !== index))
              }}
              onCreateNote={handleCreateNote}
              onCreatePoll={handleCreatePoll}
              currentChat={currentChat}
              replyToMessage={replyToMessage}
              onCancelReply={() => setReplyToMessage(null)}
              onCreateReminder={handleCreateReminder}
            />
          )}
        </div>

        {activeTab === 'groups' ? (
          <div
            className={`transition-all duration-300 overflow-hidden md:relative absolute right-0 top-0 bottom-0 bg-white z-20
            ${showGroupInfo
                ? 'w-[300px] md:w-[350px] border-l border-gray-200'
                : 'w-0'
              }
          `}
          >
            <GroupInfoSidebar
              showGroupInfo={showGroupInfo}
              currentChat={currentChat}
              messages={chatMessages}
              onLeaveGroup={handleLeaveGroup}
              onDisbandGroup={handleDisbandGroup}
              onAddMem={handleAddMemberToGroup}
              onChooseSubLeader={handlePromoteToViceLeader}
              onRemoveSubLeader={handleRemoveViceLeader}
              onRemoveMember={handleRemoveMemberFromGroup}
              onTransferLeader={handleTransferGroupLeader}
              onChooseNewLeaderAndLeave={handleChangeLeaderAndLeaveGroup}
              onPinChat={handlePinChat}
              onUpdateChatAvatar={handleUpdateChatAvatar}
              onCreateNote={handleCreateNote}
            />
          </div>
        ) : (
          <div
            className={`transition-all duration-300 overflow-hidden md:relative absolute right-0 top-0 bottom-0 bg-white z-20
            ${showGroupInfo
                ? 'w-[300px] md:w-[350px] border-l border-gray-200'
                : 'w-0'
              }
          `}
          >
            <IndividualInfoSidebar
              showInfo={showGroupInfo}
              currentChat={currentChat}
              messages={chatMessages}
              onPinChat={handlePinChatIndividual}
            />
          </div>
        )}
      </div>
      {isOpen && (
        <FormAddGroup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleSaveGroup}
        />
      )}

      <UserRequestsModal
        isOpen={showUserRequestsModal}
        onClose={() => setShowUserRequestsModal(false)}
        userRequests={visibleUserRequests}
        onAccept={handleAcceptUserRequest}
        onReject={handleRejectUserRequest}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={handleCloseSearchModal}
        chatId={selectedChat}
        messages={chatMessages}
        allMessages={chatMessageHistoryRef.current}
        onSelectMessage={handleScrollToMessage}
      />
    </>
  )
}

const ChatsPagesPageSuspense = () => {
  return (
    <Suspense>
      <ChatsPage />
    </Suspense>
  )
}

export default ChatsPagesPageSuspense
