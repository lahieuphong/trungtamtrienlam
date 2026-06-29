'use client'
import { useState, useMemo } from 'react'
import { Search, Users, Check, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { sortBySearchScore } from '@/lib/search'

// ── Mock data (replace with real API calls when BE is ready) ──────────────────

const MOCK_USER_CHATS = [
    {
        id: 'uc1',
        type: 'individual',
        name: 'Nguyễn Văn A',
        avatar: null,
        isOnline: true,
        lastMessage: 'Bạn có thể giúp tôi xem lại tài liệu không?',
        lastMessageDate: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        unreadCount: 2,
        hasNotification: true,
    },
    {
        id: 'uc2',
        type: 'individual',
        name: 'Trần Thị B',
        avatar: null,
        isOnline: false,
        lastMessage: 'Cảm ơn bạn rất nhiều!',
        lastMessageDate: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        unreadCount: 0,
        hasNotification: false,
    },
    {
        id: 'uc3',
        type: 'individual',
        name: 'Lê Văn C',
        avatar: null,
        isOnline: false,
        lastMessage: 'Tôi đã xem xét tài liệu rồi.',
        lastMessageDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        unreadCount: 0,
        hasNotification: false,
    },
]

const MOCK_GROUP_CHATS = [
    {
        id: 'gc1',
        type: 'group',
        name: 'Nhóm Dự án Di tích 2026',
        avatar: null,
        lastMessage: 'Họp lúc 14h chiều nay nhé mọi người',
        lastSenderName: 'Nguyễn A',
        lastMessageDate: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        totalMembers: 8,
        unreadCount: 5,
        hasNotification: true,
    },
    {
        id: 'gc2',
        type: 'group',
        name: 'Ban Quản lý',
        avatar: null,
        lastMessage: 'Đã xem xong báo cáo',
        lastSenderName: 'Trần B',
        lastMessageDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        totalMembers: 5,
        unreadCount: 0,
        hasNotification: false,
    },
]

const MOCK_NEW_USERS = [
    { id: 'nu1', fullName: 'Phạm Thị D', avatar: null, roleName: 'Nhân viên', isOnline: true },
    { id: 'nu2', fullName: 'Hoàng Văn E', avatar: null, roleName: 'Chuyên viên', isOnline: false },
]

// ── Avatar helper ─────────────────────────────────────────────────────────────

function UserAvatar({ name, avatar, size = 40, isOnline }) {
    const initial = (name || 'U')[0].toUpperCase()
    return (
        <div className='relative flex-shrink-0' style={{ width: size, height: size }}>
            {avatar ? (
                <img
                    src={avatar}
                    alt={name}
                    style={{ width: size, height: size }}
                    className='rounded-full object-cover'
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
            ) : (
                <div
                    className='rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold'
                    style={{ width: size, height: size, fontSize: size * 0.4 }}
                >
                    {initial}
                </div>
            )}
            {isOnline && (
                <div className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full' />
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

const ChatListInbox = ({ onClose, onOpen }) => {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('individual')
    const [searchQuery, setSearchQuery] = useState('')
    const [userChatList, setUserChatList] = useState(MOCK_USER_CHATS)
    const [groupChatList, setGroupChatList] = useState(MOCK_GROUP_CHATS)

    const individualUnreadCount = useMemo(
        () => userChatList.reduce((t, c) => t + (c.unreadCount || 0), 0),
        [userChatList]
    )
    const groupUnreadCount = useMemo(
        () => groupChatList.reduce((t, c) => t + (c.unreadCount || 0), 0),
        [groupChatList]
    )

    const existingIds = useMemo(() => new Set(userChatList.map(c => c.id)), [userChatList])

    const filteredUserChats = useMemo(() => {
        if (!searchQuery.trim()) return userChatList
        return sortBySearchScore(userChatList, searchQuery, chat => [
            chat.name,
            chat.lastMessage,
        ].filter(Boolean).join(' '))
    }, [searchQuery, userChatList])

    const filteredGroupChats = useMemo(() => {
        if (!searchQuery.trim()) return groupChatList
        return sortBySearchScore(groupChatList, searchQuery, chat => [
            chat.name,
            chat.lastMessage,
            chat.lastSenderName,
        ].filter(Boolean).join(' '))
    }, [searchQuery, groupChatList])

    const filteredNewUsers = useMemo(() => {
        const newUsers = MOCK_NEW_USERS.filter(u => !existingIds.has(u.id))
        if (!searchQuery.trim()) return newUsers
        return sortBySearchScore(newUsers, searchQuery, user => [
            user.fullName,
            user.roleName,
        ].filter(Boolean).join(' '))
    }, [searchQuery, existingIds])

    const clearUnreadCount = (chatId, chatType) => {
        if (chatType === 'individual') {
            setUserChatList(prev =>
                prev.map(c => c.id === chatId ? { ...c, unreadCount: 0, hasNotification: false } : c)
            )
        } else {
            setGroupChatList(prev =>
                prev.map(c => c.id === chatId ? { ...c, unreadCount: 0, hasNotification: false } : c)
            )
        }
    }

    const handleChatSelect = (chat) => {
        const chatType = chat.type || 'individual'
        clearUnreadCount(chat.id, chatType)
        router.push('/chats')
        if (onClose) onClose()
    }

    const handleMarkAllAsRead = () => {
        setUserChatList(prev => prev.map(c => ({ ...c, unreadCount: 0, hasNotification: false })))
        setGroupChatList(prev => prev.map(c => ({ ...c, unreadCount: 0, hasNotification: false })))
    }

    const handleTurnPage = () => {
        router.push('/chats')
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffHrs = diffMs / (1000 * 60 * 60)
        if (diffHrs < 24) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        }
        return 'Hôm qua'
    }

    return (
        <div className='w-[300px] bg-white shadow-md border rounded overflow-hidden'>
            {/* Header */}
            <div className='p-4 flex flex-col bg-white'>
                <div className='flex justify-between items-center mb-3'>
                    <h2 className='text-lg font-semibold text-gray-900'>Tin nhắn</h2>
                    {activeTab === 'group' && (
                        <button
                            onClick={onOpen}
                            className='text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm font-medium'
                        >
                            <Users size={16} />
                            <span>Tạo nhóm mới</span>
                        </button>
                    )}
                </div>
                <div className='relative'>
                    <Search
                        size={16}
                        className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                    />
                    <input
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
                        className={`flex-1 py-2.5 px-4 text-center text-sm font-medium rounded-t-lg transition-all ${
                            activeTab === 'individual'
                                ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                        <div className='relative flex items-center justify-center'>
                            <span>Cá nhân</span>
                            {individualUnreadCount > 0 && (
                                <div className='absolute -top-4 -right-4 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 bg-red-500'>
                                    <span className='text-xs text-white font-bold leading-none'>
                                        {individualUnreadCount > 5 ? '5+' : individualUnreadCount}
                                    </span>
                                </div>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('group')}
                        className={`flex-1 py-2.5 px-4 text-center text-sm font-medium rounded-t-lg ml-1 transition-all ${
                            activeTab === 'group'
                                ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                        <div className='relative flex items-center justify-center'>
                            <span>Nhóm</span>
                            {groupUnreadCount > 0 && (
                                <div className='absolute -top-4 -right-4 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 bg-red-500'>
                                    <span className='text-xs text-white font-bold leading-none'>
                                        {groupUnreadCount > 5 ? '5+' : groupUnreadCount}
                                    </span>
                                </div>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className='overflow-y-auto' style={{ maxHeight: '300px' }}>
                {activeTab === 'individual' ? (
                    <>
                        {/* AI Chatbot row */}
                        <div
                            className='flex items-center px-4 py-3 cursor-pointer border-b border-gray-100 bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 hover:from-orange-100 hover:via-yellow-100 hover:to-orange-100 transition-all duration-300 relative overflow-hidden'
                            onClick={() => handleChatSelect({ id: 'heritage-assistant', name: 'Trợ lý Di tích', type: 'individual' })}
                        >
                            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50' />
                            <div className='relative mr-3'>
                                <div className='relative'>
                                    <Image
                                        src='/logo.png'
                                        alt='AI Assistant'
                                        width={40}
                                        height={40}
                                        className='rounded-full shadow-md'
                                    />
                                    <div className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse' />
                                </div>
                            </div>
                            <div className='flex-1 min-w-0 relative'>
                                <div className='flex items-start justify-between'>
                                    <div className='flex-1 min-w-0'>
                                        <h3 className='text-sm font-semibold text-gray-900 truncate'>
                                            Trợ lý trung tâm bảo tồn và phát huy giá trị di tích lịch sử - văn hóa TP.HCM
                                        </h3>
                                        <p className='text-xs text-gray-600 truncate mt-0.5'>
                                            Chào mừng bạn đến với trợ lý ảo! Tôi có thể giúp gì cho bạn?
                                        </p>
                                    </div>
                                    <div className='flex flex-col items-end gap-1 ml-3'>
                                        <div className='w-2 h-2 bg-orange-400 rounded-full animate-pulse' />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Existing chats */}
                        {filteredUserChats.length > 0 && (
                            <>
                                <div className='px-4 py-2 bg-gray-50 border-b border-gray-200'>
                                    <h4 className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>
                                        Cuộc trò chuyện
                                    </h4>
                                </div>
                                {filteredUserChats.map(chat => {
                                    const hasNew = chat.unreadCount > 0
                                    return (
                                        <div
                                            key={chat.id}
                                            className={`flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 transition-all duration-300 ${
                                                hasNew ? 'bg-[#F0F5FF] hover:bg-gray-200' : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => handleChatSelect(chat)}
                                        >
                                            <div className='mr-2'>
                                                <UserAvatar name={chat.name} avatar={chat.avatar} size={40} isOnline={chat.isOnline} />
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <div className='flex items-start justify-between'>
                                                    <div className='flex-1 min-w-0'>
                                                        <h3 className='text-sm font-medium text-gray-900 truncate'>{chat.name}</h3>
                                                        <p className='text-xs text-gray-500 truncate mt-1'>
                                                            {chat.lastMessage || 'Chưa có tin nhắn'}
                                                        </p>
                                                    </div>
                                                    <div className='flex flex-col items-end gap-1 ml-3'>
                                                        <span className='text-xs text-gray-400'>{formatTime(chat.lastMessageDate)}</span>
                                                        {chat.unreadCount > 0 && (
                                                            <div className='min-w-[18px] h-[18px] bg-[#2F54EB] rounded-full flex items-center justify-center px-1'>
                                                                <span className='text-xs text-white font-bold leading-none'>
                                                                    {chat.unreadCount > 5 ? '5+' : chat.unreadCount}
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

                        {/* New chat users */}
                        {filteredNewUsers.length > 0 && (
                            <>
                                <div className='px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2'>
                                    <Users size={14} className='text-blue-700' />
                                </div>
                                {filteredNewUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className='flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 group'
                                        onClick={() => handleChatSelect({ id: user.id, name: user.fullName, type: 'individual' })}
                                    >
                                        <div className='mr-2'>
                                            <UserAvatar name={user.fullName} avatar={user.avatar} size={40} isOnline={user.isOnline} />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-start justify-between'>
                                                <h3 className='text-sm font-medium text-gray-900 truncate'>{user.fullName}</h3>
                                                <div
                                                    className='w-6 h-6 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors duration-200 ml-3'
                                                    title='Bắt đầu trò chuyện mới'
                                                >
                                                    <Users size={12} className='text-blue-600 group-hover:text-blue-700' />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {filteredUserChats.length === 0 && filteredNewUsers.length === 0 && (
                            <div className='p-4 text-center text-sm text-gray-500'>
                                {searchQuery ? 'Không tìm thấy ai' : 'Không có liên hệ nào'}
                            </div>
                        )}
                    </>
                ) : (
                    filteredGroupChats.length > 0 ? (
                        filteredGroupChats.map(group => {
                            const hasNew = group.unreadCount > 0
                            return (
                                <div
                                    key={group.id}
                                    className={`flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 ${
                                        hasNew ? 'bg-[#F0F5FF] text-gray-600 hover:bg-gray-200' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleChatSelect(group)}
                                >
                                    <div className='mr-2 flex-shrink-0'>
                                        {group.avatar ? (
                                            <UserAvatar name={group.name} avatar={group.avatar} size={40} />
                                        ) : (
                                            <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                                                <Users size={14} className='text-blue-600' />
                                            </div>
                                        )}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center justify-between'>
                                            <h3 className={`text-xs font-medium ${hasNew ? 'text-gray-600' : 'text-gray-900'} truncate flex-1`}>
                                                {group.name}
                                            </h3>
                                            {group.unreadCount > 0 && (
                                                <div className='min-w-[18px] h-[18px] bg-[#2F54EB] rounded-full flex items-center justify-center ml-1 px-1'>
                                                    <span className='text-xs text-white font-bold leading-none'>
                                                        {group.unreadCount > 5 ? '5+' : group.unreadCount}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {group.lastMessage ? (
                                            <p className={`text-xs ${hasNew ? 'text-gray-600' : 'text-gray-500'} truncate`}>
                                                <span className={`font-medium ${hasNew ? 'text-gray-600' : ''}`}>
                                                    {group.lastSenderName ? `${group.lastSenderName.split(' ').pop()}: ` : ''}
                                                </span>
                                                {group.lastMessage}
                                            </p>
                                        ) : (
                                            <p className={`text-xs ${hasNew ? 'text-gray-600' : 'text-gray-500'}`}>
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
                )}
            </div>

            {/* Footer */}
            <div className='border-t border-gray-100 bg-gray-50 py-2 px-3'>
                <div className='flex items-center justify-between gap-1'>
                    <button
                        onClick={handleMarkAllAsRead}
                        className='text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors flex items-center flex-shrink-0'
                    >
                        <Check size={12} className='mr-1' />
                        <span className='whitespace-nowrap'>Đánh dấu đã đọc</span>
                    </button>
                    <button
                        onClick={handleTurnPage}
                        className='text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors flex items-center flex-shrink-0'
                    >
                        <span className='whitespace-nowrap'>Xem tất cả</span>
                        <ArrowRight size={12} className='ml-1' />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatListInbox
