'use client'
import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react'
import {
  Search,
  Users,
  ChevronDown,
  MoreHorizontal,
  Check,
  ArrowRight
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { getGroupChats, markMessageAsSeen } from '@/lib/api/chatsApi'
import {
  fetchUsersDropdownForChats,
  fetchUsersDropdown
} from '@/lib/api/dropdownApi'
import { ChatConstants } from '@/constants/chatConstants'
import { useSignalR } from '@/contexts/SignalRContext'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import LoadingContext from '@/contexts/LoadingContext'
import { useChatPopup } from '@/contexts/ChatPopupContext'
import { useNotification } from '@/contexts/NotificationPushContext'
import { onMessageForeground } from '@/app/web-push-notification'
import { MessageConstants } from '@/constants/notificationContants'
import AvatarWithFrame from '../avatars/avatarFrame'
import { Button, Input } from '../Form'
import Image from 'next/image'
import {
  getChatAttachmentActionPreview,
  getChatAttachmentPreview,
  hasChatAttachmentPreview
} from '@/helpers/chatPreviewHelpers'

const NEW_CHAT_USER_PREVIEW_LIMIT = 6

const getStoredUnreadCount = chatId => {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(`unreadCount_${chatId}`)
  return stored ? parseInt(stored, 10) : 0
}

const setStoredUnreadCount = (chatId, count) => {
  if (typeof window === 'undefined') return
  if (count > 0) {
    localStorage.setItem(`unreadCount_${chatId}`, count.toString())
  } else {
    localStorage.removeItem(`unreadCount_${chatId}`)
  }

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('unreadCountChanged', {
      detail: { chatId, count }
    }))
  }, 0)
}

const getUnreadCount = chat => {
  const value =
    chat?.unreadCount ??
    chat?.UnreadCount ??
    chat?.countUnread ??
    chat?.CountUnread ??
    0
  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

const getLastMessageId = chat =>
  chat?.lastMessageId ||
  chat?.lastMessageID ||
  chat?.messageId ||
  chat?.messageID ||
  chat?.chatMessageId ||
  chat?.chatMessageID ||
  chat?.id

const getCurrentUserId = userInfo =>
  userInfo?.userID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID ?? ''

const ChatListInbox = ({ onClose, onOpen, onUnreadCountChange, refreshTrigger }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState('individual')
  const [searchQuery, setSearchQuery] = useState('')
  const { onlineUsers, registerChatCallback, isConnected } = useSignalR()
  const { userInfo } = useLoadLocalStorage()
  const loadingContext = useContext(LoadingContext)
  const { openChatPopup, registerChatOpenCallback, closeChatPopup, activeChats } = useChatPopup()
  const { notificationData, setNotificationData } = useNotification()
  const [groupChatList, setGroupChatList] = useState([])
  const [userChatList, setUserChatList] = useState([])
  const [allUsersList, setAllUsersList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filteredUserChats, setFilteredUserChats] = useState([])
  const [filteredGroupChats, setFilteredGroupChats] = useState([])
  const [filteredNewChatUsers, setFilteredNewChatUsers] = useState([])
  const [forceUpdate, setForceUpdate] = useState(0)
  const [isOpeningChatsPage, setIsOpeningChatsPage] = useState(false)
  const [, setTabNotificationCounts] = useState({ individual: 0, groups: 0 })
  const currentUserId = getCurrentUserId(userInfo)

  const markChatAsReadOnServer = useCallback(
    chat => {
      const targetId = getLastMessageId(chat)
      if (!targetId || !currentUserId || getUnreadCount(chat) <= 0) return

      markMessageAsSeen(targetId, currentUserId).catch(error => {
        console.warn('Error marking dropdown chat as seen:', error)
      })
    },
    [currentUserId]
  )

  const normalizeUserId = value => {
    if (value === null || value === undefined) return ''
    return String(value)
  }

  const getChatUserId = user =>
    normalizeUserId(user?.id ?? user?.ID ?? user?.userID ?? user?.UserID ?? user?.value ?? user?.Value)

  const isActiveChatUser = user => {
    const isDeleted = user?.isDeleted ?? user?.IsDeleted
    const isDisabled = user?.isDisabled ?? user?.IsDisabled
    const isActive = user?.isActive ?? user?.IsActive
    const status = user?.status ?? user?.Status

    if (isDeleted === true || isDeleted === 'true') return false
    if (isDisabled === true || isDisabled === 'true') return false
    if (isActive === false || isActive === 'false') return false
    if (status !== undefined && status !== null && String(status) === '0') return false

    return true
  }

  const getChatUserSearchText = user =>
    [
      user?.fullName,
      user?.FullName,
      user?.name,
      user?.Name,
      user?.userName,
      user?.UserName,
      user?.email,
      user?.Email,
      user?.departmentName,
      user?.DepartmentName,
      user?.roleName,
      user?.RoleName
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

  const getUserDisplayName = userId => {
    const lookup = normalizeUserId(userId)
    if (!lookup) return ''

    const candidates = [
      userInfo,
      ...(Array.isArray(allUsersList) ? allUsersList : []),
      ...userChatList,
      ...groupChatList.flatMap(chat => chat.members || [])
    ]

    const user = candidates.find(item =>
      [
        item?.id,
        item?.ID,
        item?.userID,
        item?.UserID,
        item?.value,
        item?.Value
      ]
        .map(normalizeUserId)
        .some(value => value === lookup)
    )

    return (
      user?.fullName ||
      user?.FullName ||
      user?.name ||
      user?.Name ||
      user?.userName ||
      user?.UserName ||
      user?.email ||
      user?.Email ||
      userId
    )
  }

  const formatChatPreview = content => {
    if (typeof content !== 'string') return content

    return content.replace(/{([^}]+)}/g, (_, userId) =>
      getUserDisplayName(userId)
    )
  }

  const getCurrentUserNames = () =>
    [
      userInfo?.fullName,
      userInfo?.FullName,
      userInfo?.name,
      userInfo?.Name,
      userInfo?.userName,
      userInfo?.UserName,
      userInfo?.username,
      userInfo?.email,
      userInfo?.Email
    ]
      .map(value => String(value ?? '').trim().toLowerCase())
      .filter(Boolean)

  const isLastMessageFromCurrentUser = chat => {
    const currentUserIds = [
      currentUserId,
      userInfo?.userID,
      userInfo?.UserID,
      userInfo?.id,
      userInfo?.ID
    ]
      .map(normalizeUserId)
      .filter(Boolean)

    const senderId = normalizeUserId(
      chat?.lastMessageSenderId ??
        chat?.lastMessageSenderID ??
        chat?.LastMessageSenderID ??
        chat?.lastSenderId ??
        chat?.lastSenderID ??
        chat?.LastSenderID ??
        chat?.senderID ??
        chat?.SenderID
    )

    if (senderId && currentUserIds.includes(senderId)) return true

    const senderName = String(
      chat?.lastMessageSender ??
        chat?.lastSenderName ??
        chat?.senderName ??
        chat?.SenderName ??
        ''
    )
      .trim()
      .toLowerCase()

    return Boolean(senderName && getCurrentUserNames().includes(senderName))
  }

  const formatConversationPreview = chat => {
    const preview = formatChatPreview(chat?.lastMessage)
    const isOwnLastMessage = isLastMessageFromCurrentUser(chat)

    if (preview !== null && preview !== undefined && preview !== '') {
      const previewText = String(preview)
      return isOwnLastMessage ? `Bạn: ${previewText}` : previewText
    }

    return getChatAttachmentPreview(chat, { isOwn: isOwnLastMessage })
  }

  const isEventMessage = messageType => Number(messageType) === 5

  const formatGroupSenderLabel = group => {
    if (isEventMessage(group?.messageType ?? group?.MessageType)) return ''
    if (isLastMessageFromCurrentUser(group)) return 'Bạn: '
    if (group?.lastSenderName) return `${group.lastSenderName.split(' ').pop()}: `
    return ''
  }

  const formatGroupMessagePreview = group =>
    formatChatPreview(group?.lastMessage) || getChatAttachmentActionPreview(group)

  const individualUnreadCount = useMemo(() => {
    const count = userChatList.reduce((total, chat) => total + getUnreadCount(chat), 0)
    return count
  }, [userChatList])

  const groupUnreadCount = useMemo(() => {
    const count = groupChatList.reduce((total, chat) => total + getUnreadCount(chat), 0)
    return count
  }, [groupChatList])

  const totalUnreadCount = individualUnreadCount + groupUnreadCount

  const renderTabUnreadBadge = count => {
    if (count <= 0) return null

    return (
      <span className='ml-1.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white'>
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  const prefetchChatsPage = useCallback(() => {
    router.prefetch?.('/chats')
  }, [router])

  useEffect(() => {
    prefetchChatsPage()
  }, [prefetchChatsPage])

  // Listen for Web Push chat notifications
  useEffect(() => {
    const unsubscribe = onMessageForeground((payload) => {
      if (payload && payload.data && payload.data.type === '10') { // Chat notification
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

  // Calculate notification counts for each tab
  const getNotificationCountsForTabs = async () => {
    if (!notificationData) return { individual: 0, groups: 0 }

    try {
      const chatNotifications = notificationData.filter(
        (x) => x.type == MessageConstants.types.Chat && !x.isRead
      )

      const groupsCount = groupChatList.reduce((count, chat) => {
        const hasNotification = chatNotifications.some(
          (x) => x.refID == chat.id
        )
        return hasNotification ? count + 1 : count
      }, 0)

      const individualCount = chatNotifications.reduce((count, notification) => {
        const isGroupNotification = groupChatList.some(
          (chat) => chat.id == notification.refID
        )
        return !isGroupNotification ? count + 1 : count
      }, 0)

      return { individual: individualCount, groups: groupsCount }
    } catch (error) {
      console.error('Error calculating notification counts:', error)
      return { individual: 0, groups: 0 }
    }
  }

  // Update tab notification counts when notification data or chat lists change
  useEffect(() => {
    if (notificationData && (groupChatList.length > 0 || userChatList.length > 0)) {
      getNotificationCountsForTabs().then(counts => {
        setTabNotificationCounts(counts)
      })
    }
  }, [notificationData, groupChatList, userChatList])

  useEffect(() => {
    const handleUnreadCountChange = (event) => {
      const chatId = normalizeUserId(event?.detail?.chatId)
      const nextCount = getUnreadCount({ unreadCount: event?.detail?.count })

      if (chatId) {
        setUserChatList(prev =>
          prev.map(chat =>
            normalizeUserId(chat.id) === chatId || normalizeUserId(chat.chatID) === chatId
              ? { ...chat, unreadCount: nextCount, hasNotification: nextCount > 0 }
              : chat
          )
        )

        setGroupChatList(prev =>
          prev.map(chat =>
            normalizeUserId(chat.id) === chatId || normalizeUserId(chat.chatID) === chatId
              ? { ...chat, unreadCount: nextCount, hasNotification: nextCount > 0 }
              : chat
          )
        )
      }

      setForceUpdate(prev => prev + 1)
    }

    window.addEventListener('unreadCountChanged', handleUnreadCountChange)

    return () => {
      window.removeEventListener('unreadCountChanged', handleUnreadCountChange)
    }
  }, [])

  useEffect(() => {
    // Load cả individual và group chats bất kể đang ở tab nào để hiển thị unread count
    loadChatUser()
    loadAllUsers()
    loadData()
  }, [activeTab])

  // Load data lần đầu khi component mount
  useEffect(() => {
    loadChatUser()
    loadAllUsers()
    loadData()
  }, [])

  // Reload data when refreshTrigger changes (after creating new group)
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadChatUser()
      loadAllUsers()
      loadData()
    }
  }, [refreshTrigger])

  useEffect(() => {
    const handleChatListRefresh = () => {
      loadChatUser()
      loadAllUsers()
      loadData()
    }

    window.addEventListener('chatListShouldRefresh', handleChatListRefresh)
    return () => {
      window.removeEventListener('chatListShouldRefresh', handleChatListRefresh)
    }
  }, [activeTab, userInfo?.userID, notificationData])

  useEffect(() => {
    const existingChatUserIds = userChatList
      .map(chat => normalizeUserId(chat.userID ?? chat.UserID ?? chat.id ?? chat.ID))
      .filter(Boolean)
    const newChatUsers = allUsersList.filter(user => {
      const userId = getChatUserId(user)
      return (
        userId &&
        userId !== normalizeUserId(currentUserId) &&
        !existingChatUserIds.includes(userId) &&
        isActiveChatUser(user)
      )
    })

    if (!searchQuery.trim()) {
      setFilteredUserChats(userChatList)
      setFilteredGroupChats(groupChatList)
      setFilteredNewChatUsers(newChatUsers.slice(0, NEW_CHAT_USER_PREVIEW_LIMIT))
    } else {
      const query = searchQuery.trim().toLowerCase()

      const filteredUsers = userChatList.filter(
        chat =>
          chat.name?.toLowerCase().includes(query) ||
          formatConversationPreview(chat).toLowerCase().includes(query)
      )

      const filteredGroups = groupChatList.filter(
        chat =>
          chat.name?.toLowerCase().includes(query) ||
          formatConversationPreview(chat).toLowerCase().includes(query) ||
          chat.lastSenderName?.toLowerCase().includes(query)
      )

      const filteredNewUsers = newChatUsers.filter(user =>
        getChatUserSearchText(user).includes(query)
      )

      setFilteredUserChats(filteredUsers)
      setFilteredGroupChats(filteredGroups)
      setFilteredNewChatUsers(filteredNewUsers.slice(0, NEW_CHAT_USER_PREVIEW_LIMIT))
    }
  }, [searchQuery, userChatList, groupChatList, allUsersList, forceUpdate, currentUserId])

  const clearChatUnreadCount = useCallback(
    (chatId, chatType) => {
      setStoredUnreadCount(chatId, 0)

      if (chatType === 'individual') {
        setUserChatList(prev =>
          prev.map(c =>
            c.id === chatId
              ? { ...c, unreadCount: 0, hasNotification: false }
              : c
          )
        )
      } else {
        setGroupChatList(prev =>
          prev.map(c =>
            c.id === chatId
              ? { ...c, unreadCount: 0, hasNotification: false }
              : c
          )
        )
      }

      // Defer dispatch event để tránh setState trong render
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('unreadCountChanged', {
          detail: { chatId, count: 0 }
        }))
      }, 0)

      if (onUnreadCountChange) {
        onUnreadCountChange()
      }
    },
    [onUnreadCountChange]
  )

  useEffect(() => {
    if (!registerChatOpenCallback) return

    const unregister = registerChatOpenCallback((chatId, chatType) => {
      // Defer để tránh setState trong render
      setTimeout(() => {
        clearChatUnreadCount(chatId, chatType)
      }, 0)
    })

    return unregister
  }, [registerChatOpenCallback, clearChatUnreadCount])

  useEffect(() => {
    if (!registerChatCallback) {
      return
    }

    const unregister = registerChatCallback(msg => {
      if (msg?.isSeenUpdate || msg?.IsSeenUpdate) return

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

        const senderId = msg.senderID === userInfo?.userID ?
          (JSON.parse(msg.chatUsers || '[]')[0]?.UserID) : msg.senderID;

        const existingChatIndex = prev.findIndex(chat =>
          chat.id === senderId || chat.chatID === msg.chatID)

        if (existingChatIndex !== -1) {
          const updatedChats = prev.map(chat => {
            if (chat.id === senderId || chat.chatID === msg.chatID) {
              const isFromOther = msg.senderID !== userInfo?.userID
              const isNotCurrentChat = true
              let newUnreadCount = chat.unreadCount || 0

              if (isFromOther && isNotCurrentChat) {
                newUnreadCount += 1
                setTimeout(() => setStoredUnreadCount(msg.chatID, newUnreadCount), 0)
              }

              return {
                ...chat,
                chatID: msg.chatID,
                lastMessage: msg.content || msg.Content,
                lastMessageDate:
                  msg.createdDate || msg.timestamp || new Date().toISOString(),
                lastMessageSender: msg.senderName || 'Unknown',
                lastMessageSenderId: msg.senderID ?? msg.SenderID,
                messageType: msg.messageType ?? msg.MessageType,
                chatFiles: msg.chatFiles ?? msg.ChatFiles,
                unreadCount: newUnreadCount,
                hasNotification: newUnreadCount > 0
              }
            }
            return chat
          })

          return updatedChats.sort((a, b) => {
            const dateA = new Date(a.lastMessageDate || 0)
            const dateB = new Date(b.lastMessageDate || 0)
            return dateB - dateA
          })
        } else {
          const isFromOther = msg.senderID !== userInfo?.userID

          if (isFromOther) {
            const userInfo_sender = allUsersList.find(
              user => user.id === msg.senderID
            )

            if (userInfo_sender) {
              const newChat = {
                id: msg.senderID, // Sử dụng senderID thay vì chatID để consistent với logic filtering
                chatID: msg.chatID, // Lưu chatID riêng để sử dụng khi cần
                type: 'individual',
                name: userInfo_sender.fullName || msg.senderName || 'Unknown',
                avatar: userInfo_sender.avatar || msg.senderAvatar,
                role: userInfo_sender.roleName,
                department: userInfo_sender.departmentName,
                lastMessage: msg.content || msg.Content,
                lastMessageDate:
                  msg.createdDate || msg.timestamp || new Date().toISOString(),
                lastMessageSender: msg.senderName || 'Unknown',
                lastMessageSenderId: msg.senderID ?? msg.SenderID,
                messageType: msg.messageType ?? msg.MessageType,
                chatFiles: msg.chatFiles ?? msg.ChatFiles,
                unreadCount: 1,
                isOnline: onlineUsers.includes(msg.senderID),
                hasNotification: true
              }
              setTimeout(() => setStoredUnreadCount(msg.chatID, 1), 0)

              return [newChat, ...prev].sort((a, b) => {
                const dateA = new Date(a.lastMessageDate || 0)
                const dateB = new Date(b.lastMessageDate || 0)
                return dateB - dateA
              })
            }
          }
        }
        return prev
      })

      setGroupChatList(prev => {
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

        const existingChatIndex = prev.findIndex(chat => chat.id === msg.chatID)
        if (existingChatIndex !== -1) {
          const updatedChats = prev.map(chat => {
            if (chat.id === msg.chatID) {
              const isFromOther = msg.senderID !== userInfo?.userID
              const isNotCurrentChat = true
              let newUnreadCount = chat.unreadCount || 0

              if (isFromOther && isNotCurrentChat) {
                newUnreadCount += 1
                // Defer localStorage update to avoid setState during render
                setTimeout(() => setStoredUnreadCount(chat.id, newUnreadCount), 0)
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
                lastSenderName: msg.senderName || 'Unknown',
                lastSenderId: msg.senderID ?? msg.SenderID,
                unreadCount: newUnreadCount,
                hasNotification: newUnreadCount > 0
              }
            }
            return chat
          })

          return updatedChats.sort((a, b) => {
            const dateA = new Date(a.lastMessageDate || 0)
            const dateB = new Date(b.lastMessageDate || 0)
            return dateB - dateA
          })
        }
        return prev
      })
    })

    return unregister
  }, [registerChatCallback, userInfo, allUsersList, onlineUsers])

  const loadChatUser = async (options = {}) => {
    const { silent = false } = options
    try {
      if (!silent) setIsLoading(true)
      const existingChatsRes = await getGroupChats(
        ChatConstants.Type.PRIVATE,
        userInfo?.userID
      )
      const existingChats = existingChatsRes.data.data || []
      const processedExistingChats = existingChats.map(chat => {
        const storedCount = getStoredUnreadCount(chat.id)
        const serverCount = getUnreadCount(chat)
        const finalUnreadCount = serverCount

        if (serverCount !== storedCount) {
          setStoredUnreadCount(chat.id, serverCount)
        }

        // Check for notification
        const isNew = notificationData ? notificationData.some(
          (x) =>
            x.type == MessageConstants.types.Chat &&
            x.refID == chat.id &&
            !x.isRead
        ) : false

        return {
          ...chat,
          type: 'individual',
          userID: chat.userID,
          isOnline: onlineUsers.includes(chat.userID || chat.id),
          unreadCount: finalUnreadCount,
          hasNotification: finalUnreadCount > 0,
          lastMessageDate: chat.lastMessageDate || chat.lastMessageTime,
          isNew
        }
      })

      const sortedChats = processedExistingChats.sort((a, b) => {
        const dateA = new Date(a.lastMessageDate || 0)
        const dateB = new Date(b.lastMessageDate || 0)
        return dateB - dateA // Newest first
      })

      setUserChatList(sortedChats)
      if (!silent) setIsLoading(false)
    } catch (error) {
      console.warn('Error fetching user chats:', error)
      if (!silent) setIsLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      const res = await fetchUsersDropdownForChats()
      const users = res.data.data.users || []

      const uniqueUsers = users.filter((user, index, self) => {
        const userId = getChatUserId(user)
        return (
          userId &&
          userId !== normalizeUserId(currentUserId) &&
          isActiveChatUser(user) &&
          index === self.findIndex(u => getChatUserId(u) === userId)
        )
      }).map(user => {
        // Check for notification - match user to their chat
        let isNew = false

        if (notificationData && userChatList.length > 0) {
          const userChat = userChatList.find(chat => {
            return chat.name?.includes(user.fullName) ||
              chat.lastMessageSender?.includes(user.fullName) ||
              (chat.userID && chat.userID === user.id)
          })

          if (userChat) {
            const hasNotification = notificationData.some(
              (x) =>
                x.type == MessageConstants.types.Chat &&
                x.refID == userChat.id &&
                !x.isRead
            )

            isNew = hasNotification
          }
        }

        return {
          ...user,
          isNew
        }
      })

      setAllUsersList(uniqueUsers)
    } catch (error) {
      console.warn('Error fetching all users:', error)
    }
  }

  const loadData = async (options = {}) => {
    const { silent = false } = options
    if (userInfo) {
      try {
        if (!silent) setIsLoading(true)
        const res = await getGroupChats(
          ChatConstants.Type.GROUP,
          userInfo?.userID
        )
        const groupsWithStatusAndCount = (res.data.data || []).map(chat => {
          const onlineMembersCount = chat.members
            ? chat.members.filter(member => onlineUsers.includes(member.id))
              .length
            : 0

          const totalMembers =
            chat.countUser || (chat.members ? chat.members.length : 0)

          const storedCount = getStoredUnreadCount(chat.id)
          const serverCount = getUnreadCount(chat)
          const finalUnreadCount = serverCount

          if (serverCount !== storedCount) {
            setStoredUnreadCount(chat.id, serverCount)
          }

          // Check for notification
          const isNew = notificationData ? notificationData.some(
            (x) =>
              x.type == MessageConstants.types.Chat &&
              x.refID == chat.id &&
              !x.isRead
          ) : false

          return {
          ...chat,
          type: 'group',
          unreadCount: finalUnreadCount,
          onlineMembersCount,
          isActive: onlineMembersCount > 0,
          totalMembers,
          lastMessage: chat.lastMessage || '',
          messageType: chat.messageType ?? chat.MessageType ?? chat.lastMessageType ?? chat.LastMessageType,
          chatFiles: chat.chatFiles ?? chat.ChatFiles ?? chat.files ?? chat.Files,
          lastMessageSender: chat.lastMessageSender || '',
          lastSenderName: chat.lastSenderName || chat.lastMessageSender,
          lastMessageDate: chat.lastMessageDate || chat.lastMessageTime,
            hasNotification: finalUnreadCount > 0,
            isNew
          }
        })

        const sortedGroups = groupsWithStatusAndCount.sort((a, b) => {
          const dateA = new Date(a.lastMessageDate || 0)
          const dateB = new Date(b.lastMessageDate || 0)
          return dateB - dateA
        })

        setGroupChatList(sortedGroups)
        if (!silent) setIsLoading(false)
      } catch (error) {
        console.warn('Error fetching group chats:', error)
        if (!silent) setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (isConnected || !currentUserId) return

    let isPolling = false
    const pollChatLists = async () => {
      if (isPolling) return
      if (typeof document !== 'undefined' && document.hidden) return

      isPolling = true
      try {
        await Promise.allSettled([
          loadChatUser({ silent: true }),
          loadData({ silent: true })
        ])
      } finally {
        isPolling = false
      }
    }

    const timer = setInterval(pollChatLists, 1500)
    pollChatLists()
    return () => clearInterval(timer)
  }, [isConnected, currentUserId])

  const closeFloatingChatPopups = useCallback(() => {
    if (!activeChats || activeChats.length === 0) return

    activeChats.forEach(chat => {
      closeChatPopup(chat.id)
    })
  }, [activeChats, closeChatPopup])

  const handleTurnPage = () => {
    if (pathname === '/chats') {
      onClose?.()
      return
    }

    setIsOpeningChatsPage(true)
    onClose?.()
    prefetchChatsPage()
    router.push('/chats')

    if (typeof window !== 'undefined') {
      window.setTimeout(closeFloatingChatPopups, 0)
    } else {
      closeFloatingChatPopups()
    }
  }

  const handleChatSelect = chat => {
    const isExistingChat = !!(chat.lastMessage || chat.lastMessageDate)
    const chatType = chat.type || 'individual'
    const chatId = isExistingChat ? chat.id : (chat.userID || chat.id)
    markChatAsReadOnServer(chat)
    clearChatUnreadCount(chatId, chatType)

    // Clear all notifications for this chat and reset tab notification counts
    if (notificationData && Array.isArray(notificationData)) {
      const updatedNotifications = notificationData.map(notification =>
        notification.refID === chatId && notification.type === 10
          ? { ...notification, isRead: true }
          : notification
      )
      setNotificationData(updatedNotifications)
    }

    // Clear tab notification counts
    setTabNotificationCounts({ individual: 0, groups: 0 })

    // Nếu đang ở trang chat, chuyển hướng thay vì mở popup
    if (pathname === '/chats') {
      const queryParams = new URLSearchParams({
        chatId: chatId,
        type: chatType,
        isExistingChat: isExistingChat.toString()
      }).toString()

      router.push(`/chats?${queryParams}`)
      return
    }

    // Nếu không ở trang chat, mở popup như bình thường
    openChatPopup({
      id: chatId,
      name: chat.name || chat.fullName,
      avatar: chat.avatar || chat.avatarPath,
      isOnline: chat.isOnline,
      lastSeen: chat.lastSeen,
      type: chatType,
      isExistingChat: isExistingChat,
      isAI: chat.isAI || chat.id === 'heritage-assistant'
    })

    if (!isExistingChat && chatType === 'individual') {
      const newChat = {
        id: chat.id,
        chatID: chat.id, // sẽ được cập nhật qua SignalR
        type: 'individual',
        name: chat.name || chat.fullName,
        avatar: chat.avatar || chat.avatarPath,
        role: chat.role,
        department: chat.department,
        lastMessage: null,
        lastMessageDate: null,
        lastMessageSender: null,
        unreadCount: 0,
        isOnline: chat.isOnline,
        hasNotification: false
      }

      setUserChatList(prev => {
        return updated
      })
    }

    if (onClose) {
      onClose()
    }
  }

  const handleMarkAllAsRead = () => {
    const unreadChats = [...userChatList, ...groupChatList].filter(
      chat => getUnreadCount(chat) > 0
    )
    unreadChats.forEach(markChatAsReadOnServer)

    setUserChatList(prev =>
      prev.map(chat => {
        if (chat.unreadCount > 0) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('unreadCountChanged', {
              detail: { chatId: chat.id, count: 0 }
            }))
          }, 0)
        }
        return {
          ...chat,
          unreadCount: 0,
          hasNotification: false
        }
      })
    )


    setGroupChatList(prev =>
      prev.map(chat => {
        if (chat.unreadCount > 0) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('unreadCountChanged', {
              detail: { chatId: chat.id, count: 0 }
            }))
          }, 0)
        }
        return {
          ...chat,
          unreadCount: 0,
          hasNotification: false
        }
      })
    )

    if (typeof window !== 'undefined') {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('unreadCount_')) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
    }

    if (onUnreadCountChange) {
      onUnreadCountChange()
    }
  }

  return (
    <div className='w-[300px] bg-white shadow-md border rounded overflow-hidden'>
      {/* Header */}
      <div className='p-4 flex flex-col bg-white'>
        <div className='flex justify-between items-center mb-3'>
          <h2 className='text-lg font-semibold text-gray-900'>Tin nhắn</h2>
          {activeTab === 'group' && (
            <Button
              onClick={onOpen}
              variant='ghost'
              className='text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors'
            >
              <Users size={16} />
              <span className='text-sm font-medium'>Tạo nhóm mới</span>
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className='relative'>
          <Search
            size={16}
            className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
          />
          <Input
            type='text'
            placeholder='Tìm kiếm liên hệ'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all'
          />
        </div>
      </div>

      {/* Tabs */}
      <div className='border-t border-gray-100 bg-gray-50'>
        <div className='flex mx-4 mt-2'>
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 py-2.5 px-4 text-center text-sm font-medium rounded-t-lg transition-all ${activeTab === 'individual'
              ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
          >
            <div className='inline-flex min-w-0 items-center justify-center'>
              <span>Cá nhân</span>
              {renderTabUnreadBadge(individualUnreadCount)}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 py-2.5 px-4 text-center text-sm font-medium rounded-t-lg ml-1 transition-all ${activeTab === 'group'
              ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
          >
            <div className='inline-flex min-w-0 items-center justify-center'>
              <span>Nhóm</span>
              {renderTabUnreadBadge(groupUnreadCount)}
            </div>
          </button>
        </div>
      </div>

      <div className='overflow-y-auto' style={{ maxHeight: '300px' }}>
        {isLoading ? (
          <div className='flex items-center justify-center h-24'>
            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500'></div>
          </div>
        ) : activeTab === 'individual' ? (
          <>
            <div
              className='flex items-center px-4 py-3 cursor-pointer border-b border-gray-100 bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 hover:from-orange-100 hover:via-yellow-100 hover:to-orange-100 transition-all duration-300 relative overflow-hidden'
              onClick={() =>
                handleChatSelect({
                  id: 'heritage-assistant',
                  name: 'Trợ lý Di tích Lịch sử',
                  isAI: true,
                  type: 'individual'
                })
              }
            >
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50'></div>
              <div className='relative mr-3'>
                <div className='relative'>
                  <Image
                    src='/TTBT_icon_anim_idle.gif'
                    alt='Chatbot Icon'
                    width={40}
                    height={40}
                    className='rounded-full shadow-md'
                    unoptimized={true}
                  />
                  <div className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse'></div>
                </div>
              </div>
              <div className='flex-1 min-w-0 relative'>
                <div className='flex items-start justify-between'>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-sm font-semibold text-gray-900 truncate'>
                      Trợ lý trung tâm bảo tồn và phát huy giá trị di tích lịch
                      sử - văn hóa TP.HCM
                    </h3>
                    <p className='text-xs text-gray-600 truncate mt-0.5'>
                      Chào mừng bạn đến với trợ lý ảo! Tôi có thể giúp gì cho
                      bạn?
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-1 ml-3'>
                    <div className='w-2 h-2 bg-orange-400 rounded-full animate-pulse'></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Existing Chats */}
            {filteredUserChats.length > 0 && (
              <>
                <div className='px-4 py-2 bg-gray-50 border-b border-gray-200'>
                  <h4 className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>
                    Cuộc trò chuyện
                  </h4>
                </div>
                {filteredUserChats.map(chat => {
                  const unreadCount = getUnreadCount(chat)
                  const hasNewMessages = unreadCount > 0

                  return (
                    <div
                      key={chat.id}
                      className={`flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 transition-all duration-300 ${hasNewMessages
                        ? 'bg-[#F0F5FF] border-l-4 border-l-blue-500 hover:bg-[#E8F0FF]'
                        : 'hover:bg-gray-50'
                        }`}
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className='relative mr-2'>
                        {userInfo?.userID != chat?.senderID && chat?.isAI ? (
                          <Image
                            src='/TTBT_icon_anim_idle.gif'
                            alt='Chatbot Icon'
                            width={30}
                            height={30}
                            className='rounded-full'
                            unoptimized={true}
                          />
                        ) : (
                          <AvatarWithFrame
                            avatarPath={chat?.avatar}
                            altAvatar={chat?.name || 'Avatar'}
                            size={40}
                          />
                        )}
                        {chat.isOnline && (
                          <div className='absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full'></div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between'>
                          <div className='flex-1 min-w-0'>
                            <h3 className={`text-sm truncate ${hasNewMessages ? 'font-semibold text-gray-950' : 'font-medium text-gray-900'}`}>
                              {chat.name}
                            </h3>
                            <p className={`text-xs truncate mt-1 ${hasNewMessages ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                              {formatConversationPreview(chat) || 'Chưa có tin nhắn'}
                            </p>
                          </div>

                          <div className='flex flex-col items-end gap-1 ml-3'>
                            <div className='flex items-center gap-2'>
                              <span className={`text-xs ${hasNewMessages ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
                                {chat.lastMessageDate
                                  ? new Date(
                                    chat.lastMessageDate
                                  ).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  })
                                  : chat.lastMessageTime || ''}
                              </span>
                              {chat.isNew && (
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                              )}
                            </div>
                            {unreadCount > 0 && (
                              <div className='min-w-[18px] h-[18px] bg-[#2F54EB] rounded-full flex items-center justify-center px-1'>
                                <span className='text-xs text-white font-bold leading-none'>
                                  {unreadCount > 5
                                    ? '5+'
                                    : unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* New Chat Users */}
            {filteredNewChatUsers.length > 0 && (
              <>
                <div className='px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2'>
                  <Users size={14} className='text-blue-700' />
                </div>
                {filteredNewChatUsers.slice(0, NEW_CHAT_USER_PREVIEW_LIMIT).map(user => {
                  const userId = getChatUserId(user)

                  return (
                  <div
                    key={userId || user.id}
                    className='flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 group'
                    onClick={() => handleChatSelect({
                      id: userId || user.id,
                      name: user.fullName,
                      avatar: user.avatar,
                      role: user.roleName,
                      department: user.departmentName,
                      type: 'individual',
                      isOnline: onlineUsers.includes(userId || user.id),
                      lastMessage: null,
                      lastMessageDate: null
                    })}
                  >
                    <div className='relative mr-2'>
                      <AvatarWithFrame
                        avatarPath={user.avatar}
                        altAvatar={user.fullName || 'Avatar'}
                        size={40}
                      />
                      {onlineUsers.includes(userId || user.id) && (
                        <div className='absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full'></div>
                      )}
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between'>
                        <div className='flex-1 min-w-0'>
                          <h3 className='text-sm font-medium text-gray-900 truncate'>
                            {user.fullName}
                          </h3>
                        </div>

                        <div className='flex items-center gap-2 ml-3'>
                          {user.isNew && (
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                          )}
                          <div
                            className='w-6 h-6 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors duration-200'
                            title='Bắt đầu trò chuyện mới'
                          >
                            <Users size={12} className='text-blue-600 group-hover:text-blue-700' />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </>
            )}
            {/* Empty State */}
            {filteredUserChats.length === 0 && filteredNewChatUsers.length === 0 && (
              <div className='p-4 text-center text-sm text-gray-500'>
                {searchQuery ? 'Không tìm thấy ai' : 'Không có liên hệ nào'}
              </div>
            )}
          </>
        ) : activeTab === 'group' ? (
          filteredGroupChats.length > 0 ? (
            filteredGroupChats.map(group => {
              const unreadCount = getUnreadCount(group)
              const hasNewMessages = unreadCount > 0

              return (
                <div
                  key={group.id}
                  className={`flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 transition-all duration-300 ${hasNewMessages
                    ? 'bg-[#F0F5FF] border-l-4 border-l-blue-500 hover:bg-[#E8F0FF]'
                    : 'hover:bg-gray-50'
                    }`}
                  onClick={() => handleChatSelect(group)}
                >
                  <div className='relative mr-2'>
                    {group.avatar ? (
                      <AvatarWithFrame
                        avatarPath={group.avatar}
                        altAvatar={group.name || 'Avatar'}
                        size={40}
                      />
                    ) : (
                      <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                        <Users size={14} className='text-blue-600' />
                      </div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2 flex-1 min-w-0'>
                        <h3
                          className={`text-xs ${hasNewMessages ? 'font-semibold text-gray-950' : 'font-medium text-gray-900'
                            } truncate`}
                        >
                          {group.name}
                        </h3>
                        {group.isNew && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <div className='min-w-[18px] h-[18px] bg-[#2F54EB] rounded-full flex items-center justify-center ml-1 px-1'>
                          <span className='text-xs text-white font-bold leading-none'>
                            {unreadCount > 5 ? '5+' : unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    {(group.lastMessage || hasChatAttachmentPreview(group)) ? (
                      <p
                        className={`text-xs ${hasNewMessages
                          ? 'font-semibold text-gray-800'
                          : 'text-gray-500'
                          } truncate`}
                      >
                        <span
                          className={`font-medium ${hasNewMessages ? 'text-gray-900' : ''
                            }`}
                        >
                          {formatGroupSenderLabel(group)}
                        </span>
                        {formatGroupMessagePreview(group)}
                      </p>
                    ) : (
                      <p
                        className={`text-xs ${hasNewMessages
                          ? 'font-semibold text-gray-800'
                          : 'text-gray-500'
                          }`}
                      >
                        {group.totalMembers} thành viên
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className='p-4 text-center text-sm text-gray-500'>
              {searchQuery ? 'Không tìm thấy nhóm nào' : 'Không có nhóm nào'}
            </div>
          )
        ) : null}
      </div>

      {/* Footer */}
      <div className='border-t border-gray-100 bg-gray-50 py-2 px-3'>
        <div className='flex items-center justify-between gap-1'>
          <Button
            onClick={handleMarkAllAsRead}
            className={`text-xs hover:bg-blue-50 px-2 py-1.5 rounded transition-colors flex items-center flex-shrink-0 ${
              totalUnreadCount > 0
                ? 'font-semibold text-blue-700 hover:text-blue-800'
                : 'font-normal text-blue-600 hover:text-blue-700'
            }`}
            variant='ghost'
          >
            <Check size={12} strokeWidth={totalUnreadCount > 0 ? 3 : 2} className='mr-1' />
            <span className='whitespace-nowrap'>Đánh dấu đã đọc</span>
          </Button>
          <Button
            onClick={handleTurnPage}
            onMouseEnter={prefetchChatsPage}
            onFocus={prefetchChatsPage}
            disabled={isOpeningChatsPage}
            className='text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors flex items-center flex-shrink-0 disabled:cursor-wait disabled:opacity-70'
            variant='ghost'
          >
            <span className='whitespace-nowrap'>{isOpeningChatsPage ? 'Đang mở...' : 'Xem tất cả'}</span>
            <ArrowRight size={12} className={`ml-1 transition-transform ${isOpeningChatsPage ? 'translate-x-0.5' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatListInbox
