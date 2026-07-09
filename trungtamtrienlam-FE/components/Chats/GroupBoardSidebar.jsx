'use client'
import React, { useState, useEffect } from 'react'
import { ArrowLeft, PinIcon } from 'lucide-react'
import {
  getNotesByChatID,
  getPollsByChatID,
  getPinnedMessages
} from '@/lib/api/chatsApi'
import AvatarWithFrame from '@/components//avatars/avatarFrame'
import ExpandableContent from '../ExpandableContent'
import CreateNoteModal from './CreateNoteModal'
import PollContent from './PollContent'
import { Button } from '../Form'
export default function GroupBoardSidebar ({ isOpen, onClose, currentChat }) {
  const [activeTab, setActiveTab] = useState('pinned')
  const [listNote, setListNote] = useState([])
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [polls, setPolls] = useState([])
  const [pinnedMessages, setPinnedMessages] = useState([])
  useEffect(() => {
    const fetchData = async () => {
      if (!currentChat?.id) return

      setIsLoading(true)
      try {
        if (activeTab === 'notes') {
          const response = await getNotesByChatID(currentChat.id)
          setListNote(response.data.data || [])
        }
        if (activeTab === 'pinned') {
          const response = await getPinnedMessages(currentChat.id)
          let pinnedData = []
          if (response.data?.data?.dataChatMessage && Array.isArray(response.data.data.dataChatMessage)) {
            pinnedData = response.data.data.dataChatMessage
          } else if (response.data?.dataChatMessage && Array.isArray(response.data.dataChatMessage)) {
            pinnedData = response.data.dataChatMessage
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            pinnedData = response.data.data
          } else if (Array.isArray(response.data)) {
            pinnedData = response.data
          }
          const filteredPinned = pinnedData.filter(msg => msg.isPin === true)
          setPinnedMessages(filteredPinned)
        }
        if (activeTab === 'polls') {
          const response = await getPollsByChatID(currentChat.id)
          setPolls(response.data.data || [])
        }
      } catch (error) {
        console.error(`Error fetching data for ${activeTab}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentChat, activeTab])


  const handleCreateNote = () => {
    setShowCreateNoteModal(true)
  }

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 w-80 border-l border-gray-200 bg-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col z-50`}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex items-center gap-3'>
            <h3 className='text-lg font-semibold'>Bảng tin nhóm</h3>
          </div>
        </div>

        {/* Nút quay lại thứ hai để đảm bảo */}
        <div className='border-b border-gray-100 pt-1 pb-2 px-4'>
          <Button
            onClick={onClose}
            className='flex items-center text-blue-600 hover:text-blue-700'
            variant='outline'
          >
            <ArrowLeft size={16} className='mr-1' />
            <span>Quay lại</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className='flex border-b'>
          <button
            onClick={() => setActiveTab('pinned')}
            className={`flex-1 text-sm font-medium py-3 ${
              activeTab === 'pinned'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Tin ghim
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 text-sm font-medium py-3 ${
              activeTab === 'notes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Ghi chú
          </button>
          <button
            onClick={() => setActiveTab('polls')}
            className={`flex-1 text-sm font-medium py-3 ${
              activeTab === 'polls'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Bình chọn
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {/* Hiển thị loading */}
          {isLoading && (
            <div className='flex justify-center py-4'>
              <div className='w-6 h-6 border-2 border-t-blue-500 border-gray-200 rounded-full animate-spin'></div>
            </div>
          )}

          {/* Nội dung tin ghim */}
          {activeTab === 'pinned' && !isLoading && (
            <div>
              {pinnedMessages && pinnedMessages.length > 0 ? (
                <div className='space-y-4'>
                  {pinnedMessages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className='bg-white border border-gray-200 rounded-lg p-3'
                    >
                      <div className='flex items-start gap-3'>
                        <AvatarWithFrame
                          avatarPath={message.senderAvatar}
                          altAvatar={message.senderName || 'Avatar'}
                          size={35}
                        />
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='font-medium text-gray-900'>
                              {message.senderName || 'Người dùng'}
                            </span>
                            <div className='flex items-center text-xs text-blue-600 bg-blue-50 py-0.5 px-1.5 rounded'>
                              <PinIcon size={12} className='mr-1' />
                              Tin ghim
                            </div>
                          </div>

                          {/* Nội dung tin nhắn */}
                          <div className='text-gray-700 text-sm mb-2'>
                            {message.content || 'Nội dung tin nhắn'}
                          </div>

                          {/* Thời gian và nút xem */}
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-gray-500'>
                              {message.createdDate
                                ? `${new Date(message.createdDate).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })} lúc ${new Date(message.createdDate).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}`
                                : 'Vừa xong'}
                            </span>     
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  Không có tin ghim nào
                </div>
              )}
            </div>
          )}

          {/* Nội dung ghi chú */}
          {activeTab === 'notes' && !isLoading && (
            <div>
              {listNote && listNote.length > 0 ? (
                <div className='space-y-4'>
                  {listNote.map((note, index) => (
                    <div
                      key={note.id || index}
                      className='bg-gray-50 rounded-md mb-3'
                    >
                      <div className='flex items-start gap-3 p-3'>
                        <AvatarWithFrame
                          avatarPath={note.avatar}
                          altAvatar={note.createdName || 'Avatar'}
                          size={35}
                        />
                        <div className='flex-1'>
                          <div className='flex items-center'>
                            <span className='font-medium'>
                              {note.createdName || 'Người dùng'}
                            </span>
                            <span className='ml-2 text-xs text-rose-500 bg-rose-50 py-0.5 px-1.5 rounded'>
                              Ghi chú
                            </span>
                          </div>

                          <ExpandableContent content={note.note} label='' />

                          <div className='flex items-center text-xs text-gray-500 mt-1'>
                            <span>
                              {note.createdDate
                                ? `Hôm nay lúc ${new Date(
                                    note.createdDate
                                  ).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}`
                                : 'Vừa xong'}
                            </span>
                            {/* <button className='ml-2 text-blue-500 hover:underline'>
                              Xem ghi chú
                            </button> */}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  Không có ghi chú nào
                </div>
              )}

              {/* Nút tạo ghi chú mới */}
              <div className='mt-3 pt-2'>
                <Button
                  variant='outline'
                  className='flex items-center justify-center gap-1 w-full p-2 text-gray-600 hover:bg-gray-50 rounded-md border border-gray-200'
                  onClick={handleCreateNote}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <circle cx='12' cy='12' r='10'></circle>
                    <line x1='12' y1='8' x2='12' y2='16'></line>
                    <line x1='8' y1='12' x2='16' y2='12'></line>
                  </svg>
                  <span className='text-sm'>Tạo ghi chú</span>
                </Button>
              </div>
            </div>
          )}

          {/* Nội dung bình chọn */}
          {activeTab === 'polls' && !isLoading && (
            <div>
              {polls && polls.length > 0 ? (
                <div>
                  {polls.map((poll, index) => (
                    <PollContent
                      poll={poll}
                      key={`poll-${index}-${poll.id || poll.ID || Date.now()}`}
                    />
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  Không có bình chọn nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close when clicking outside */}
      {isOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-30 z-40'
          onClick={onClose}
        />
      )}
      {showCreateNoteModal && (
        <CreateNoteModal
          isOpen={showCreateNoteModal}
          onClose={() => setShowCreateNoteModal(false)}
        />
      )}
    </>
  )
}
