import React, { useMemo, useCallback } from 'react'
import { Search, Edit3 } from 'lucide-react'
import ChatItem from './ChatItem'
import Image from 'next/image'
import ToggleButtonGroup from '../ToggleButtonGroup'
import { getChatPinDate, isChatPinned } from '@/helpers/chatPinHelpers'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import {
  getChatUnreadCount as getUnreadCount,
  sumUniqueChatUnreadCount
} from '@/helpers/chatUnreadHelpers'

import { Button, Input } from '../Form'

export default function ChatSidebar ({
  searchTerm,
  setSearchTerm,
  activeTab,
  handleTabChange,
  chatList,
  selectedChat,
  setSelectedChat,
  onOpenAddGroup,
  userChatList = [],
  groupChatList = [],
  listUsers = [],
  isLoading = false,
  hasLoaded = true,
  onMarkChatAsRead
}) {
  const { userInfo } = useLoadLocalStorage()
  const isHadAI = chatList?.some(chat => chat.isAI)

  const individualUnreadCount = useMemo(
    () =>
      sumUniqueChatUnreadCount(userChatList, {
        userInfo,
        excludeCurrentUser: true
      }),
    [userChatList, userInfo]
  )

  const groupUnreadCount = useMemo(
    () => sumUniqueChatUnreadCount(groupChatList),
    [groupChatList]
  )

  const renderTabUnreadBadge = count => {
    if (count <= 0) return null

    return (
      <span className='ml-1.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white'>
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  const sortedChatList = useMemo(() => {
    if (!chatList || !Array.isArray(chatList)) return []

    return [...chatList].sort((a, b) => {
      const aPinned = isChatPinned(a)
      const bPinned = isChatPinned(b)

      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1

      if (aPinned && bPinned) {
        const pinDateA = new Date(getChatPinDate(a) || a.lastMessageDate || 0)
        const pinDateB = new Date(getChatPinDate(b) || b.lastMessageDate || 0)
        return pinDateB - pinDateA
      }

      const dateA = new Date(a.lastMessageDate || a.lastMessageTime || 0)
      const dateB = new Date(b.lastMessageDate || b.lastMessageTime || 0)
      return dateB - dateA
    })
  }, [chatList])

  const handleMarkAllAsRead = useCallback(() => {
    const chatsToMark = [...userChatList, ...groupChatList]
    if (chatsToMark.length === 0) return

    chatsToMark.forEach(chat => {
      if (chat.id && getUnreadCount(chat) > 0) {
        onMarkChatAsRead?.(chat)
        localStorage.removeItem(`unreadCount_${chat.id}`)
        window.dispatchEvent(
          new CustomEvent('unreadCountChanged', {
            detail: { chatId: chat.id, count: 0 }
          })
        )
      }
    })
  }, [userChatList, groupChatList, onMarkChatAsRead])

  const shouldShowLoadingList = isLoading && sortedChatList.length === 0
  const showEmptyState = hasLoaded && !shouldShowLoadingList && sortedChatList.length === 0 && !(activeTab === 'individual' && !isHadAI)
  const loadingRows = activeTab === 'groups' ? 5 : 6
  return (
    <div className='w-80 border-r border-gray-200 flex flex-col'>
      {/* Header */}
      <div className='p-4 border-b border-gray-200'>
        <h1 className='text-lg font-semibold mb-4'>Tin nhắn</h1>

        {/* Search */}
        <div className='flex gap-2 mb-4'>
          <div className='relative flex-1'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
            />
            <Input
              type='text'
              placeholder={'Tìm kiếm nhóm'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <Button
            onClick={onOpenAddGroup}
            variant='ghost'
            className='bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors'
          >
            <Image
              src='/IconAddGroup.svg'
              alt='Add Group'
              width={20}
              height={20}
            />
          </Button>
        </div>

        {/* Tabs */}
        <div className='w-full relative'>
          <ToggleButtonGroup
            options={[
              {
                value: 'individual',
                label: (
                  <div className='inline-flex min-w-0 items-center justify-center'>
                    <span>Cá nhân</span>
                    {renderTabUnreadBadge(individualUnreadCount)}
                  </div>
                )
              },
              {
                value: 'groups',
                label: (
                  <div className='inline-flex min-w-0 items-center justify-center'>
                    <span>Nhóm</span>
                    {renderTabUnreadBadge(groupUnreadCount)}
                  </div>
                )
              }
            ]}
            value={activeTab}
            onChange={handleTabChange}
            className='w-full'
            size='md'
            groupStyle={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '2px',
              overflow: 'visible',
              position: 'relative'
            }}
            buttonStyle={{
              minWidth: '50%',
              borderRadius: '6px',
              fontWeight: '500',
              position: 'relative',
              overflow: 'visible'
            }}
            activeButtonStyle={{
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '600',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className='flex-1 overflow-y-auto'>
        {shouldShowLoadingList ? (
          <div className='divide-y divide-gray-100'>
            {Array.from({ length: loadingRows }).map((_, index) => (
              <div key={`chat-loading-${activeTab}-${index}`} className='flex items-center gap-3 p-4 animate-pulse'>
                <div className='h-10 w-10 rounded-full bg-gray-200' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <div className='h-3.5 w-2/3 rounded bg-gray-200' />
                  <div className='h-3 w-5/6 rounded bg-gray-100' />
                </div>
                <div className='h-3 w-9 rounded bg-gray-100' />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'individual' && !isHadAI && (
              <div
                className={`p-4 mb-2 border-y cursor-pointer transition-colors ${
                  selectedChat === 'heritage-assistant'
                    ? 'border-l-4 border-l-amber-500 border-y-amber-300 bg-amber-200 shadow-sm'
                    : 'border-y-amber-100 bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100'
                }`}
                onClick={() => setSelectedChat('heritage-assistant')}
              >
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 border border-gray-300'>
                    <Image
                      src='/TTBT_icon_anim_idle.gif'
                      alt='Chatbot Icon'
                      width={30}
                      height={30}
                      className='rounded-full'
                      unoptimized={true}
                    />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-semibold text-gray-950 truncate'>
                        Trợ lý Trung tâm Bảo tồn và Phát huy Giá trị Di tích Lịch sử
                        – Văn hoá Thành phố Hồ Chí Minh
                      </h3>
                      <span className='text-xs text-gray-500 ml-2 flex-shrink-0'>
                        09:36
                      </span>
                    </div>
                    <p className='text-xs text-gray-600 truncate mt-0.5'>
                      Chào mừng bạn đến với trợ lý ảo của Trung tâm Bảo tồn và Phát
                      huy Giá trị Di tích Lịch sử – Văn hoá Thành phố Hồ Chí Minh!
                      Tôi có thể giúp gì cho bạn hôm nay?
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className='space-y-0'>
              {sortedChatList.map((chat, index) => (
                <div
                  key={`${activeTab}-chat-${chat.id}-${index}`}
                  className='transform transition-all duration-500 ease-in-out'
                  style={{
                    transitionDelay: `${index * 50}ms`
                  }}
                >
                  <ChatItem
                    key={`chatitem-${chat.id}`}
                    chat={chat}
                    isSelected={selectedChat === chat.id}
                    onClick={() => {
                      onMarkChatAsRead?.(chat)
                      setSelectedChat(chat.id)
                    }}
                    ListUsers={listUsers}
                    hasNewMessages={getUnreadCount(chat) > 0}
                  />
                </div>
              ))}
            </div>

            {showEmptyState && (
              <div className='px-4 py-8 text-center text-sm text-gray-500'>
                Chưa có cuộc trò chuyện nào
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Action */}
      <div className='h-16 flex-shrink-0 border-t border-gray-200 bg-white px-6 py-0 flex items-center'>
        <div
          className={`flex items-center gap-2 cursor-pointer transition-colors ${
            individualUnreadCount + groupUnreadCount > 0
              ? 'text-blue-600 hover:text-blue-700'
              : 'text-gray-400 cursor-not-allowed'
          }`}
          onClick={
            individualUnreadCount + groupUnreadCount > 0
              ? handleMarkAllAsRead
              : undefined
          }
        >
          <Edit3 size={16} />
          <span className='text-sm font-medium'>Đánh dấu tất cả đã đọc</span>
        </div>
      </div>
    </div>
  )
}
