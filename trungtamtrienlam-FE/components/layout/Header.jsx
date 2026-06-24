'use client'

import { useState, useEffect } from 'react'
import { Bell, Menu, MessageCircleMore } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import ChatListInbox from '@/components/Chats/ChatListInbox'

// ── Mock data (replace with real API calls when BE ready) ─────────────────────

const MOCK_NOTIFICATIONS = [
    {
        id: 'n1',
        type: 3,
        title: 'Nhắc nhở lịch họp',
        content: 'Bạn có lịch họp <b>Họp tổng kết tháng 6</b> vào lúc 14:00 hôm nay.',
        time: new Date().toISOString(),
        isRead: false,
    },
    {
        id: 'n2',
        type: 5,
        title: 'Chia sẻ thư mục mới',
        content: 'Nguyễn Văn A đã chia sẻ thư mục <b>Tài liệu dự án 2026</b> với bạn.',
        time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        isRead: false,
    },
    {
        id: 'n3',
        type: 3,
        title: 'Lịch công tác tuần tới',
        content: 'Lịch công tác tuần 26 đã được cập nhật. Vui lòng kiểm tra và xác nhận.',
        time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        isRead: true,
    },
    {
        id: 'n4',
        type: 4,
        title: 'Công văn mới cần xử lý',
        content: 'Có 3 công văn mới đang chờ bạn xử lý trong hệ thống quản lý nhiệm vụ.',
        time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        isRead: true,
    },
]

// ── Main Header ───────────────────────────────────────────────────────────────

export default function Header() {
    const { setMobileOpen, isMobile } = useSidebar()
    const [isOpenNoti, setIsOpenNoti] = useState(false)
    const [isOpenMess, setIsOpenMess] = useState(false)
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
    const [notificationsCount, setNotificationsCount] = useState(
        MOCK_NOTIFICATIONS.filter(n => !n.isRead).length
    )
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(2)

    // Recalculate count whenever notifications change
    useEffect(() => {
        setNotificationsCount(notifications.filter(n => !n.isRead).length)
    }, [notifications])

    const handleReadNotification = (notificationId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        )
    }

    const handleReadAllNotifications = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }

    const handleOpenMessages = () => setIsOpenMess(true)
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
                    <div className='relative'>
                        {/* Messages button */}
                        <div className='relative inline-block'>
                            {unreadMessagesCount > 0 && (
                                <div className='flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full absolute -top-1 -right-1 z-10'>
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

                        {/* Notifications button */}
                        <div className='relative inline-block'>
                            <button
                                className='relative text-gray-500 !rounded-full p-2 hover:bg-gray-100 transition-colors flex items-center justify-center'
                                onClick={() => setIsOpenNoti(true)}
                            >
                                <Bell className='w-5 h-5' />
                                {notificationsCount > 0 && (
                                    <span className='absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full shadow-md animate-pulse brightness-150 [animation-duration:0.8s]'>
                                        {notificationsCount > 99 ? '99+' : notificationsCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Notification dropdown */}
                        {isOpenNoti && (
                            <NotificationDropdown
                                notifications={notifications}
                                onRead={handleReadNotification}
                                onReadAll={handleReadAllNotifications}
                                onClose={() => setIsOpenNoti(false)}
                            />
                        )}

                        {/* Chat panel */}
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
