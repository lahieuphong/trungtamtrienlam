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
    if (isCurrentUser) return 'Báº¡n'

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
    if (messages && messages.length) {
      const unreadMessages = messages
        .filter(
          msg => !readMessages[msg.id] && !isCurrentUserMessage(msg, userInfo)
        )
        .sort(
          (a, b) =>
            new Date(a.timestamp || a.time) - new Date(b.timestamp || b.time)
        )

      if (unreadMessages.length > 0) {
        setLastReadMessageId(unreadMessages[0].id)
      }
    }
  }, [messages, readMessages, userInfo])

  const handleMarkAsRead = messageId => {
    setReadMessages(prev => ({
      ...prev,
      [messageId]: true
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
            if (messageId && !readMessages[messageId]) {
              handleMarkAsRead(messageId)
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    // Chá»‰ observe tin nháº¯n chÆ°a Ä‘á»c cuá»‘i cÃ¹ng cá»§a ngÆ°á»i khÃ¡c
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
          if (messageId && !readMessages[messageId]) {
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
  }, [messages, readMessages])

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
      return 'HÃ´m nay'
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
    if (msg?.isUnsend) return 'Tin nháº¯n Ä‘Ã£ Ä‘Æ°á»£c thu há»“i'
    if (!msg?.content) return ''
    const content = typeof msg.content === 'string' ? msg.content : String(msg.content)

    // Náº¿u cÃ³ chá»¯ "ghi chÃº"
    if (content.toLowerCase().includes('ghi chÃº')) {
      const allUserIds = content.match(/{([^}]+)}/g) || []
      let displayContent = content

      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const isActorCurrentUser = isCurrentUserId(actorId)
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        displayContent = `${actorName} Ä‘Ã£ táº¡o ghi chÃº má»›i`
      } else {
        displayContent = 'ÄÃ£ táº¡o ghi chÃº má»›i'
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
    const sender = msg?.senderName || msg?.SenderName || 'NgÆ°á»i dÃ¹ng'
    const content = formatMessageContent(msg) || 'Tin nháº¯n khÃ´ng cÃ³ ná»™i dung'

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
      className={`flex-1 overflow-y-auto p-4 flex flex-col h-full pt-0 pl-0 pr-0 ${
        isAI ? 'justify-center items-center' : ''
      }`}
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
                ? 'Äang táº£i tin nháº¯n cÅ©...'
                : 'Táº£i tin nháº¯n cÅ© hÆ¡n'}
            </button>
          </div>
        )}

        {pinnedMessages.length > 0 && (
          <div className='sticky top-0 z-20 bg-white border-b p-2'>
            <div className='flex items-center gap-2'>
              <PinIcon className='w-4 h-4 text-gray-500' />
              <span className='text-sm font-medium text-gray-600'>
                Tin nháº¯n Ä‘Ã£ ghim
              </span>
            </div>

            <div className='mt-1 border rounded px-3 py-2 text-sm bg-gray-50 flex justify-between items-start gap-3'>
              <div className='min-w-0 flex-1'>
                <p className='text-xs font-medium text-gray-500'>
                  {pinnedMessages.length > 1
                    ? `ÄÃ£ ghim ${pinnedMessages.length} tin nháº¯n`
                    : 'ÄÃ£ ghim 1 tin nháº¯n'}
                </p>
                <p className='mt-0.5 truncate text-gray-700'>
                  <span className='font-semibold'>Má»›i nháº¥t:</span>{' '}
                  {formatPinnedMessagePreview(pinnedMessages[0])}
                </p>
                {pinnedMessages.length > 1 && (
                  <button
                    type='button'
                    onClick={() => setShowAllPins(!showAllPins)}
                    className='mt-1 text-xs font-medium text-blue-500 hover:text-blue-600'
                  >
                    {showAllPins
                      ? 'áº¨n bá»›t tin ghim'
                      : `Xem thÃªm ${pinnedMessages.length - 1} tin ghim`}
                  </button>
                )}
              </div>

              <div className='relative'>
                <button
                  onClick={() => setOpenDropdown(!openDropdown)}
                  className='p-1 rounded hover:bg-gray-200'
                >
                  <MoreHorizontal className='w-4 h-4 text-gray-500' />
                </button>

                <PinDropdownMenu
                  isOpen={openDropdown}
                  onClose={() => setOpenDropdown(false)}
                  messages={pinnedMessages}
                  onUnpin={handleUnpin}
                />
              </div>

              {/* NÃºt More */}
            </div>

            {showAllPins && pinnedMessages.length > 1 && (
              <div className='mt-2 border rounded bg-gray-50 divide-y'>
                <div className='px-3 py-1 text-xs font-medium text-gray-500'>
                  CÃ¡c tin ghim khÃ¡c
                </div>
                {pinnedMessages.slice(1).map(msg => (
                  <div
                    key={getPinnedMessageKey(msg)}
                    className='px-3 py-2 hover:bg-gray-100 cursor-pointer truncate text-sm text-gray-700'
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
                isRead={!!readMessages[message.id]}
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
