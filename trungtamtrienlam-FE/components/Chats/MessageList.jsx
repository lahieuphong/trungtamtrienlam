import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useMemo
} from 'react'
import MessageItem from './MessageItem'
import { fetchUsersDropdownForChats } from '@/lib/api/dropdownApi'
import { PinIcon, MoreHorizontal } from 'lucide-react'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import PinDropdownMenu from './PinDropdownMenu'
import { isCurrentUserMessage } from '@/helpers/chatMessageHelpers'
const MessageList = forwardRef(function MessageList (
  {
    messages,
    chatID,
    initialUnreadCount = 0,
    isAI,
    onRecallMessage,
    onReply,
    onUpdateNote,
    polls = [],
    onVote,
    onSeenMessage = () => {},
    reminders = [],
    onEditReminder,
    onJoinReminder,
    onDeclineReminder,
    onPinMessage,
    onUnpinMessage,
    handleAddNewOption,
    highlightedMessageId,
    hasMoreMessages = false,
    isLoadingOlderMessages = false,
    onLoadOlderMessages
  },
  ref
) {
  const handleRecallMessage = messageId => {
    onRecallMessage(messageId)
  }

  const handleScrollToMessage = messageId => {
    const messageElement = messageRefs.current[messageId]
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })

      messageElement.classList.add(
        'bg-yellow-100',
        'rounded-lg',
        'transition-colors',
        'duration-300'
      )
      setTimeout(() => {
        messageElement.classList.remove(
          'bg-yellow-100',
          'rounded-lg',
          'transition-colors',
          'duration-300'
        )
      }, 2000)
    }
  }

  const [openDropdown, setOpenDropdown] = useState(false)
  const [ListUsers, setListUsers] = useState([])
  const [readMessages, setReadMessages] = useState({})
  const [lastReadMessageId, setLastReadMessageId] = useState(null)
  const observerRef = useRef(null)
  const unreadMarkerContextRef = useRef({
    chatID: null,
    unreadCount: 0,
    initialized: false
  })
  const [showAllPins, setShowAllPins] = useState(false)
  const { userInfo } = useLoadLocalStorage()
  const messageRefs = useRef({})

  const normalizeUserId = value => {
    if (value === null || value === undefined) return ''
    return String(value)
  }

  const findUserById = userId => {
    const lookup = normalizeUserId(userId)
    if (!lookup) return null

    const users = Array.isArray(ListUsers)
      ? ListUsers
      : Array.isArray(ListUsers?.users)
      ? ListUsers.users
      : []

    return users.find(user =>
      [
        user?.id,
        user?.ID,
        user?.userID,
        user?.UserID,
        user?.value,
        user?.Value
      ]
        .map(normalizeUserId)
        .some(value => value === lookup)
    )
  }

  const getUserDisplayName = (userId, isCurrentUser = false) => {
    if (isCurrentUser) return 'Bạn'

    const user = findUserById(userId)
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

  const isCurrentUserId = userId => {
    const lookup = normalizeUserId(userId)
    if (!lookup) return false

    return [
      userInfo?.userID,
      userInfo?.UserID,
      userInfo?.id,
      userInfo?.ID
    ]
      .map(normalizeUserId)
      .some(value => value === lookup)
  }

  const replaceUserPlaceholders = content => {
    if (typeof content !== 'string') return content

    return content.replace(/{([^}]+)}/g, (_, userId) =>
      getUserDisplayName(userId, isCurrentUserId(userId))
    )
  }

  const getSeenUserId = user =>
    normalizeUserId(user?.userID ?? user?.UserID ?? user?.id ?? user?.ID)

  const parseSeenBy = seenBy => {
    if (Array.isArray(seenBy)) return seenBy
    if (typeof seenBy !== 'string' || !seenBy.trim()) return []

    try {
      const parsed = JSON.parse(seenBy)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const hasCurrentUserSeenMessage = message =>
    parseSeenBy(message?.seenBy).some(user =>
      isCurrentUserId(getSeenUserId(user))
    )

  const isMessageReadByCurrentUser = message => {
    const messageId = normalizeUserId(message?.id)
    return Boolean(
      messageId && (readMessages[messageId] || hasCurrentUserSeenMessage(message))
    )
  }

  const messageById = useMemo(() => {
    const byId = new Map()
    messages.forEach(message => {
      const messageId = normalizeUserId(message?.id)
      if (messageId) byId.set(messageId, message)
    })
    return byId
  }, [messages])

  const getMessageTimestamp = message =>
    new Date(message?.timestamp || message?.time || 0).getTime()
  const seenUsersByMessageId = useMemo(() => {
    const latestSeenByUser = new Map()

    messages.forEach((message, index) => {
      if (!isCurrentUserMessage(message, userInfo)) return

      parseSeenBy(message.seenBy).forEach(user => {
        const userId = getSeenUserId(user)
        if (!userId || isCurrentUserId(userId)) return

        const current = latestSeenByUser.get(userId)
        if (!current || index >= current.index) {
          latestSeenByUser.set(userId, {
            index,
            messageId: message.id,
            user
          })
        }
      })
    })

    const byMessageId = new Map()
    latestSeenByUser.forEach(({ messageId, user }) => {
      const users = byMessageId.get(messageId) || []
      byMessageId.set(messageId, [...users, user])
    })

    console.log('[chat-seen:page-map]', {
      totalMessages: messages.length,
      currentUser: userInfo,
      ownMessages: messages
        .filter(message => isCurrentUserMessage(message, userInfo))
        .map(message => ({
          id: message.id,
          content: message.content,
          seenBy: message.seenBy
        })),
      byMessageId: Array.from(byMessageId.entries())
    })

    return byMessageId
  }, [messages, userInfo])

  useEffect(() => {
    setReadMessages({})
    setLastReadMessageId(null)
    unreadMarkerContextRef.current = {
      chatID: normalizeUserId(chatID),
      unreadCount: Number(initialUnreadCount || 0),
      initialized: false
    }
  }, [chatID, initialUnreadCount])

  useEffect(() => {
    if (!messages || messages.length === 0) return

    const context = unreadMarkerContextRef.current
    if (context.initialized) return
    if (context.chatID !== normalizeUserId(chatID)) return

    context.initialized = true

    const unreadCount = Number(context.unreadCount || 0)
    if (unreadCount <= 0) {
      setLastReadMessageId(null)
      return
    }

    const otherMessages = messages
      .filter(msg => !isCurrentUserMessage(msg, userInfo))
      .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))

    const markerIndex = Math.max(0, otherMessages.length - unreadCount)
    setLastReadMessageId(otherMessages[markerIndex]?.id ?? null)
  }, [messages, chatID, userInfo])

  const handleMarkAsRead = messageId => {
    const messageKey = normalizeUserId(messageId)
    const message = messageById.get(messageKey)

    if (!messageKey || (message && isMessageReadByCurrentUser(message))) return

    setReadMessages(prev => ({
      ...prev,
      [messageKey]: true
    }))

    onSeenMessage(messageId)
  }
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId
            const message = messageById.get(normalizeUserId(messageId))
            if (messageId && message && !isMessageReadByCurrentUser(message)) {
              handleMarkAsRead(messageId)
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    // Chỉ observe tin nhắn chưa đọc cuối cùng của người khác
    setTimeout(() => {
      const rootElement =
        ref && typeof ref === 'object' && 'current' in ref ? ref.current : null
      const messageElements = (rootElement || document).querySelectorAll(
        '.message-item[data-from="other"]'
      )
      if (messageElements.length > 0) {
        for (let i = messageElements.length - 1; i >= 0; i--) {
          const element = messageElements[i]
          const messageId = element.dataset.messageId
          const message = messageById.get(normalizeUserId(messageId))
          if (messageId && message && !isMessageReadByCurrentUser(message)) {
            observerRef.current.observe(element)
            break
          }
        }
      }
    }, 200)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [messages, readMessages, messageById, userInfo])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchUsersDropdownForChats()
        const usersData = res.data?.data
        if (usersData && typeof usersData === 'object') {
          if (Array.isArray(usersData)) {
            setListUsers(usersData)
          } else if (usersData.users && Array.isArray(usersData.users)) {
            setListUsers(usersData.users)
          } else {
            setListUsers([])
          }
        } else {
          setListUsers([])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        setListUsers([])
      }
    }
    loadUser()
  }, [])

  const formatDateSeparator = timestamp => {
    if (!timestamp) return ''

    const messageDate = new Date(timestamp)
    const today = new Date()

    const isToday = messageDate.toDateString() === today.toDateString()

    if (isToday) {
      return 'Hôm nay'
    } else {
      return messageDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true // Always show for first message

    const currentDate = new Date(
      currentMessage.timestamp || currentMessage.time
    ).toDateString()
    const previousDate = new Date(
      previousMessage.timestamp || previousMessage.time
    ).toDateString()

    return currentDate !== previousDate
  }

  const formatMessageContent = msg => {
    if (msg?.isUnsend) return 'Tin nhắn đã được thu hồi'
    if (!msg?.content) return ''
    const content = typeof msg.content === 'string' ? msg.content : String(msg.content)

    // Nếu có chữ "ghi chú"
    if (content.toLowerCase().includes('ghi chú')) {
      const allUserIds = content.match(/{([^}]+)}/g) || []
      let displayContent = content

      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const isActorCurrentUser = isCurrentUserId(actorId)
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        displayContent = `${actorName} đã tạo ghi chú mới`
      } else {
        displayContent = 'Đã tạo ghi chú mới'
      }

      return displayContent
    }

    return replaceUserPlaceholders(content)
  }

  const isPinnedItem = msg =>
    msg?.isPin === true ||
    msg?.IsPin === true ||
    msg?.NotePin === true ||
    msg?.notePin === true

  const getPinnedMessageKey = msg => {
    if (msg?.isPin === true || msg?.IsPin === true) {
      return `message-${msg.id ?? msg.ID}`
    }

    if (msg?.NotePin === true || msg?.notePin === true) {
      return `event-${msg.eventID ?? msg.EventID}`
    }

    return `pin-${msg?.id ?? msg?.ID ?? msg?.eventID ?? msg?.EventID}`
  }

  const getUniquePinnedMessages = sourceMessages => {
    const seen = new Set()

    return (sourceMessages || []).filter(msg => {
      if (!isPinnedItem(msg)) return false

      const key = getPinnedMessageKey(msg)
      if (seen.has(key)) return false

      seen.add(key)
      return true
    })
  }

  const formatPinnedMessagePreview = msg => {
    const sender = msg?.senderName || msg?.SenderName || 'Người dùng'
    const content = formatMessageContent(msg) || 'Tin nhắn không có nội dung'

    return `${sender}: ${content}`
  }

  const pinnedMessages = getUniquePinnedMessages(messages)

  const hasRenderableMessageContent = message => {
    if (!message) return false
    if (message.isUnsend || message.messageType === 5) return true
    if (typeof message.content === 'string' && message.content.trim()) {
      return true
    }
    if (message.content && typeof message.content !== 'string') return true
    if (Array.isArray(message.files) && message.files.length > 0) return true
    if (message.chatLinks) return true
    if (message.type === 'file') return true
    return false
  }

  const visibleMessages = messages.filter(hasRenderableMessageContent)

  const handleUnpin = ids => {
    const arr = Array.isArray(ids) ? ids : [ids]
    const messageID = []
    const eventID = []
    arr.forEach(id => {
      const m = pinnedMessages.find(pm => {
        const messageId = pm?.id ?? pm?.ID
        const eventId = pm?.eventID ?? pm?.EventID

        return (
          ((pm?.isPin || pm?.IsPin) && messageId === id) ||
          ((pm?.NotePin || pm?.notePin) && eventId === id)
        )
      })
      if (!m) return

      if ((m.isPin || m.IsPin) && (m.id ?? m.ID) === id) {
        messageID.push(id)
      } else if ((m.NotePin || m.notePin) && (m.eventID ?? m.EventID) === id) {
        eventID.push(id)
      }
    })

    onUnpinMessage({ messageID, eventID })
  }

  const handleMessagesScroll = event => {
    if (!hasMoreMessages || isLoadingOlderMessages) return
    if (event.currentTarget.scrollTop <= 80) {
      onLoadOlderMessages?.()
    }
  }

  return (
    <div
      ref={ref}
      onScroll={handleMessagesScroll}
      className='flex-1 overflow-y-auto p-4 flex flex-col h-full pt-0 pl-0 pr-0'
      style={{ scrollBehavior: 'smooth', minHeight: 0 }}
    >
      <div className='flex-1 flex flex-col px-3'>
        {(hasMoreMessages || isLoadingOlderMessages) && (
          <div className='flex justify-center py-2'>
            <button
              type='button'
              onClick={() => onLoadOlderMessages?.()}
              disabled={isLoadingOlderMessages}
              className='rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm border border-gray-200 disabled:cursor-wait disabled:opacity-70'
            >
              {isLoadingOlderMessages
                ? 'Đang tải tin nhắn cũ...'
                : 'Tải tin nhắn cũ hơn'}
            </button>
          </div>
        )}

        {pinnedMessages.length > 0 && (
          <div className='sticky top-0 z-20 border-b bg-white/95 px-3 py-1.5 backdrop-blur'>
            <div className='flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-2 py-1.5 text-xs'>
              <PinIcon className='h-3.5 w-3.5 shrink-0 text-blue-500' />
              <span className='shrink-0 font-semibold text-blue-700'>
                {pinnedMessages.length > 1
                  ? `${pinnedMessages.length} ghim`
                  : 'Đã ghim'}
              </span>
              <span className='min-w-0 flex-1 truncate text-gray-700'>
                <span className='font-semibold text-gray-900'>Mới:</span>{' '}
                {formatPinnedMessagePreview(pinnedMessages[0])}
              </span>

              {pinnedMessages.length > 1 && (
                <button
                  type='button'
                  onClick={() => setShowAllPins(!showAllPins)}
                  className='shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100'
                >
                  {showAllPins ? 'Ẩn' : `+${pinnedMessages.length - 1}`}
                </button>
              )}

              <div className='relative shrink-0'>
                <button
                  onClick={() => setOpenDropdown(!openDropdown)}
                  className='flex h-6 w-6 items-center justify-center rounded-full hover:bg-blue-100'
                >
                  <MoreHorizontal className='h-3.5 w-3.5 text-gray-500' />
                </button>

                <PinDropdownMenu
                  isOpen={openDropdown}
                  onClose={() => setOpenDropdown(false)}
                  messages={pinnedMessages}
                  onUnpin={handleUnpin}
                />
              </div>
            </div>

            {showAllPins && pinnedMessages.length > 1 && (
              <div className='mt-1 overflow-hidden rounded-md border border-gray-100 bg-white text-xs shadow-sm'>
                {pinnedMessages.slice(1).map(msg => (
                  <div
                    key={getPinnedMessageKey(msg)}
                    className='truncate px-2 py-1.5 text-gray-600 hover:bg-gray-50'
                  >
                    {formatPinnedMessagePreview(msg)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleMessages.map((message, index) => (
          <React.Fragment key={message.id}>
            {/* Date Separator */}
            {shouldShowDateSeparator(message, visibleMessages[index - 1]) && (
              <div className='flex justify-center my-4'>
                <div className='bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-600 font-medium'>
                  {formatDateSeparator(message.timestamp || message.time)}
                </div>
              </div>
            )}

            <div
              ref={el => {
                if (el) messageRefs.current[message.id] = el
              }}
              id={`message-${message.id}`}
              className={
                highlightedMessageId === message.id
                  ? 'bg-yellow-100 rounded-lg transition-colors duration-300'
                  : ''
              }
            >
              <MessageItem
                message={message}
                isAI={isAI}
                onRecallMessage={handleRecallMessage}
                ListUsers={ListUsers}
                onReply={onReply}
                onUpdateNote={onUpdateNote}
                polls={polls}
                onVote={onVote}
                isRead={isMessageReadByCurrentUser(message)}
                lastReadMessageId={lastReadMessageId}
                onMarkAsRead={() => handleMarkAsRead(message.id)}
                reminders={reminders}
                onEditReminder={onEditReminder}
                onJoinReminder={onJoinReminder}
                onDeclineReminder={onDeclineReminder}
                onPinMessage={onPinMessage}
                onUnpinMessage={onUnpinMessage}
                onScrollToMessage={handleScrollToMessage}
                handleAddNewOption={handleAddNewOption}
                seenByUsers={seenUsersByMessageId.get(message.id) || []}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
      <div id='scroll-anchor' style={{ height: '1px', width: '100%' }}></div>
    </div>
  )
})

export default MessageList
