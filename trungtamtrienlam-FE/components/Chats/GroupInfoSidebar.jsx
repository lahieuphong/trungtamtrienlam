'use client'
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react'
import {
  Users,
  ChevronRight,
  Search,
  ArrowRight,
  X,
  PencilIcon,
  PinIcon,
  PinOff,
  LinkIcon,
  Camera,
  Download
} from 'lucide-react'
import GroupBoardSidebar from '@/components/Chats/GroupBoardSidebar'
import FormAddMem from '@/components/Chats/FormAddMem'
import SearchInGroupModal from '@/components/Chats/SearchInGroupModal'
import GroupMembersList from '@/components/Chats/GroupMembersList'
import ChooseNewLeaderModal from '@/components/Chats/ChooseNewLeaderModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ChatUserConstants } from '@/constants/chatConstants'
import { Button } from '../Form'
import AvatarWithFrame from '../avatars/avatarFrame'
import { getListUserByChatID } from '@/lib/api/chatsApi'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { useChatAttachments } from '@/contexts/ChatAttachmentsContext'
import { useSignalR } from '@/contexts/SignalRContext'
import { useToast } from '@/contexts/ToastContext'
import ProgressContext from '@/contexts/ProgressContext'
import { ImageAdvanced } from '@/components/Form'
import RenderFileToken from '@/components/controls/renderFileTokens/RenderFileToken'
import SelectFileItem from '@/components/files/SelectFileItem'
import { aggregateChatAttachments } from '@/helpers/chatAttachmentHelpers'
import UniversalFilePreviewModal from '@/components/files/UniversalFilePreviewModal'
import { isChatPinned } from '@/helpers/chatPinHelpers'

export default function GroupInfoSidebar ({
  showGroupInfo,
  currentChat,
  onLeaveGroup,
  onDisbandGroup,
  onAddMem,
  onChooseSubLeader,
  onRemoveSubLeader,
  onRemoveMember,
  onTransferLeader,
  onChooseNewLeaderAndLeave,
  onPinChat,
  onUpdateChatAvatar,
  onCreateNote,
  messages = []
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showMembersList, setShowMembersList] = useState(false)
  const [showBoardSidebar, setShowBoardSidebar] = useState(false)
  const [activeTab, setActiveTab] = useState(2) // 2: 'photos', 4: 'documents', 3: 'links'
  const [photosList, setPhotosList] = useState([]) // Tab 2: photos
  const [documentsList, setDocumentsList] = useState([]) // Tab 4: documents
  const [linksList, setLinksList] = useState([]) // Tab 3: links
  const [isLoading, setIsLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [showDisbandConfirmation, setShowDisbandConfirmation] = useState(false)
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const [showNewLeaderModal, setShowNewLeaderModal] = useState(false)
  const { userInfo } = useLoadLocalStorage()
  const { reloadTrigger, lastUpdatedChat } = useChatAttachments()
  const { registerChatMessageCallback } = useSignalR()
  const toast = useToast()
  const progressContext = useContext(ProgressContext)
  const [isCurrentUserLeader, setIsCurrentUserLeader] = useState(false)
  const avatarInputRef = useRef(null)
  const handleIsOpenFormAddMem = () => {
    setIsOpen(true)
  }

  const refreshAttachments = useCallback(() => {
    setIsLoading(true)
    const { photos, documents, links } = aggregateChatAttachments(messages)
    setPhotosList(photos)
    setDocumentsList(documents)
    setLinksList(links)
    setIsLoading(false)
  }, [messages])

  useEffect(() => {
    if (currentChat?.id) {
      refreshAttachments()
      return
    }
    setPhotosList([])
    setDocumentsList([])
    setLinksList([])
  }, [currentChat?.id, refreshAttachments])

  useEffect(() => {
    loadUserBychatID()
  }, [currentChat?.id])

  useEffect(() => {
    if (!registerChatMessageCallback || !currentChat?.id) return

    const handleNewMessage = message => {
      if (message.chatID !== currentChat.id) return
      if (message.MessageType === 1) {
        // Kiểm tra nếu có ChatLinks (links)
        if (
          message.ChatLinks &&
          message.ChatLinks !== 'null' &&
          message.ChatLinks !== '[]'
        ) {
          try {
            const links = JSON.parse(message.ChatLinks)
            if (links && links.length > 0) {
              // Có links mới, reload tab links
              setTimeout(refreshAttachments, 500)
            }
          } catch (e) {
            console.error('Error parsing ChatLinks:', e)
          }
        }

        // Kiểm tra nếu có Files (attachments like images, documents)
        if (
          message.Files &&
          message.Files !== 'null' &&
          message.Files !== '[]'
        ) {
          try {
            const files = JSON.parse(message.Files)
            if (files && files.length > 0) {
              // Có files mới, reload tab tương ứng
              setTimeout(() => {
                refreshAttachments()
              }, 500)
            }
          } catch (e) {
            console.error('Error parsing Files:', e)
          }
        }

        // Kiểm tra Content có chứa link không
        if (message.Content && typeof message.Content === 'string') {
          const urlRegex = /(https?:\/\/[^\s]+)/g
          const hasLinks = urlRegex.test(message.Content)
          if (hasLinks) {
            setTimeout(refreshAttachments, 500)
          }
        }
      }
    }

    const unsubscribe = registerChatMessageCallback(handleNewMessage)
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [currentChat?.id, registerChatMessageCallback, refreshAttachments])

  // Lắng nghe từ context để reload khi có trigger
  useEffect(() => {
    if (reloadTrigger > 0 && lastUpdatedChat?.chatId === currentChat?.id) {
      // Reload tất cả các tab
      setTimeout(() => {
        refreshAttachments()
      }, 500)
    }
  }, [reloadTrigger, lastUpdatedChat, currentChat?.id, refreshAttachments])

  // Kiểm tra xem người dùng hiện tại có phải là trưởng nhóm không
  useEffect(() => {
    if (currentChat && userInfo && groupMembers.length > 0) {
      const currentUserID = String(
        userInfo?.userID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID ?? ''
      )
      const currentUserMember = groupMembers.find(
        member =>
          String(
            member?.userID ?? member?.UserID ?? member?.id ?? member?.ID ?? ''
          ) === currentUserID
      )
      setIsCurrentUserLeader(
        Number(currentUserMember?.role ?? currentUserMember?.Role) ===
          ChatUserConstants.Role.Leader
      )
      return
    }

    setIsCurrentUserLeader(false)
  }, [currentChat, userInfo, groupMembers])

  const loadUserBychatID = async () => {
    try {
      const users = await getListUserByChatID(currentChat?.id, userInfo?.userID)
      setGroupMembers(users.data.data)
    } catch (error) {
      console.error('Error loading users by chat ID:', error)
    }
  }

  const getCurrentAttachments = () => {
    if (activeTab === 2) return photosList
    if (activeTab === 3) return linksList
    if (activeTab === 4) return documentsList
    return []
  }

  const currentAttachments = getCurrentAttachments()

  const handleOpenSearch = () => {
    setShowSearchModal(true)
  }

  const handleSearch = searchTerm => {
    // console.log('Searching for:', searchTerm)
    // Implement search functionality
    // This could make an API call to search messages in the current chat
  }

  const handleAddMem = async formData => {
    onAddMem(formData)
  }

  const handleLeaveGroup = async () => {
    if (isCurrentUserLeader) {
      toast.error(
        'Qu\u1ea3n tr\u1ecb vi\u00ean kh\u00f4ng th\u1ec3 r\u1eddi kh\u1ecfi nh\u00f3m. Vui l\u00f2ng nh\u01b0\u1eddng quy\u1ec1n tr\u01b0\u1edfng nh\u00f3m tr\u01b0\u1edbc.'
      )
      return
    }

    setShowLeaveConfirmation(true)
  }

  const confirmLeaveGroup = () => {
    onLeaveGroup(currentChat?.id, userInfo?.userID)
    setShowLeaveConfirmation(false)
  }

  const handleDisbandGroup = async () => {
    setShowDisbandConfirmation(true)
  }

  const confirmDisbandGroup = () => {
    onDisbandGroup(currentChat?.id)
    setShowDisbandConfirmation(false)
  }

  // Xử lý khi chọn trưởng nhóm mới và rời nhóm
  const handleChooseNewLeaderAndLeave = (chatId, newLeaderId) => {
    if (!chatId || !newLeaderId) return

    onChooseNewLeaderAndLeave?.(chatId, newLeaderId)
    setShowNewLeaderModal(false)
  }

  const getAttachmentPath = attachment =>
    attachment?.file ||
    attachment?.File ||
    attachment?.url ||
    attachment?.Url ||
    attachment?.link ||
    attachment?.Link ||
    attachment?.path ||
    attachment?.Path ||
    ''

  const normalizePreviewFile = attachment => {
    const path = getAttachmentPath(attachment)
    if (!path) return null

    return {
      ...attachment,
      file: path,
      File: path,
      path: attachment?.path || attachment?.Path || path,
      Path: attachment?.Path || attachment?.path || path,
      url: attachment?.url || attachment?.Url || path,
      Url: attachment?.Url || attachment?.url || path
    }
  }

  const handlePreviewAttachment = attachment => {
    const file = normalizePreviewFile(attachment)
    if (!file) {
      toast.error('Khong tim thay tep de xem truoc')
      return
    }

    setPreviewFile(file)
  }

  const getOpenableLink = link => {
    const value = String(getAttachmentPath(link) || '').trim()
    if (!value) return ''
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
    return `https://${value}`
  }

  const getAttachmentName = attachment => {
    const path = attachment?.file || attachment?.File || attachment?.path || attachment?.Path || ''
    const fallbackName = path ? decodeURIComponent(String(path).split('/').pop() || '') : ''

    return (
      attachment?.FileName ||
      attachment?.fileName ||
      attachment?.name ||
      attachment?.fullName ||
      attachment?.FullName ||
      fallbackName ||
      'file'
    )
  }

  const getAttachmentExtension = attachment => {
    const fileName = getAttachmentName(attachment)
    const extension =
      attachment?.Extension ||
      attachment?.extension ||
      String(fileName).split('.').pop()

    return String(extension || '').toLowerCase()
  }

  const isVideoAttachment = attachment =>
    ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'mpeg', 'mpg', 'm4v'].includes(
      getAttachmentExtension(attachment)
    )

  const handleDownloadAttachment = attachment => event => {
    event?.stopPropagation?.()

    const path =
      attachment?.file ||
      attachment?.File ||
      attachment?.path ||
      attachment?.Path ||
      attachment?.url ||
      attachment?.Url

    if (!path) {
      toast.error('Không tìm thấy tệp để tải xuống')
      return
    }

    if (progressContext?.addProgress) {
      progressContext.addProgress({
        ...attachment,
        file: path,
        path,
        isPrivate: true,
        name: getAttachmentName(attachment)
      })
      return
    }

    window.open(path, '_blank', 'noopener,noreferrer')
  }

  const handleAvatarChange = async e => {
    const file = e.target.files?.[0]

    if (!file || !currentChat?.id) return

    try {
      await onUpdateChatAvatar?.(currentChat.id, file)
    } catch (error) {
      console.error('Error updating group avatar:', error)
    } finally {
      e.target.value = ''
    }
  }

  // Hàm mở modal danh sách thành viên
  const handleOpenMembersList = () => {
    setShowMembersList(true)
  }

  // Hàm mở modal bảng tin nhóm
  const handleOpenBoardSidebar = () => {
    setShowBoardSidebar(true)
  }

  const handleAddMemberFromList = () => {
    setShowMembersList(false)
    setIsOpen(true)
  }

  // Hàm xử lý khi xóa thành viên
  const handleRemoveMember = async (chatId, memberId) => {
    try {
      await onRemoveMember(chatId, memberId)
      await loadUserBychatID()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  // Hàm xử lý khi đề chọn phó nhóm
  const handlePromoteToViceLeader = async (chatId, memberId) => {
    try {
      await onChooseSubLeader(chatId, memberId)
      await loadUserBychatID()
    } catch (error) {
      console.error('Error promoting to vice leader:', error)
    }
  }

  const handleRemoveViceLeader = async (chatId, memberId) => {
    try {
      await onRemoveSubLeader?.(chatId, memberId)
      await loadUserBychatID()
    } catch (error) {
      console.error('Error removing vice leader:', error)
    }
  }

  const handleTransferLeader = async (chatId, memberId) => {
    try {
      await onTransferLeader?.(chatId, memberId)
      await loadUserBychatID()
    } catch (error) {
      console.error('Error transferring group leader:', error)
    }
  }

  const isPinned = isChatPinned(currentChat)

  return (
    <>
      <div
        className={`w-80 border-l border-gray-200 bg-white transform transition-transform duration-300 ease-in-out ${
          showGroupInfo ? 'translate-x-0' : 'translate-x-full'
        } ${showGroupInfo ? 'flex' : 'hidden'} flex-col`}
      >
        {/* Header */}
        <div className='flex h-[72px] flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-0'>
          <h3 className='text-lg font-semibold'>Thông tin nhóm</h3>
        </div>

        {/* Group Info Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {/* Group Avatar and Name */}
          <div className='flex flex-col items-center mb-6'>
            <div className='relative flex h-16 w-16 items-center justify-center overflow-visible rounded-full'>
              <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden'>
                {currentChat?.avatar ? (
                  <AvatarWithFrame
                    avatarPath={currentChat?.avatar}
                    altAvatar={currentChat?.name || 'Avatar'}
                    size={64}
                  />
                ) : (
                  <div className='w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm rounded-full'>
                    {currentChat?.name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                )}
              </div>
              {onUpdateChatAvatar && (
                <>
                  <input
                    ref={avatarInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleAvatarChange}
                  />
                  <button
                    type='button'
                    title='Đổi ảnh đại diện nhóm'
                    aria-label='Đổi ảnh đại diện nhóm'
                    onClick={() => avatarInputRef.current?.click()}
                    className='absolute -bottom-0.5 -right-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white p-0 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                  >
                    <Camera size={13} />
                  </button>
                </>
              )}
            </div>
            <h4 className='text-lg font-semibold text-gray-900'>
              {currentChat?.name || 'Nhóm thảo luận'}
            </h4>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-around mb-6'>
            <Button
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                isPinned ? 'text-red-600 hover:bg-red-50' : 'hover:bg-gray-50'
              }`}
              variant='ghost'
              onClick={() => onPinChat(currentChat?.id)}
              title={isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isPinned ? 'bg-red-50' : 'bg-gray-100'
                }`}
              >
                {isPinned ? (
                  <PinOff size={20} className='text-red-500' />
                ) : (
                  <PinIcon size={20} className='text-gray-600' />
                )}
              </div>
              <span
                className={`text-xs ${isPinned ? 'text-red-600' : 'text-gray-600'}`}
              >
                {isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}
              </span>
            </Button>
            <Button
              onClick={handleIsOpenFormAddMem}
              className='flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg'
              variant='ghost'
            >
              <div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center'>
                <Users size={20} className='text-gray-600' />
              </div>
              <span className='text-xs text-gray-600'>Thêm thành viên</span>
            </Button>
          </div>

          {/* Search in Group */}
          {/* <div className='mb-4'>
            <div
              className='flex items-center gap-2 text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-lg cursor-pointer'
              onClick={handleOpenSearch}
            >
              <Search size={16} />
              <span>Tìm trong nhóm</span>
            </div>
          </div> */}

          {/* Member List */}
          <div className='mb-4'>
            <div
              className='flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-1 rounded-md'
              onClick={handleOpenMembersList}
            >
              <h5 className='font-medium text-gray-900'>Thành viên nhóm</h5>
              <ChevronRight size={16} className='text-gray-400' />
            </div>
            <div
              className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 p-2 rounded-md'
              onClick={handleOpenMembersList}
            >
              <Users size={16} />
              <span>{currentChat?.countUser || 0} thành viên</span>
            </div>
          </div>

          {/* Group Settings */}
          <div className='mb-4'>
            <div
              className='flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-1 rounded-md'
              onClick={handleOpenBoardSidebar}
            >
              <h5 className='font-medium text-gray-900'>Bảng tin nhóm</h5>
              <ChevronRight size={16} className='text-gray-400' />
            </div>
          </div>

          {/* Media Tabs Gallery */}
          <div className='mb-4'>
            {/* Tab Navigation */}
            <div className='flex justify-between items-center mb-3 border-b border-gray-200'>
              <button
                onClick={() => setActiveTab(2)}
                className={`text-sm font-medium py-2 px-3 ${
                  activeTab === 2
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Hình ảnh
              </button>
              <button
                onClick={() => setActiveTab(4)}
                className={`text-sm font-medium py-2 px-3 ${
                  activeTab === 4
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Tài liệu
              </button>
              <button
                onClick={() => setActiveTab(3)}
                className={`text-sm font-medium py-2 px-3 ${
                  activeTab === 3
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Link
              </button>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className='flex justify-center items-center py-4'>
                <div className='w-6 h-6 border-2 border-t-blue-500 border-gray-200 rounded-full animate-spin'></div>
              </div>
            )}

            {/* Photos Tab Content */}
            {activeTab === 2 && !isLoading && (
              <div className='max-h-80 overflow-y-auto mb-3'>
                <div className='grid grid-cols-3 gap-1'>
                  {photosList.length > 0 ? (
                    photosList.map((photo, index) => (
                      <div
                        key={photo.id || index}
                        className='group relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer'
                        onClick={() => handlePreviewAttachment(photo)}
                      >
                        <RenderFileToken
                          pathFile={getAttachmentPath(photo)}
                          isPrivate={true}
                          Component={({ src }) => {
                            return (
                              <>
                                <ImageAdvanced
                                  src={src}
                                  alt={photo.fullName}
                                  type='avatar'
                                  width={300}
                                  height={400}
                                  className='w-full h-full object-cover'
                                  onError={e => {
                                    e.currentTarget.src = '/placeholder.svg'
                                  }}
                                />
                                <button
                                  type='button'
                                  title='Tải ảnh'
                                  aria-label='Tải ảnh'
                                  onClick={handleDownloadAttachment(photo)}
                                  className='absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-blue-600 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                                >
                                  <Download size={15} />
                                </button>
                              </>
                            )
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className='col-span-3 text-center py-3 text-gray-500'>
                      Không có hình ảnh nào
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab Content */}
            {activeTab === 4 && !isLoading && (
              <div className='max-h-80 overflow-y-auto space-y-3 mb-3'>
                {documentsList.length > 0 ? (
                  documentsList.map((doc, index) => (
                    <div
                      key={doc.id || index}
                      className='rounded-lg flex items-center w-full gap-2'
                    >
                      <div className='min-w-0 flex-1'>
                        <SelectFileItem
                          file={doc}
                          isCandelete={false}
                          onSelectFile={handlePreviewAttachment}
                        />
                      </div>
                      <button
                        type='button'
                        title={isVideoAttachment(doc) ? 'Tải clip' : 'Tải tài liệu'}
                        aria-label={isVideoAttachment(doc) ? 'Tải clip' : 'Tải tài liệu'}
                        onClick={handleDownloadAttachment(doc)}
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-blue-600 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-3 text-gray-500'>
                    Không có tài liệu nào
                  </div>
                )}
              </div>
            )}

            {/* Links Tab Content */}
            {activeTab === 3 && !isLoading && (
              <div className='max-h-80 overflow-y-auto space-y-2 mb-3'>
                {linksList.length > 0 ? (
                  linksList.map((link, index) => (
                    <div
                      key={link.id || index}
                      className='p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors'
                      onClick={() => {
                        const href = getOpenableLink(link)
                        if (href) window.open(href, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3'>
                          <LinkIcon className='w-5 h-5 text-gray-600' />
                        </div>
                        <div className='flex-1'>
                          <p className='font-medium text-sm text-gray-800 truncate'>
                            {(() => {
                              const displayText =
                                getAttachmentPath(link) || `Link ${index + 1}`
                              const maxLength = 30
                              return displayText.length > maxLength
                                ? `${displayText.substring(0, maxLength)}...`
                                : displayText
                            })()}
                          </p>
                          <p className='text-xs text-gray-500'>
                            Chia sẻ ngày{' '}
                            {new Date(link.createdDate).toLocaleDateString(
                              'vi-VN'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-3 text-gray-500'>
                    Không có liên kết nào
                  </div>
                )}
              </div>
            )}

            <Button
              className='w-full py-2 text-blue-600 text-sm border border-blue-200 rounded-lg hover:bg-blue-50'
              onClick={handleLeaveGroup}
            >
              <ArrowRight size={16} className='mr-1' /> Rời nhóm
            </Button>
            {isCurrentUserLeader && (
              <Button
                className='w-full py-2 mt-2 text-sm border border-blue-200 rounded-lg hover:bg-blue-50'
                variant='destructive'
                onClick={handleDisbandGroup}
              >
                <X size={16} className='mr-1' /> Giải tán nhóm
              </Button>
            )}
          </div>
        </div>
      </div>
      {previewFile && (
        <UniversalFilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
      {isOpen && (
        <FormAddMem
          isOpen={isOpen}
          currentChat={currentChat}
          setIsOpen={setIsOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleAddMem}
          existingMembers={groupMembers}
        />
      )}

      <SearchInGroupModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        currentChat={currentChat}
        onSearch={handleSearch}
      />

      {/* Modal danh sách thành viên */}
      <GroupMembersList
        isOpen={showMembersList}
        onClose={() => setShowMembersList(false)}
        members={groupMembers}
        currentChat={currentChat}
        onAddMember={handleAddMemberFromList}
        onRemoveMember={handleRemoveMember}
        onPromoteToAdmin={handlePromoteToViceLeader}
        onRemoveViceLeader={handleRemoveViceLeader}
        onTransferLeader={handleTransferLeader}
      />

      {/* Modal xác nhận giải tán nhóm */}
      <ConfirmationModal
        isOpen={showDisbandConfirmation}
        onClose={() => setShowDisbandConfirmation(false)}
        onConfirm={confirmDisbandGroup}
        title='Xác nhận giải tán nhóm'
        message='Thao tác này sẽ không hoàn tác. Bạn có chắc chắn muốn giải tán nhóm này?'
        confirmText='Giải tán nhóm'
        cancelText='Hủy bỏ'
        confirmButtonClass='bg-red-500 hover:bg-red-600 text-white'
        confirmIcon={<X className='w-5 h-5 mr-2' />}
      />

      {/* Modal xác nhận rời nhóm */}
      <ConfirmationModal
        isOpen={showLeaveConfirmation}
        onClose={() => setShowLeaveConfirmation(false)}
        onConfirm={confirmLeaveGroup}
        title='Xác nhận rời nhóm'
        message='Thao tác này sẽ không hoàn tác. Bạn có chắc chắn muốn rời nhóm này?'
        confirmText='Rời nhóm'
        cancelText='Hủy bỏ'
        confirmButtonClass='bg-red-500 hover:bg-red-600 text-white'
        confirmIcon={<X className='w-5 h-5 mr-2' />}
      />

      {/* Modal chọn trưởng nhóm mới khi rời nhóm */}
      <ChooseNewLeaderModal
        isOpen={showNewLeaderModal}
        onClose={() => setShowNewLeaderModal(false)}
        members={groupMembers}
        currentChat={currentChat}
        userInfo={userInfo}
        onChooseNewLeader={handleChooseNewLeaderAndLeave}
      />

      {/* Bảng tin nhóm sidebar */}
      <GroupBoardSidebar
        isOpen={showBoardSidebar}
        onClose={() => setShowBoardSidebar(false)}
        currentChat={currentChat}
        onCreateNote={onCreateNote}
      />
    </>
  )
}
