import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  X,
  Send,
  Minimize2,
  Paperclip,
  Smile,
  PinIcon,
  MoreHorizontal,
  UserIcon
} from 'lucide-react'
import AvatarWithFrame from '../avatars/avatarFrame'
import ChatPopupMessageItem from './ChatPopupMessageItem'
import ChatPopupMessageInput from './ChatPopupMessageInput'
import PinDropdownMenu from './PinDropdownMenu'
import ChatPinActionNotice, {
  getChatPinActionTargetId,
  isChatPinActionMessage
} from './ChatPinActionNotice'
import UserRequestsModal from './UserRequestsModal'
import { useChatMessages } from '@/hooks/useChatPopup'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { ChatUserConstants } from '@/constants/chatConstants'

const normalizeChatId = value => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const getChatMemberId = member =>
  normalizeChatId(member?.userID ?? member?.UserID ?? member?.id ?? member?.ID)

const getChatMemberRole = member =>
  Number(member?.role ?? member?.Role ?? ChatUserConstants.Role.Member)

const getCurrentUserId = user =>
  normalizeChatId(user?.userID ?? user?.UserID ?? user?.id ?? user?.ID)

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

export default function ChatPopup ({
  isOpen,
  onClose,
  onMinimize,
  isMinimized,
  chat,
  position = { bottom: 20, right: 20 }
}) {
  const [message, setMessage] = useState('')
  const [openDropdown, setOpenDropdown] = useState(false)
  const [showAllPins, setShowAllPins] = useState(false)
  const [localReplyToMessage, setLocalReplyToMessage] = useState(null)
  const [showUserRequestsModal, setShowUserRequestsModal] = useState(false)
  const { userInfo } = useLoadLocalStorage()

  const {
    messages,
    isLoading,
    isSending,
    isChatsAI,
    attachedFiles,
    setAttachedFiles,
    replyToMessage,
    setReplyToMessage,
    handleSendMessage: sendMessage,
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
    ListUsers,
    individualUsersList,
    polls,
    reminders,
    userRequests,
    unreadCount,
    clearUnreadCount,
    hasMoreMessages,
    isLoadingOlder,
    loadOlderMessages,
    scrollToBottom,
    isAtBottom,
    messagesEndRef,
    messageListRef
  } = useChatMessages(
    chat?.isExistingChat ? chat?.id : null, // chatId - only if existing chat
    chat?.isExistingChat ? null : chat?.id, // userId - only for new chat
    chat?.type,
    chat
  )
  const usersForMessageLookup = useMemo(() => {
    if (Array.isArray(ListUsers) && ListUsers.length > 0) return ListUsers
    if (Array.isArray(individualUsersList)) return individualUsersList
    return []
  }, [ListUsers, individualUsersList])
  const messageRefs = useRef({})
  const hasMarkedAsSeenRef = useRef(false)
  const messageInputRef = useRef(null)
  const lastSeenMessageRef = useRef(null)
  const skipNextAutoScrollRef = useRef(false)
  const isAIHeaderChat = Boolean(chat?.isAI || chat?.id === 'heritage-assistant' || isChatsAI)

  const handleLoadOlderMessages = useCallback(() => {
    skipNextAutoScrollRef.current = true
    return loadOlderMessages()
  }, [loadOlderMessages])

  const handleMessagesScroll = useCallback(() => {
    const box = messageListRef.current
    if (!box || isLoadingOlder || !hasMoreMessages) return
    if (box.scrollTop <= 80) {
      handleLoadOlderMessages()
    }
  }, [hasMoreMessages, isLoadingOlder, handleLoadOlderMessages, messageListRef])

  useEffect(() => {
    if (messages.length > 0 && chat?.id && isOpen && !isMinimized) {
      const lastOtherMessage = messages
        .filter(msg => msg.sender !== 'me' && !msg.isMe)
        .pop()
      if (
        lastOtherMessage &&
        lastOtherMessage.id !== lastSeenMessageRef.current
      ) {
        lastSeenMessageRef.current = lastOtherMessage.id
        handleMarkMessageAsSeen(lastOtherMessage.id)
      }
    }
  }, [messages, chat?.id, handleMarkMessageAsSeen, isOpen, isMinimized])

  useEffect(() => {
    if (
      isOpen &&
      !isMinimized &&
      messages.length > 0 &&
      !hasMarkedAsSeenRef.current
    ) {
      clearUnreadCount()
      hasMarkedAsSeenRef.current = true
    }

    if (!isOpen || isMinimized) {
      hasMarkedAsSeenRef.current = false
      lastSeenMessageRef.current = null
    }
  }, [isOpen, isMinimized, messages.length, clearUnreadCount])

  useEffect(() => {
    lastSeenMessageRef.current = null
  }, [chat?.id])

  useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false
      return
    }

    if (isOpen && !isMinimized && messages.length > 0) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isMinimized, isOpen, messages.length, scrollToBottom])

  const isCurrentUserLeader = 
    userInfo && ListUsers && Array.isArray(ListUsers)
      ? (() => {
          const currentUserId = getCurrentUserId(userInfo)
          const currentUserMember = ListUsers.find(
            user => getChatMemberId(user) === currentUserId
          )

          return isCurrentMemberChatManager(currentUserMember, currentUserId)
        })()
      : false

  const handleSendMessage = async () => {
    if (!message.trim() && attachedFiles.length === 0) return
    if (!chat?.id) return

    const messageToSend = message

    setMessage('')
    setAttachedFiles([])
    setReplyToMessage(null)
    setLocalReplyToMessage(null)

    try {
      await sendMessage(messageToSend)
      setTimeout(scrollToBottom, 100) 
    } catch (error) {
      console.error('Error in handleSendMessage:', error)
    }
  }

  const handleReplyMessageWithFocus = messageToReply => {
    setLocalReplyToMessage(messageToReply)
    setReplyToMessage(messageToReply)
    setTimeout(() => {
      if (messageInputRef.current && messageInputRef.current.focusInput) {
        messageInputRef.current.focusInput()
      }
    }, 100)
  }

  const handleCancelReply = () => {
    setLocalReplyToMessage(null)
    setReplyToMessage(null)
  }

  const findUserForMessageContent = userId => {
    const lookup = normalizeChatId(userId)
    if (!lookup) return null

    return usersForMessageLookup.find(user =>
      [
        user?.id,
        user?.ID,
        user?.userID,
        user?.UserID,
        user?.value,
        user?.Value
      ]
        .map(normalizeChatId)
        .some(value => value === lookup)
    )
  }

  const getUserDisplayNameForMessageContent = userId => {
    const lookup = normalizeChatId(userId)
    if (!lookup) return ''

    if (lookup === getCurrentUserId(userInfo)) return 'Bạn'

    const user = findUserForMessageContent(userId)
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

  const replaceUserPlaceholders = content => {
    if (typeof content !== 'string') return content

    return content.replace(/{([^}]+)}/g, (_, userId) =>
      getUserDisplayNameForMessageContent(userId)
    )
  }

  const formatMessageContent = msg => {
    if (msg?.isUnsend) return 'Tin nhắn đã được thu hồi'
    if (!msg?.content) return ''
    const content = typeof msg.content === 'string' ? msg.content : String(msg.content)

    if (content.toLowerCase().includes('ghi chú')) {
      const allUserIds = content.match(/{([^}]+)}/g) || []
      let displayContent = content

      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const actorName = getUserDisplayNameForMessageContent(actorId)
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

  const getSeenUserId = user =>
    normalizeChatId(user?.userID ?? user?.UserID ?? user?.id ?? user?.ID)

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

  const isCurrentUserPopupMessage = msg => {
    if (!msg) return false
    if (msg.sender === 'me' || msg.isMe) return true

    const senderId = normalizeChatId(
      msg.senderID ?? msg.SenderID ?? msg.userID ?? msg.UserID
    )

    return Boolean(senderId && senderId === getCurrentUserId(userInfo))
  }

  const seenUsersByMessageId = useMemo(() => {
    const latestSeenByUser = new Map()

    messages.forEach((message, index) => {
      if (!isCurrentUserPopupMessage(message)) return

      parseSeenBy(message.seenBy).forEach(user => {
        const userId = getSeenUserId(user)
        if (!userId || userId === getCurrentUserId(userInfo)) return

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

    console.log('[chat-seen:popup-map]', {
      chatId: chat?.id,
      totalMessages: messages.length,
      currentUser: userInfo,
      ownMessages: messages
        .filter(message => isCurrentUserPopupMessage(message))
        .map(message => ({
          id: message.id,
          content: message.content,
          seenBy: message.seenBy
        })),
      byMessageId: Array.from(byMessageId.entries())
    })

    return byMessageId
  }, [messages, userInfo])

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

    handleUnpinMessage({ messageID, eventID })
  }

  const getPinActionTargetMessage = actionMessage => {
    const targetId = normalizeChatId(getChatPinActionTargetId(actionMessage))
    if (!targetId) return null

    return (
      messages.find(msg => normalizeChatId(msg?.id ?? msg?.ID) === targetId) ||
      null
    )
  }

  // Wrapper functions to close modal after user request actions
  const handleAcceptUserRequestAndCloseModal = async (requestId) => {
    await handleAcceptUserRequest(requestId)
    setShowUserRequestsModal(false)
  }

  const handleRejectUserRequestAndCloseModal = async (requestId) => {
    await handleRejectUserRequest(requestId)
    setShowUserRequestsModal(false)
  }

  if (!isOpen) return null

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

  return (
    <div
      className={`fixed z-[9990] rounded-t-lg bg-white shadow-2xl border transition-all duration-300 flex flex-col overflow-hidden ${
        isAIHeaderChat ? 'border-amber-300 shadow-amber-200/50' : 'border-gray-200'
      } ${
        isMinimized ? 'h-12' : 'h-96 max-h-96'
      }`}
      style={{
        bottom: position.bottom,
        right: position.right,
        width: '350px',
        maxWidth: '350px'
      }}
    >
      {isSending && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-[9999] bg-[rgba(0,0,0,0.0)]">
          <div className="">
            <img className='w-20 h-20' src="/icons/loading_2.gif" />
          </div>
          {/* <p className='text-[#597EF7] text-base'>Đang tải dữ liệu, xin vui lòng đợi trong giây lát...</p> */}
        </div>
      )}

      {/* Header */}
      <div
        className={`flex items-center justify-between rounded-t-lg p-3 ${
          isAIHeaderChat
            ? 'border-b border-amber-400 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-200 text-amber-950'
            : 'bg-blue-500 text-white'
        }`}
      >
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          {isAIHeaderChat ? (
            <div className='flex h-[35px] w-[35px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/30 bg-white/60 shadow-sm'>
              <img
                src='/TTBT_icon_anim_idle.gif'
                alt='Trợ lý trung tâm'
                className='h-full w-full rounded-full object-cover'
              />
            </div>
          ) : (
            <AvatarWithFrame
              avatarPath={chat?.avatar}
              altAvatar={chat?.name || 'Avatar'}
              size={35}
            />
          )}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <h3
                className='text-sm font-medium truncate'
                title={chat?.name || 'Unknown User'}
              >
                {chat?.id === 'heritage-assistant'
                  ? 'Trợ lý trung tâm bảo tồn và ...'
                  : chat?.name && chat?.name.length > 15
                  ? chat?.name.substring(0, 15) + '...'
                  : chat?.name || 'Unknown User'}
              </h3>
              {unreadCount > 0 && (
                <span className='bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center'>
                  {unreadCount}
                </span>
              )}
            </div>
            {/* <p className='text-xs opacity-80'>
              {chat?.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
            </p> */}
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-1'>
          <button
            onClick={onMinimize}
            className={`rounded p-1 transition-colors ${
              isAIHeaderChat ? 'hover:bg-amber-400/70' : 'hover:bg-blue-600'
            }`}
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={onClose}
            className={`rounded p-1 transition-colors ${
              isAIHeaderChat ? 'hover:bg-amber-400/70' : 'hover:bg-blue-600'
            }`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div
            ref={messageListRef}
            onScroll={handleMessagesScroll}
            className={`min-h-0 flex-1 overflow-y-auto p-3 ${
              isAIHeaderChat
                ? 'bg-gradient-to-b from-amber-50/90 to-orange-50/40'
                : 'bg-gray-50'
            }`}
          >
            {isLoading ? (
              <div className='flex items-center justify-center h-full'>
                <div className='text-sm text-gray-500'>
                  Đang tải tin nhắn...
                </div>
              </div>
            ) : (
              <div className='space-y-1'>
                {(hasMoreMessages || isLoadingOlder) && (
                  <div className='flex justify-center py-2'>
                    <button
                      type='button'
                      onClick={handleLoadOlderMessages}
                      disabled={isLoadingOlder}
                      className='rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm border border-gray-200 disabled:cursor-wait disabled:opacity-70'
                    >
                      {isLoadingOlder
                        ? 'Đang tải tin nhắn cũ...'
                        : 'Tải tin nhắn cũ hơn'}
                    </button>
                  </div>
                )}
                {/* Pinned Messages Section */}
                {(() => {
                  if (pinnedMessages.length === 0) return null

                  return (
                    <div className='sticky top-0 z-10 mb-1 border-b bg-white/95 px-3 py-1.5 backdrop-blur'>
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
                  )
                })()}

                {messages.map((msg, index) => {
                  const prevMsg = messages[index - 1]
                  const showDate =
                    !prevMsg ||
                    new Date(msg.timestamp).toDateString() !==
                      new Date(prevMsg.timestamp).toDateString()

                  return (
                    <div key={msg.id}>
                      {/* Date Separator */}
                      {showDate && (
                        <div className='flex justify-center my-2'>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              isAIHeaderChat
                                ? 'border border-amber-200 bg-amber-100 text-amber-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleDateString(
                              'vi-VN',
                              {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }
                            )}
                          </span>
                        </div>
                      )}
                      {isChatPinActionMessage(msg) ? (
                        <ChatPinActionNotice
                          message={msg}
                          targetMessage={getPinActionTargetMessage(msg)}
                          pinnedMessages={pinnedMessages}
                          onUnpin={handleUnpin}
                          onScrollToMessage={handleScrollToMessage}
                        />
                      ) : (
                        <div
                          ref={el => {
                            if (el) messageRefs.current[msg.id] = el
                          }}
                          id={`message-${msg.id}`}
                        >
                          <ChatPopupMessageItem
                            message={msg}
                            isAI={isChatsAI}
                            onRecallMessage={handleRecallMessage}
                            onReply={handleReplyMessageWithFocus}
                            onVote={handleVoteOnPoll}
                            onEditReminder={handleEditReminder}
                            onUpdateNote={handleUpdateNote}
                            userInfo={userInfo}
                            ListUsers={usersForMessageLookup}
                            polls={polls}
                            reminders={reminders}
                            onJoinReminder={handleJoinReminder}
                            onDeclineReminder={handleDeclineReminder}
                            onPinMessage={handlePinMessage}
                            onUnpinMessage={handleUnpinMessage}
                            handleAddNewOption={handleAddNewOption}
                            onScrollToMessage={handleScrollToMessage}
                            isRead={true}
                            onMarkAsRead={() => {}}
                            seenByUsers={seenUsersByMessageId.get(msg.id) || []}
                          />
                        </div>
                      )}
                      {/* Message Item */}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* User Requests Section */}
          {chat?.type === 'group' &&
            chat?.id &&
            userRequests &&
            userRequests.length > 0 && (
              <div className='px-4 pt-2 flex flex-col items-center gap-2 border-t border-gray-100'>
                {userRequests.slice(0, 2).map((request, index) => (
                  <div
                    key={index}
                    className='flex w-full items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-2 text-[12px] shadow-sm'
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
                        className='ml-1 flex-shrink-0 rounded-md bg-yellow-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-yellow-600'
                      >
                        Xét duyệt
                      </button>
                    )}
                  </div>
                ))}
                {userRequests.length > 2 && (
                  <div className='w-full rounded-lg border border-yellow-300 bg-yellow-50 py-1.5 text-center shadow-sm'>
                    <span className='text-xs text-gray-600'>
                      +{userRequests.length - 2} yêu cầu khác
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

          {/* Message Input Container */}
          <div
            className={`flex-shrink-0 border-t ${
              isAIHeaderChat
                ? 'border-amber-200 bg-amber-50/80'
                : 'border-gray-200 bg-white'
            }`}
          >
            <ChatPopupMessageInput
              key={`input-${localReplyToMessage?.id || 'no-reply'}`}
              ref={messageInputRef}
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              onInputFocus={handleInputFocus}
              isAI={isAIHeaderChat}
              attachedFiles={attachedFiles}
              onRemoveFile={index => {
                setAttachedFiles(prev => prev.filter((_, i) => i !== index))
              }}
              activeTab={chat?.type === 'group' ? 'groups' : 'individual'}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onCreatePoll={handleCreatePoll}
              onCreateReminder={handleCreateReminder}
              currentChat={chat}
              replyToMessage={localReplyToMessage}
              onCancelReply={handleCancelReply}
            />
          </div>
        </>
      )}

      <UserRequestsModal
        isOpen={showUserRequestsModal}
        onClose={() => setShowUserRequestsModal(false)}
        userRequests={userRequests}
        onAccept={handleAcceptUserRequestAndCloseModal}
        onReject={handleRejectUserRequestAndCloseModal}
      />
    </div>
  )
}
