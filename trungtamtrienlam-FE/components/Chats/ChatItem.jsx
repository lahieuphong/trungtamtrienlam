'use client'
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { PinIcon } from 'lucide-react'
import AvatarWithFrame from '../avatars/avatarFrame'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'

// Helper functions for localStorage
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

  window.dispatchEvent(
    new CustomEvent('unreadCountChanged', {
      detail: { chatId, count }
    })
  )
}

export default function ChatItem ({
  chat,
  isSelected,
  onClick,
  ListUsers,
  hasNewMessages
}) {
  const { userInfo } = useLoadLocalStorage()
  const [localUnreadCount, setLocalUnreadCount] = useState(0)
  const prevChatDataRef = useRef()
  const senderName = chat.lastMessageSender
  const unreadCount = localUnreadCount || 0
  const isUnread = unreadCount > 0 || hasNewMessages

  useEffect(() => {
    const storedCount = getStoredUnreadCount(chat.id)
    const serverCount = Number(chat.unreadCount || 0)
    const finalCount = Number.isFinite(serverCount) ? serverCount : 0

    const prevData = prevChatDataRef.current
    if (
      !prevData ||
      prevData.chatId !== chat.id ||
      prevData.unreadCount !== chat.unreadCount
    ) {
      setLocalUnreadCount(finalCount)

      if (storedCount !== finalCount) {
        setStoredUnreadCount(chat.id, finalCount)
      }

      prevChatDataRef.current = {
        chatId: chat.id,
        unreadCount: chat.unreadCount
      }
    }
  }, [chat.id, chat.unreadCount])

  useEffect(() => {
    const handleUnreadCountChange = event => {
      if (event.detail && event.detail.chatId === chat.id) {
        setLocalUnreadCount(event.detail.count)
      }
    }

    window.addEventListener('unreadCountChanged', handleUnreadCountChange)

    return () => {
      window.removeEventListener('unreadCountChanged', handleUnreadCountChange)
    }
  }, [chat.id])

  const clearUnreadCount = () => {
    setLocalUnreadCount(0)
    setStoredUnreadCount(chat.id, 0)
    window.dispatchEvent(
      new CustomEvent('unreadCountChanged', {
        detail: { chatId: chat.id, count: 0 }
      })
    )
  }
  const truncateName = (name, maxLength = 30) => {
    if (!name) return ''
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
  }

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
      : Array.isArray(chat?.members)
      ? chat.members
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

  const getUserDisplayName = userId => {
    const currentUserIds = [
      userInfo?.userID,
      userInfo?.UserID,
      userInfo?.id,
      userInfo?.ID
    ].map(normalizeUserId)

    if (currentUserIds.includes(normalizeUserId(userId))) return 'Bạn'

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

  let displayContent = chat.lastMessage
  if (chat?.lastMessage) {
    displayContent = chat.lastMessage.replace(/{([^}]+)}/g, (_, userId) =>
      getUserDisplayName(userId)
    )
  }

  const handleClick = () => {
    clearUnreadCount()
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-300 ease-in-out transform hover:translate-x-1 ${
        isSelected
          ? 'bg-blue-50 border-l-4 border-l-blue-500'
          : isUnread
          ? 'bg-[#F0F5FF] border-l-4 border-l-blue-500 hover:bg-[#E8F0FF]'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className='flex items-center gap-3'>
        <div className='relative'>
          <div className='w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden'>
            {/* <RenderFileToken
              pathFile={chat.avatar}
              isPrivate={false}
              Component={({ src }) => {
                return (
                  <ImageAdvanced
                    src={src}
                    alt={chat?.name}
                    type='avatar'
                    width={300}
                    height={300}
                    className='w-full h-full object-cover'
                    onError={() => setImgSrc('/placeholder.svg')}
                  />
                )
              }}
            /> */}
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
          </div>
          {chat.type === 'individual' && (
            <div
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white z-10 ${
                chat.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></div>
          )}

          {/* {chat.type === 2 && (
            <div className='absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-10'>
              <span className='text-xs text-white font-bold'>
                {chat.countUser}
              </span>
            </div>
          )} */}
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <h3
                className={`truncate ${
                  isUnread ? 'font-semibold text-gray-950' : 'font-medium text-gray-900'
                }`}
                title={chat.name || chat.lastMessageSender}
              >
                {truncateName(chat.name || chat.lastMessageSender)}
              </h3>
              {/* Pin icon - hiển thị khi có pinDate */}
              {chat.pinDate && <PinIcon className='w-4 h-4 text-gray-500' />}
              {chat.type === 1 && chat.hasNotification && (
                <div className='w-4 h-4 text-gray-400'>
                  <svg viewBox='0 0 16 16' fill='currentColor'>
                    <path d='M8 2a6 6 0 616 6c0 2 1 3 1 3H1s1-1 1-3a6 6 0 616-6z' />
                    <path d='M6.3 13a1.7 1.7 0 003.4 0' />
                  </svg>
                </div>
              )}
              {/* {chat.isNew && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
              )} */}
            </div>
            <span
              className={`text-xs ${
                isUnread
                  ? 'font-semibold text-blue-600'
                  : chat.type === 'individual'
                  ? 'text-blue-500'
                  : 'text-gray-500'
              }`}
            >
              {chat.lastMessageDate
                ? new Date(chat.lastMessageDate).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })
                : chat.lastMessageTime || ''}
            </span>
          </div>
          <p
            className={`text-sm ${
              isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'
            } truncate mt-1`}
          >
            {/* Hiển thị tên người gửi cho chat nhóm */}
            {chat.type === 2 && chat.lastMessage && chat.eventType === 0 ? (
              <>
                <span
                  className={`font-medium ${
                    isUnread ? 'text-gray-900' : ''
                  }`}
                  title={senderName}
                >
                  {truncateName(senderName, 12)}:{' '}
                </span>
                <span>{displayContent}</span>
              </>
            ) : (
              /* Hiển thị tin nhắn cá nhân - không cần tên người gửi vì đã hiển thị ở tên chat */
              <span>{displayContent}</span>
            )}
          </p>
        </div>

        {unreadCount > 0 && (
          <div
            className='min-w-[20px] h-5 bg-[#2F54EB] rounded-full flex items-center justify-center ml-2 px-1.5 shadow-sm'
          >
            <span className='text-xs text-white font-bold leading-none'>
              {unreadCount > 5 ? '5+' : unreadCount}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
