'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Menu, MessageCircleMore } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { useNotification } from '@/contexts/NotificationPushContext'
import { useSignalR } from '@/contexts/SignalRContext'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import ChatListInbox from '@/components/Chats/ChatListInbox'
import { getGroupChats } from '@/lib/api/chatsApi'
import { getNotifications, markAllNotificationsRead, readNotification } from '@/lib/api/notificationApi'
import { ChatConstants } from '@/constants/chatConstants'
import { sumUniqueChatUnreadCount } from '@/helpers/chatUnreadHelpers'

const CHAT_NOTIFICATION_TYPE = 10

const normalizeId = value => String(value ?? '').trim()

const getCurrentUserId = userInfo =>
    normalizeId(userInfo?.userID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID)


const extractListPayload = response => {
    if (Array.isArray(response)) return response
    if (Array.isArray(response?.results)) return response.results
    if (Array.isArray(response?.data?.data)) return response.data.data
    if (Array.isArray(response?.data)) return response.data
    if (Array.isArray(response?.data?.data?.data)) return response.data.data.data
    return []
}

const getStoredUnreadTotal = () => {
    if (typeof window === 'undefined') return null

    let total = 0
    let found = false
    for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index)
        if (!key || !key.startsWith('unreadCount_')) continue

        const count = Number(window.localStorage.getItem(key) || 0)
        if (Number.isFinite(count) && count > 0) {
            total += count
            found = true
        }
    }

    return found ? total : null
}

const getStoredUnreadCountByChatId = chatId => {
    if (typeof window === 'undefined' || !chatId) return 0

    const count = Number(window.localStorage.getItem(`unreadCount_${chatId}`) || 0)
    return Number.isFinite(count) && count > 0 ? count : 0
}

const setStoredUnreadCountByChatId = (chatId, count) => {
    if (typeof window === 'undefined' || !chatId) return

    if (count > 0) {
        window.localStorage.setItem(`unreadCount_${chatId}`, String(count))
    } else {
        window.localStorage.removeItem(`unreadCount_${chatId}`)
    }

    window.dispatchEvent(
        new CustomEvent('unreadCountChanged', {
            detail: { chatId, count }
        })
    )
}

const isNotificationRead = notification => Boolean(notification?.isRead ?? notification?.is_read)

const isChatNotification = notification => {
    const type = Number(notification?.type ?? notification?.notificationType ?? notification?.notification_type)
    const referenceType = String(notification?.referenceType ?? notification?.reference_type ?? '').toLowerCase()

    return type === CHAT_NOTIFICATION_TYPE || referenceType === 'chat'
}

export default function Header() {
    const { setMobileOpen, isMobile } = useSidebar()
    const pathname = usePathname()
    const { userInfo } = useLoadLocalStorage()
    const { notificationData, setNotificationData, addNotification } = useNotification()
    const { registerChatCallback, registerNotifyCallback } = useSignalR()
    const [isOpenNoti, setIsOpenNoti] = useState(false)
    const [isOpenMess, setIsOpenMess] = useState(false)
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
    const currentUserId = getCurrentUserId(userInfo)

    const notifications = useMemo(
        () => (Array.isArray(notificationData) ? notificationData : []),
        [notificationData]
    )
    const generalNotifications = useMemo(
        () => notifications.filter(notification => !isChatNotification(notification)),
        [notifications]
    )
    const notificationsCount = useMemo(
        () => generalNotifications.filter(notification => !isNotificationRead(notification)).length,
        [generalNotifications]
    )

    const loadUnreadMessagesCount = useCallback(async () => {
        if (!currentUserId) {
            setUnreadMessagesCount(0)
            return
        }

        try {
            const [privateChatsRes, groupChatsRes] = await Promise.all([
                getGroupChats(ChatConstants.Type.PRIVATE, currentUserId),
                getGroupChats(ChatConstants.Type.GROUP, currentUserId),
            ])
            const privateChats = extractListPayload(privateChatsRes)
            const groupChats = extractListPayload(groupChatsRes)
            const serverUnreadCount =
                sumUniqueChatUnreadCount(privateChats, {
                    userInfo,
                    excludeCurrentUser: true,
                }) + sumUniqueChatUnreadCount(groupChats)
            const storedUnreadCount = getStoredUnreadTotal()

            setUnreadMessagesCount(Math.max(serverUnreadCount, storedUnreadCount ?? 0))
        } catch (error) {
            console.warn('Error loading chat unread count:', error)
        }
    }, [currentUserId, userInfo])

    const loadNotifications = useCallback(async () => {
        try {
            const response = await getNotifications()
            setNotificationData(extractListPayload(response))
        } catch (error) {
            console.warn('Error loading notifications:', error)
        }
    }, [setNotificationData])

    useEffect(() => {
        loadUnreadMessagesCount()
    }, [loadUnreadMessagesCount])

    useEffect(() => {
        if (!currentUserId) {
            setNotificationData([])
            return
        }

        loadNotifications()
    }, [currentUserId, loadNotifications, setNotificationData])

    useEffect(() => {
        if (typeof window === 'undefined') return undefined

        const refreshFromLocalThenServer = () => {
            const storedTotal = getStoredUnreadTotal()
            if (storedTotal !== null) setUnreadMessagesCount(storedTotal)
            window.setTimeout(loadUnreadMessagesCount, 600)
        }

        window.addEventListener('unreadCountChanged', refreshFromLocalThenServer)
        window.addEventListener('chatListShouldRefresh', refreshFromLocalThenServer)

        return () => {
            window.removeEventListener('unreadCountChanged', refreshFromLocalThenServer)
            window.removeEventListener('chatListShouldRefresh', refreshFromLocalThenServer)
        }
    }, [loadUnreadMessagesCount])

    useEffect(() => {
        if (!registerChatCallback || !currentUserId) return undefined

        return registerChatCallback(message => {
            const firstMessage = Array.isArray(message) ? message[0] : message
            if (!firstMessage || firstMessage?.isSeenUpdate || firstMessage?.IsSeenUpdate) return

            const senderId = normalizeId(
                firstMessage.senderID ?? firstMessage.SenderID ?? firstMessage.senderId ?? firstMessage.SenderId
            )
            if (senderId && senderId === currentUserId) return

            const chatId = normalizeId(
                firstMessage.chatID ?? firstMessage.ChatID ?? firstMessage.chatId ?? firstMessage.ChatId
            )
            const isChatsPage = pathname?.startsWith('/chats')

            if (chatId && !isChatsPage) {
                const nextCount = getStoredUnreadCountByChatId(chatId) + 1
                setStoredUnreadCountByChatId(chatId, nextCount)
                setUnreadMessagesCount(getStoredUnreadTotal() ?? nextCount)
            }

            window.setTimeout(loadUnreadMessagesCount, 150)
        })
    }, [currentUserId, loadUnreadMessagesCount, pathname, registerChatCallback])

    useEffect(() => {
        if (!registerNotifyCallback) return undefined

        return registerNotifyCallback(payload => {
            const incomingNotifications = Array.isArray(payload) ? payload : [payload]
            const validNotifications = incomingNotifications.filter(Boolean)
            if (!validNotifications.length) return

            validNotifications.forEach(notification => addNotification(notification, 'noti'))

            if (validNotifications.some(isChatNotification)) {
                window.setTimeout(loadUnreadMessagesCount, 150)
            }
        })
    }, [addNotification, loadUnreadMessagesCount, registerNotifyCallback])

    const handleReadNotification = useCallback((notificationId) => {
        if (!notificationId) return

        setNotificationData(prev =>
            prev.map(notification =>
                String(notification.id) === String(notificationId)
                    ? { ...notification, isRead: true, is_read: true }
                    : notification
            )
        )

        readNotification(notificationId).catch(error => {
            console.warn('Error marking notification as read:', error)
            loadNotifications()
        })
    }, [loadNotifications, setNotificationData])

    const handleReadAllNotifications = useCallback(() => {
        if (!generalNotifications.some(notification => !isNotificationRead(notification))) return

        const generalIds = new Set(generalNotifications.map(notification => String(notification.id)))
        setNotificationData(prev =>
            prev.map(notification =>
                generalIds.has(String(notification.id))
                    ? { ...notification, isRead: true, is_read: true }
                    : notification
            )
        )

        markAllNotificationsRead().catch(error => {
            console.warn('Error marking all notifications as read:', error)
            loadNotifications()
        })
    }, [generalNotifications, loadNotifications, setNotificationData])

    const handleOpenMessages = () => {
        setIsOpenMess(true)
        loadUnreadMessagesCount()
    }
    const handleCloseMessages = () => setIsOpenMess(false)

    return (
        <>
            <header className='bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center h-16 fixed top-0 right-0 w-full z-[48]'>
                <div className='flex items-center'>
                    {isMobile && (
                        <button
                            onClick={() => setMobileOpen(true)}
                            className='mr-3 text-gray-500'
                        >
                            <Menu className='w-5 h-5' />
                        </button>
                    )}
                </div>

                <div className='flex items-center'>
                    <div className='relative flex items-center gap-3'>
                        <div className='relative inline-block'>
                            {unreadMessagesCount > 0 && (
                                <div className='flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white text-xs rounded-full absolute -top-1 -right-1 z-10'>
                                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                </div>
                            )}
                            <button
                                className='text-gray-500 !rounded-full p-2 hover:bg-gray-100 transition-colors'
                                onClick={handleOpenMessages}
                            >
                                <MessageCircleMore className='w-5 h-5' />
                            </button>
                        </div>

                        <div className='relative inline-block'>
                            <button
                                className='relative text-gray-500 !rounded-full p-2 hover:bg-gray-100 transition-colors flex items-center justify-center'
                                onClick={() => setIsOpenNoti(true)}
                            >
                                <Bell className='w-5 h-5' />
                                {notificationsCount > 0 && (
                                    <span className='absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-semibold rounded-full shadow-md animate-pulse brightness-150 [animation-duration:0.8s]'>
                                        {notificationsCount > 99 ? '99+' : notificationsCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {isOpenNoti && (
                            <NotificationDropdown
                                notifications={generalNotifications}
                                onRead={handleReadNotification}
                                onReadAll={handleReadAllNotifications}
                                onClose={() => setIsOpenNoti(false)}
                            />
                        )}

                        {isOpenMess && (
                            <div className='absolute top-full right-0 mt-2 z-50'>
                                <div
                                    className='fixed inset-0 z-40'
                                    onClick={handleCloseMessages}
                                />
                                <div className='relative z-50'>
                                    <ChatListInbox
                                        onClose={handleCloseMessages}
                                        onOpen={() => {}}
                                        onUnreadCountChange={loadUnreadMessagesCount}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    )
}
