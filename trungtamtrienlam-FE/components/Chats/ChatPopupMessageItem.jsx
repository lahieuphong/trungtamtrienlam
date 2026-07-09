import React, { useState, useEffect, useContext, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Paperclip, Download, Bell, NotebookIcon, Vote, PinIcon } from 'lucide-react'
import AvatarWithFrame from '../avatars/avatarFrame'
import MarkdownViewer from '@/components/Chats/MarkDownViewer'
import SelectFileItem from '../files/SelectFileItem'
import PollContent from './PollContent'
import ReminderDetailModal from './ReminderModel'
import NoteModal from './NoteModal'
import PollModal from './PollModal'
import ProgressContext from '@/contexts/ProgressContext'
import { FolderConstants } from '@/constants/dataConstants'
import { v4 } from 'uuid'
import PdfConverter from '@/components/converPDF/PdfConverter'
import OnlyOfficeComponent, { getTypeOnlyOffice } from '../onlyOffices/OnlyOfficeComponent'
import RenderFileToken from '../controls/renderFileTokens/RenderFileToken'
import { OnlyOfficeConstants } from '@/constants/configConstants'
import { Modal } from '@/components/ui/modal'
import PreviewFileModal from '../files/PreviewFileModal'
import { FileHelpers } from '@/helpers/fileHelpers'
import { ApiConstants } from '@/constants/apiConstants'
import ReminderCard from './ReminderCard'
import { ImageAdvanced } from '@/components/Form'
import { isReminderForUser } from './reminderUserList'

const CONTEXT_MENU_WIDTH = 208
const CONTEXT_MENU_HEIGHT = 120

const normalizeChatIdentity = value => {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

const getFileType = fileName => {
  if (!fileName) return { isPdf: false, isWord: false, isSupported: false, isImage: false }
  const isPdf = FileHelpers.isFilePdf(fileName)
  const isWord = FileHelpers.isFileDocDocument(fileName) || FileHelpers.isFileDocxDocument(fileName)
  const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName)
  const isSupported =
    isPdf ||
    isWord ||
    FileHelpers.isFileExcelDocument(fileName) ||
    FileHelpers.isFileExcelxDocument(fileName) ||
    FileHelpers.isFilePowerPointDocument(fileName) ||
    FileHelpers.isFilePowerPointxDocument(fileName) ||
    FileHelpers.isFileTxtDocument(fileName) ||
    isImage
  return { isPdf, isWord, isSupported, isImage }
}

const getMessageColumnClass = isOwn => `min-w-0 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isOwn ? 'order-1' : ''}`

const getBubbleClass = (isOwn, hasFileAttachments) => {
  const colorClass = isOwn && hasFileAttachments
    ? 'bg-[#F0F5FF] text-[#1F1F1F] ml-auto'
    : isOwn
      ? 'bg-[#597EF7] text-white ml-auto'
      : 'bg-gray-100 text-gray-900'
  return `min-w-0 max-w-full overflow-hidden p-3 rounded-2xl relative ${colorClass}`
}

const getAttachmentCardClass = isOwn => `${isOwn ? 'bg-white text-black' : 'bg-gray-100'} rounded-lg`

const getMarkdownClass = (isOwn, hasFileAttachments) => `min-w-0 max-w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] prose-p:break-words prose-p:[overflow-wrap:anywhere] prose-a:break-all prose-code:break-all ${isOwn && !hasFileAttachments ? 'prose-p:text-white prose-strong:text-white prose-li:text-white prose-a:text-white' : ''}`

const getTimestampClass = isOwn => `text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'} flex items-center ${isOwn ? 'justify-end' : 'justify-start'}`

const getCurrentUserIdentities = userInfo => {
  if (!userInfo) return []
  return [
    userInfo.userID,
    userInfo.UserID,
    userInfo.id,
    userInfo.ID,
    userInfo.username,
    userInfo.userName,
    userInfo.email,
    userInfo.Email,
    userInfo.fullName,
    userInfo.name
  ]
    .map(normalizeChatIdentity)
    .filter(Boolean)
}

const isCurrentUserMessage = (message, userInfo) => {
  if (message?.sender === 'me' || message?.isMe) return true
  const identities = getCurrentUserIdentities(userInfo)
  if (!identities.length) return false
  return [
    message?.senderID,
    message?.SenderID,
    message?.userID,
    message?.UserID,
    message?.createdBy,
    message?.CreatedBy,
    message?.senderName
  ]
    .map(normalizeChatIdentity)
    .some(value => value && identities.includes(value))
}

const formatReminderTime = dateTime => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const reminderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const timeString = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (reminderDate.getTime() === today.getTime()) {
    return `Hôm nay lúc ${timeString}`
  } else if (reminderDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
    return `Ngày mai lúc ${timeString}`
  } else {
    const dateString = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${dateString} lúc ${timeString}`
  }
}

const MessageAvatar = ({ isAI, message, size = 35 }) => (
  <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0'>
    {isAI ? (
      <Image
        src='/TTBT_icon_anim_idle.gif'
        alt='Chatbot Icon'
        width={30}
        height={30}
        className='rounded-full object-fit'
        unoptimized={false}
      />
    ) : (
      <AvatarWithFrame
        avatarPath={message?.avatar}
        altAvatar={message?.sender || 'Avatar'}
        size={size}
      />
    )}
  </div>
)

const ContextMenu = ({ position, isOwn, isPinned, onPin, onUnpin, onReply, onRecall }) => {
  if (typeof window === 'undefined') return null

  const stopAndRun = (event, callback) => {
    event.preventDefault()
    event.stopPropagation()
    callback()
  }

  return createPortal(
    <div
      className='context-menu fixed bg-white shadow-lg rounded-lg py-1 z-[99999] border border-gray-200 w-52'
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        position: 'fixed',
        zIndex: 99999
      }}
      onClick={event => event.stopPropagation()}
    >
      {isPinned ? (
        <button
          onClick={event => stopAndRun(event, onUnpin)}
          className='flex items-center w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-gray-100'
        >
          <PinIcon className='mr-2' size={16} />
          Bỏ ghim tin nhắn
        </button>
      ) : (
        <button
          onClick={event => stopAndRun(event, onPin)}
          className='flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100'
        >
          <PinIcon className='mr-2' size={16} />
          Ghim tin nhắn
        </button>
      )}
      <button
        onClick={event => stopAndRun(event, onReply)}
        className='flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100'
      >
        <Image
          src='/Reply_tin_nhan.svg'
          alt='Reply Icon'
          width={16}
          height={16}
          className='mr-2'
        />
        Trả lời tin nhắn
      </button>
      {isOwn && (
        <button
          onClick={event => stopAndRun(event, onRecall)}
          className='flex items-center w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-gray-100'
        >
          <Image
            src='/thu_hoi.svg'
            alt='Recall Icon'
            width={16}
            height={16}
            className='mr-2'
          />
          Thu hồi tin nhắn
        </button>
      )}
    </div>,
    document.body
  )
}

const ChatPopupMessageItem = ({
  message,
  isAI,
  onRecallMessage,
  onReply,
  onVote,
  onEditReminder,
  onUpdateNote,
  userInfo,
  ListUsers = [],
  polls = [],
  reminders = [],
  onJoinReminder,
  onDeclineReminder,
  isRead = false,
  lastReadMessageId = null,
  onPinMessage,
  onUnpinMessage,
  handleAddNewOption,
  onScrollToMessage,
  seenByUsers = null
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectFile, setSelectFile] = useState(null)
  const [showFileViewerModal, setShowFileViewerModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0)
  const progressContext = useContext(ProgressContext)
  const isOwn = isCurrentUserMessage(message, userInfo)
  const hasFileAttachments = message.type === 'file' || (message.files && message.files.length > 0)
  const [showReminderModal, setShowReminderModal] = useState(false)

  // Helper function to find user by ID
  const findUserById = userId => {
    if (!userId) return null
    const lookup = String(userId)
    const matchesUserId = user => user && [user.userID, user.UserID, user.id, user.ID, user.value, user.Value]
      .map(value => (value === null || value === undefined ? '' : String(value)))
      .includes(lookup)
    if (ListUsers) {
      if (Array.isArray(ListUsers)) {
        return ListUsers.find(matchesUserId)
      } else if (typeof ListUsers === 'object' && ListUsers !== null) {
        if (ListUsers.users && Array.isArray(ListUsers.users)) {
          return ListUsers.users.find(matchesUserId)
        }
      }
    }
    return null
  }

  // Helper function to get user display name
  const getUserDisplayName = (userId, isCurrentUser = false) => {
    if (isCurrentUser) return 'Bạn'
    const user = findUserById(userId)
    if (!user) return userId
    // Ưu tiên thứ tự: fullName -> name -> displayName -> label -> userId
    return (
      user.fullName ||
      user.FullName ||
      user.name ||
      user.Name ||
      user.userName ||
      user.UserName ||
      user.displayName ||
      user.label ||
      user.email ||
      user.Email ||
      userId
    )
  }

  const normalizeUserId = value => {
    if (value === null || value === undefined) return ''
    return String(value)
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

  // Helper function to parse seenBy safely
  const parseSeenBy = seenBy => {
    try {
      if (Array.isArray(seenBy)) return seenBy
      if (typeof seenBy === 'string') {
        return JSON.parse(seenBy)
      }
      return []
    } catch (error) {
      console.error('Error parsing seenBy:', error)
      return []
    }
  }
  const onlyOfficeType = getTypeOnlyOffice(selectFile?.file)
  const renderFileViewer = () => {
    if (!selectFile || !showFileViewerModal) return null
    const selectedFileType = selectFile
      ? getFileType(selectFile.file || selectFile.name || selectFile.fileName)
      : null
    const fileName = selectFile?.name || selectFile?.fileName

    if (selectedFileType?.isPdf) {
      return (
        <Modal
          onClose={onClosePreviewFile}
          isOpen={showFileViewerModal}
          size='lg'
        >
          <RenderFileToken
            key={`pdf-${selectFile?.id || selectFile?.file}-${Date.now()}`}
            isPrivate={true}
            pathFile={selectFile?.file}
            Component={({ src }) => (
              <PdfConverter
                key={`pdf-converter-${selectFile?.id || selectFile?.file
                  }-${Date.now()}`}
                className='w-full h-[85vh] rounded-lg shadow-lg border border-gray-200 bg-white'
                fileUrl={src}
                fileName={fileName}
                title={fileName}
                uniqueKey={`pdf-${selectFile?.id || selectFile?.file
                  }-${Date.now()}`}
                staffFiles={[]}
                signatureList={[]}
                isWordDoc={false}
                isEnabled={false}
              />
            )}
          />
        </Modal>
      )
    } else if (selectedFileType?.isWord && onlyOfficeType) {
      return (
        <Modal
          onClose={onClosePreviewFile}
          isOpen={showFileViewerModal}
          size='lg'
        >
          <RenderFileToken
            key={`office-${selectFile?.id || selectFile?.file}-${Date.now()}`}
            isPrivate={true}
            pathFile={selectFile?.file}
            Component={({ src }) => (
              <OnlyOfficeComponent
                key={`office-${selectFile?.id || selectFile?.file
                  }-${Date.now()}`}
                className='h-[85vh] !w-[100%]'
                widthContent='100%'
                heightContent='100%'
                fileType={onlyOfficeType.type}
                documentType={onlyOfficeType.documentType}
                uniqueKey={`office-${selectFile?.id || selectFile?.file
                  }-${Date.now()}`}
                mode={OnlyOfficeConstants.modes.view}
                title={fileName}
                fileUrl={src}
                callbackUrl={
                  ApiConstants.onlyOfficeServerUrlCallBack +
                  `?savePath=${selectFile?.file}&isPrivate=true`
                }
              />
            )}
          />
        </Modal>
      )
    } else if (selectedFileType?.isImage) {
      return (
        <PreviewFileModal
          key={`preview-${selectFile?.id || selectFile?.file}-${Date.now()}`}
          file={selectFile}
          onClose={onClosePreviewFile}
        />
      )
    }

    return (
      <PreviewFileModal
        key={`preview-${selectFile?.id || selectFile?.file}-${Date.now()}`}
        file={selectFile}
        onClose={onClosePreviewFile}
      />
    )
  }

  // Function to render seen by avatars
  const renderSeenByAvatars = () => {
    if (!isOwn) return null

    const propSeenUsers = Array.isArray(seenByUsers) ? seenByUsers : []
    const rawSeenUsers = parseSeenBy(message.seenBy)
    const seenUsers = propSeenUsers.length > 0 ? propSeenUsers : rawSeenUsers
    console.log('[chat-seen:render-popup]', {
      messageId: message?.id,
      isOwn,
      propSeenUsers,
      rawSeenBy: message?.seenBy,
      rawSeenUsers,
      selectedSeenUsers: seenUsers,
      currentUser: userInfo
    })
    if (!seenUsers || seenUsers.length === 0) return null

    const currentUserId = normalizeUserId(
      userInfo?.userID ?? userInfo?.UserID ?? userInfo?.id ?? userInfo?.ID
    )
    const otherUsers = seenUsers.filter(
      user =>
        normalizeUserId(user.userID || user.UserID || user.id || user.ID) !==
        currentUserId
    )

    const uniqueUsers = otherUsers.filter(
      (user, index, self) =>
        index ===
        self.findIndex(
          u =>
            normalizeUserId(u.userID || u.UserID || u.id || u.ID) ===
            normalizeUserId(user.userID || user.UserID || user.id || user.ID)
        )
    )

    if (uniqueUsers.length === 0) {
      console.log('[chat-seen:render-popup-empty-after-filter]', {
        messageId: message?.id,
        currentUserId,
        seenUsers,
        otherUsers
      })
      return null
    }

    console.log('[chat-seen:render-popup-show]', {
      messageId: message?.id,
      currentUserId,
      uniqueUsers
    })

    return (
      <div className='mt-1 flex justify-end pr-1'>
        <div className='flex -space-x-1'>
          {uniqueUsers.slice(0, 3).map((user, index) => {
            const userId = user.userID || user.UserID || user.id || user.ID
            const avatar = user.avatar || user.Avatar
            const fullName = user.fullName || user.FullName || user.name || user.Name

            return (
              <AvatarWithFrame
                key={`${userId}-${index}`}
                avatarPath={avatar}
                altAvatar={fullName || userId}
                size={18}
              />
            )
          })}
          {uniqueUsers.length > 3 && (
            <div className='w-[18px] h-[18px] bg-gray-200 border border-white rounded-full flex items-center justify-center text-[9px] font-medium text-gray-600'>
              +{uniqueUsers.length - 3}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Helper function to format time only (date separator handles the date)
  const formatMessageTime = timestamp => {
    if (!timestamp) return ''

    const messageDate = new Date(timestamp)
    return messageDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // Track window size
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleContextMenu = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    // always show context menu to reply to any message
    // Calculate position to ensure menu stays within viewport
    const menuWidth = CONTEXT_MENU_WIDTH
    const menuHeight = CONTEXT_MENU_HEIGHT
    let x = e.clientX
    let y = e.clientY
    // Adjust position if menu would overflow viewport
    if (x + menuWidth > windowWidth)
      x = e.clientX - menuWidth
    if (y + menuHeight > window.innerHeight)
      y = e.clientY - menuHeight
    setContextMenuPosition({ x, y })
    setShowContextMenu(true)
  }, [windowWidth])

  useEffect(() => {
    // Only close if clicking outside the context menu
    const handleClickOutside = event => {
      if (!event.target.closest('.context-menu')) setShowContextMenu(false)
    }
    // Close context menu when scrolling to prevent positioning issues
    const handleScroll = () => setShowContextMenu(false)
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleScroll)
    }
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [showContextMenu])

  const handleReplyMessage = useCallback(() => {
    if (typeof onReply === 'function') onReply(message)
    setShowContextMenu(false)
  }, [onReply, message])

  const handlePinMessage = useCallback(() => {
    if (typeof onPinMessage === 'function') onPinMessage(message.id)
    setShowContextMenu(false)
  }, [onPinMessage, message.id])

  const handleUnpinMessage = useCallback(() => {
    if (typeof onUnpinMessage === 'function') {
      onUnpinMessage({ messageID: [message.id], eventID: [] })
    }
    setShowContextMenu(false)
  }, [onUnpinMessage, message.id])

  const handleRecallMessage = useCallback(() => {
    if (typeof onRecallMessage === 'function') onRecallMessage(message.id)
    setShowContextMenu(false)
  }, [onRecallMessage, message.id])

  const handleOnSelectFile = file => {
    setSelectFile(file)
    setShowFileViewerModal(true)
  }

  const onClosePreviewFile = () => {
    setShowFileViewerModal(false)
    setSelectFile(null)
  }

  const handleVote = voteData => onVote?.(voteData)

  const handleUpdateNote = noteData => onUpdateNote?.(noteData)

  const handleDowloadFile = file => {
    if (file) {
      const fileName = file.FileName || file.name || ''
      const fileExtension = file.Extension || fileName.split('.').pop().toLowerCase()
      const zipId = v4().toString()
      if (fileExtension === 'zip') {
        // handle zip file
        progressContext.addProgress({
          file,
          path: file.file || file.File,
          isPrivate: true,
          id: zipId,
          downloadType: FolderConstants.downloadTypes.zip,
          zip: { items: file, zipId },
          name: fileName || 'file.zip'
        })
      } else {
        // handle regular files
        progressContext.addProgress({
          file,
          path: file.file || file.File,
          isPrivate: true,
          name: fileName || 'file'
        })
      }
    }
  }

  if (message.messageType === 5) {
    let displayContent = message.content
    if (message.content && (message.content.includes('đã bổ nhiệm') || message.content.includes('thành trưởng nhóm'))) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length >= 2) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const targetId = allUserIds[1].replace(/{|}/g, '')
        const isActorCurrentUser = userInfo && String(actorId) === String(userInfo.userID)
        const isTargetCurrentUser = userInfo && String(targetId) === String(userInfo.userID)
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)
        if (message.content.includes('thành trưởng nhóm mới')) {
          displayContent = `${actorName} đã bổ nhiệm ${targetName} thành trưởng nhóm mới`
        } else if (message.content.includes('đã bổ nhiệm')) {
          displayContent = `${actorName} đã bổ nhiệm ${targetName} thành phó nhóm`
        }
        return (
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {displayContent}
            </div>
          </div>
        )
      }
    }

    if (message.content && (message.content.includes('đã xóa') || message.content.includes('khỏi nhóm'))) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length >= 2) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const targetId = allUserIds[1].replace(/{|}/g, '')
        const isActorCurrentUser = userInfo && String(actorId) === String(userInfo.userID)
        const isTargetCurrentUser = userInfo && String(targetId) === String(userInfo.userID)
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)
        return (
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {`${actorName} đã xóa ${targetName} khỏi nhóm`}
            </div>
          </div>
        )
      }
    }

    // handle when user is added to the group
    if (message.content && (message.content.includes('được thêm vào nhóm') || message.content.includes('đã được thêm'))) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length >= 1) {
        const targetId = allUserIds[0].replace(/{|}/g, '')
        const isTargetCurrentUser = userInfo && String(targetId) === String(userInfo.userID)
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)
        return (
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {`${targetName} đã được thêm vào nhóm`}
            </div>
          </div>
        )
      }
    }

    // handle message for voting
    if (message.content && message.content.includes('đã tham gia bình chọn')) {
      let displayContent = message.content
      // separate user name from content
      const beforeVoteText = message.content.split('đã tham gia bình chọn')[0].trim()
      if (beforeVoteText) {
        const isCurrentUser = userInfo && userInfo.fullName && beforeVoteText === userInfo.fullName
        if (isCurrentUser) displayContent = message.content.replace(beforeVoteText, 'Bạn')
      }
      return (
        <div key={message.id} className='flex justify-center mb-3 px-4'>
          <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
            {displayContent}
          </div>
        </div>
      )
    }

    // handle message "xác nhận: Tham gia" or "xác nhận: Không tham gia"
    if (message.content && (message.content.includes('xác nhận: Tham gia') || message.content.includes('xác nhận: Không tham gia'))) {
      let displayContent = message.content
      // separate user name from content
      const beforeConfirmText = message.content.split('xác nhận:')[0].trim()
      if (beforeConfirmText) {
        const isCurrentUser = userInfo && userInfo.fullName && beforeConfirmText === userInfo.fullName
        if (isCurrentUser) {
          displayContent = message.content.replace(beforeConfirmText, 'Bạn')
        } else {
          displayContent = message.content
        }
      }

      return (
        <div key={message.id} className='flex justify-center mb-3 px-4'>
          <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
            {displayContent}
          </div>
        </div>
      )
    }

    if (message.eventType === 2 && message.content && message.content.toLowerCase().includes('tạo bình chọn')) {
      let displayContent = message.content
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const isActorCurrentUser = userInfo && actorId === userInfo.userID
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        displayContent = `${actorName} đã tạo bình chọn mới`
      } else {
        // Nếu không có {userId}, tìm tên user từ content
        const beforeCreateText = message.content.split('đã tạo bình chọn')[0]?.trim() || message.content.split('tạo bình chọn')[0]?.trim()
        if (beforeCreateText && beforeCreateText !== message.content) {
          const isCurrentUser = userInfo && userInfo.fullName && beforeCreateText === userInfo.fullName
          if (isCurrentUser) {
            displayContent = message.content.replace(beforeCreateText, 'Bạn')
          } else {
            displayContent = message.content
          }
        } else {
          displayContent = 'Đã tạo bình chọn mới'
        }
      }

      const matchingPoll = polls.find(poll => String(poll.id) === String(message.eventID))

      return (
        <>
          <div
            key={`notify-${message.id}`}
            className='flex justify-center mb-2 px-4'
          >
            <div className='bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2'>
              <Vote size={16} className='text-blue-500' />
              <span className='text-sm text-gray-600 font-medium'>
                {displayContent}
              </span>
            </div>
          </div>
          {showPollModal && (
            <PollModal
              voteID={message?.eventID}
              onClose={() => setShowPollModal(false)}
              poll={matchingPoll}
              handleVote={handleVote}
            />
          )}
          {matchingPoll && (
            <div className='w-full max-w-full overflow-hidden'>
              <PollContent
                poll={matchingPoll}
                handleVote={handleVote}
                handleAddNewOption={handleAddNewOption}
                key={`poll-${message.id}`}
              />
            </div>
          )}
        </>
      )
    }

    if (message.content && message.content.toLowerCase().includes('tạo ghi chú')) {
      let displayContent = message.content
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const isActorCurrentUser = userInfo && actorId === userInfo.userID
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        displayContent = `${actorName} đã tạo ghi chú mới`
      } else {
        // Nếu không có {userId}, tìm tên user từ content
        const beforeCreateText = message.content.split('đã tạo ghi chú')[0]?.trim() || message.content.split('tạo ghi chú')[0]?.trim()
        if (beforeCreateText && beforeCreateText !== message.content) {
          // Kiểm tra xem có phải user hiện tại không
          const isCurrentUser = userInfo && userInfo.fullName && beforeCreateText === userInfo.fullName
          if (isCurrentUser) {
            displayContent = message.content.replace(beforeCreateText, 'Bạn')
          }
          displayContent = message.content
        } else {
          displayContent = 'Đã tạo ghi chú mới'
        }
      }

      return (
        <>
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div
              className={`bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2 ${message.isPin ? 'border border-blue-300' : ''
                }`}
            >
              {/* {message.isPin && (
                <Pin size={14} className='text-blue-500' fill='currentColor' />
              )} */}
              <NotebookIcon className='text-gray-500' size={16} />
              <span className='text-sm text-gray-600'>
                {displayContent}{' '}
                <span
                  className='text-blue-500 hover:underline cursor-pointer'
                  onClick={() => setShowNoteModal(true)}
                >
                  Xem
                </span>
              </span>
            </div>
          </div>

          <NoteModal
            isOpen={showNoteModal}
            onClose={() => setShowNoteModal(false)}
            eventID={message?.eventID}
            onUpdate={handleUpdateNote}
          />
        </>
      )
    }

    // Xử lý thông báo cập nhật ghi chú
    if (
      message.content &&
      message.content.toLowerCase().includes('đã cập nhật ghi chú')
    ) {
      let displayContent = message.content

      // Kiểm tra nếu có {userId} pattern
      const allUserIds = message.content.match(/{([^}]+)}/g) || []

      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const isActorCurrentUser = userInfo && actorId === userInfo.userID
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        displayContent = `${actorName} đã cập nhật ghi chú`
      } else {
        // Nếu không có {userId}, tìm tên user từ content
        const beforeUpdateText = message.content.split('đã cập nhật ghi chú')[0]?.trim()

        if (beforeUpdateText && beforeUpdateText !== message.content) {
          // Kiểm tra xem có phải user hiện tại không
          const isCurrentUser = userInfo && userInfo.fullName && beforeUpdateText === userInfo.fullName

          if (isCurrentUser) {
            displayContent = message.content.replace(beforeUpdateText, 'Bạn')
          } else {
            // Kiểm tra trong ListUsers để xác nhận
            let foundUser = null
            if (Array.isArray(ListUsers)) {
              foundUser = ListUsers.find(user => user && user.name === beforeUpdateText)
            } else if (typeof ListUsers === 'object' && ListUsers !== null) {
              if (ListUsers.users && Array.isArray(ListUsers.users)) {
                foundUser = ListUsers.users.find(user => user && user.name === beforeUpdateText)
              }
            }

            // Nếu tìm thấy user trong ListUsers thì giữ nguyên tên, nếu không tìm thấy thì cũng giữ nguyên
            displayContent = message.content
          }
        } else {
          displayContent = 'Đã cập nhật ghi chú'
        }
      }

      return (
        <>
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className='bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2'>
              <NotebookIcon className='text-gray-500' size={16} />
              <span className='text-sm text-gray-600'>
                {displayContent}{' '}
                <span
                  className='text-blue-500 hover:underline cursor-pointer'
                  onClick={() => setShowNoteModal(true)}
                >
                  Xem
                </span>
              </span>
            </div>
          </div>

          <NoteModal
            isOpen={showNoteModal}
            onClose={() => setShowNoteModal(false)}
            eventID={message?.eventID}
            onUpdate={handleUpdateNote}
          />
        </>
      )
    }

    if (
      (message.eventType === 3 &&
        message.content &&
        message.content.toLowerCase().includes('nhắc hẹn') &&
        message.ListUserJoinReminder &&
        Array.isArray(message.ListUserJoinReminder) &&
        message.ListUserJoinReminder.length > 0) ||
      (typeof message.ListUserJoinReminder === 'string' &&
        message.ListUserJoinReminder.trim() !== '')
    ) {
      const isUserInReminderList = isReminderForUser(
        message.ListUserJoinReminder,
        userInfo
      )

      // Chỉ hiển thị thông báo nếu user nằm trong danh sách
      if (!isUserInReminderList) {
        return null
      }

      // find reminder that matches current message
      const matchingReminder = reminders.find(reminder => String(reminder.id) === String(message.eventID))

      const displayContent = `Nhắc hẹn: ${matchingReminder?.remindContent || message.content}`

      return (
        <>
          {/* Thông báo nhắc hẹn selective */}
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className={`bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-4 flex items-center gap-2 ${message.isPin ? 'border border-yellow-300' : ''}`}>
              <Bell className='text-yellow-600' size={16} />
              <span className='text-sm text-yellow-800 font-medium'>
                {displayContent}{' '}
                <span
                  className='text-blue-500 hover:underline cursor-pointer'
                  onClick={() => setShowReminderModal(true)}
                >
                  Xem
                </span>
              </span>
            </div>
          </div>
          {/* ReminderCard hiển thị giao diện nhắc hẹn */}
          {matchingReminder && (
            <div className='flex justify-center mb-3 px-2 sm:px-4 cursor-pointer'>
              <div
                className='w-full max-w-md'
                onClick={() => setShowReminderModal(true)}
              >
                <ReminderCard
                  reminder={matchingReminder}
                  userInfo={userInfo}
                  onJoinReminder={onJoinReminder}
                  onDeclineReminder={onDeclineReminder}
                />
              </div>
            </div>
          )}
          <ReminderDetailModal
            isOpen={showReminderModal}
            onClose={() => setShowReminderModal(false)}
            reminder={matchingReminder}
            onEdit={reminder => {
              onEditReminder?.(reminder)
            }}
          />
        </>
      )
    }

    // Trường hợp thông thường: Nhắc hẹn không có ListUserJoinReminder (public notification)
    if (message.eventType === 3 && message.content && message.content.toLowerCase().includes('nhắc hẹn')) {
      let displayContent = message.content
      // Tìm reminder phù hợp với message hiện tại
      const matchingReminder = reminders.find(reminder => String(reminder.id) === String(message.eventID))
      // Kiểm tra nếu có {userId} pattern
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length > 0) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const isActorCurrentUser = userInfo && actorId === userInfo.userID
        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        displayContent = `${actorName} đã tạo nhắc hẹn ${matchingReminder?.remindContent || 'mới'} vào ${formatReminderTime(matchingReminder?.remindTime || matchingReminder?.remindTime)}`
      } else {
        // Nếu không có {userId}, tìm tên user từ content
        const beforeCreateText = message.content.split('đã tạo nhắc hẹn')[0]?.trim()
        if (beforeCreateText && beforeCreateText !== message.content) {
          // Kiểm tra xem có phải user hiện tại không
          const isCurrentUser = userInfo && userInfo.fullName && beforeCreateText === userInfo.fullName

          if (isCurrentUser) {
            displayContent = message.content.replace(beforeCreateText, 'Bạn')
          }
        } else {
          displayContent = 'Đã tạo nhắc hẹn mới'
        }
      }

      return (
        <>
          {/* public notification for booking */}
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className={`bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2 ${message.isPin ? 'border border-blue-300' : ''}`}>
              <Bell className='text-gray-500' size={16} />
              <span className='text-sm text-gray-600 font-medium'>
                {displayContent}{' '}
                <span
                  className='text-blue-500 hover:underline cursor-pointer'
                  onClick={() => setShowReminderModal(true)}
                >
                  Xem
                </span>
              </span>
            </div>
          </div>
          {/* ReminderCard for booking */}
          {matchingReminder && (
            <div className='flex justify-center mb-3 px-2 sm:px-4 cursor-pointer'>
              <div
                className='w-full max-w-md'
                onClick={() => setShowReminderModal(true)}
              >
                <ReminderCard
                  reminder={matchingReminder}
                  userInfo={userInfo}
                  onJoinReminder={onJoinReminder}
                  onDeclineReminder={onDeclineReminder}
                />
              </div>
            </div>
          )}
          <ReminderDetailModal
            isOpen={showReminderModal}
            onClose={() => setShowReminderModal(false)}
            reminder={matchingReminder}
            onEdit={reminder => onEditReminder?.(reminder)}
          />
        </>
      )
    }

    // handle message "đã rời nhóm" or "rời nhóm"
    if (message.content && (message.content.includes('đã rời nhóm') || message.content.includes('rời nhóm'))) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []
      if (allUserIds.length >= 1) {
        const targetId = allUserIds[0].replace(/{|}/g, '')
        const isTargetCurrentUser = userInfo && targetId === userInfo.userID
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)
        displayContent = `${targetName} đã rời nhóm`
        return (
          <div key={message.id} className='flex justify-center mb-3 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {displayContent}
            </div>
          </div>
        )
      }
    }

    if (typeof message.content === 'string' && message.content.includes('{')) {
      displayContent = replaceUserPlaceholders(message.content)
    } else if (message.senderID && message.content.includes(message.senderID)) {
      const isCurrentUser = isCurrentUserMessage(message, userInfo)
      const displayName = isCurrentUser ? 'Bạn' : message.senderName
      displayContent = message.content.replace(message.senderID, displayName)
      displayContent = displayContent.replace(/[{}]/g, '')
    }

    return (
      <div key={message.id} className='flex justify-center mb-3 px-4'>
        <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
          {displayContent}
        </div>
      </div>
    )
  }

  if (message.isUnsend) {
    return (
      <div key={message.id} className='mb-4'>
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
          {!isOwn && <MessageAvatar isAI={isAI} message={message} size={40} />}
          <div className={getMessageColumnClass(isOwn)}>
            {!isOwn && (
              <div className='text-xs text-gray-600 mb-1 ml-1'>
                {message.senderName}
              </div>
            )}
            <div className={`min-w-0 max-w-full p-3 rounded-2xl italic text-sm ${isOwn ? 'bg-[#597EF7] text-white' : 'bg-gray-100 text-gray-500'}`}>
              Tin nhắn đã được thu hồi
            </div>
            <div className={getTimestampClass(isOwn)}>
              {formatMessageTime(message.createdDate)}
            </div>
            {renderSeenByAvatars()}
          </div>
        </div>
      </div>
    )
  }

  // check if message is polling
  if (message.eventType === 2) {
    const matchingPoll = polls.find(poll => String(poll.id || poll.ID) === String(message.eventID))
    return (
      <div className='w-full max-w-full overflow-hidden'>
        <PollContent poll={matchingPoll} handleVote={handleVote} />
      </div>
    )
  }
  // Normal message render. Message read status will be handled by IntersectionObserver in MessageList
  const fileViewer = renderFileViewer()
  return (
    <div key={message.id} className='mb-4' onContextMenu={handleContextMenu}>
      {showContextMenu && (
        <ContextMenu
          position={contextMenuPosition}
          isOwn={isOwn}
          isPinned={!!message.isPin}
          onPin={handlePinMessage}
          onUnpin={handleUnpinMessage}
          onReply={handleReplyMessage}
          onRecall={handleRecallMessage}
        />
      )}
      <div
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 message-item`}
        data-message-id={message.id}
        data-from={isOwn ? 'me' : 'other'}
      >
        {!isOwn && <MessageAvatar isAI={isAI} message={message} />}
        <div className={getMessageColumnClass(isOwn)}>
          {!isOwn && (
            <div className='text-xs text-gray-600 mb-1 ml-1'>
              {message.senderName}
            </div>
          )}
          <div
            onContextMenu={handleContextMenu}
            className={getBubbleClass(isOwn, hasFileAttachments)}
          >
            {/* Reply indicator */}
            {message.replyToMessage && (
              <div
                className='mb-2 border-l-2 border-blue-400 pl-2 cursor-pointer hover:bg-blue-50 rounded p-1 transition-colors'
                onClick={e => {
                  e.stopPropagation() // Prevent triggering parent events
                  if (onScrollToMessage && message.replyToMessage.id) {
                    onScrollToMessage(message.replyToMessage.id)
                  }
                }}
              >
                <div className='text-xs text-blue-600 font-medium mb-1'>
                  Trả lời{' '}
                  {message.replyToMessage.senderName || (message.replyToMessage.sender === 'me' ? 'chính mình' : message.replyToMessage.sender)}
                </div>
                <div className='text-xs text-gray-500 line-clamp-2'>
                  {message.replyToMessage.content || (message.replyToMessage.files?.length > 0 ? '[Tệp đính kèm]' : '')}
                </div>
              </div>
            )}
            {message.type === 'file' ? (
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center'>
                  <Paperclip size={20} className='text-blue-600' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='font-medium truncate'>{message.fileName}</div>
                  <div className='text-sm text-gray-500'>
                    {message.fileSize}
                  </div>
                </div>
                <button className='p-1 hover:bg-gray-200 rounded'>
                  <Download size={16} />
                </button>
              </div>
            ) : (
              <>
                <MarkdownViewer
                  content={message.content}
                  className={getMarkdownClass(isOwn, hasFileAttachments)}
                />
                {/* show file if there are any */}
                {message.files && message.files.length > 0 && (
                  <div className='mt-2 space-y-2'>
                    {message.files.map((file, index) => {
                      const fileType = getFileType(file.file || file.name || file.fileName)
                      if (fileType.isImage) {
                        return (
                          <div
                            key={index}
                            className={`${getAttachmentCardClass(isOwn)} relative group`}
                          >
                            <RenderFileToken
                              pathFile={file.file}
                              isPrivate={true}
                              Component={({ src }) => (
                                <ImageAdvanced
                                  src={src}
                                  alt={file.name || 'Image'}
                                  className='max-w-full h-auto rounded-lg object-cover border border-gray-200 shadow-sm cursor-pointer hover:opacity-95 transition-opacity'
                                  style={{ maxHeight: '300px' }}
                                  width={500}
                                  height={300}
                                  onClick={() => handleOnSelectFile(file)}
                                  onError={e => {
                                    e.target.src = '/placeholder.svg'
                                  }}
                                />
                              )}
                            />
                            <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                              <button
                                className='p-1.5 hover:bg-gray-100 rounded-full bg-white shadow-sm border border-gray-200 text-blue-600 hover:text-blue-700 transition-all duration-200'
                                onClick={e => {
                                  e.stopPropagation()
                                  handleDowloadFile(file)
                                }}
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={index}
                          className={`${getAttachmentCardClass(isOwn)} overflow-hidden relative`}
                        >
                          <SelectFileItem
                            file={file}
                            truncateFileName={true}
                            isCandelete={false}
                            onSelectFile={file => handleOnSelectFile(file)}
                            isBorder={false}
                          />
                          <button
                            className='absolute right-2 bottom-7 p-1.5 hover:bg-gray-100 rounded-full bg-white shadow-sm border border-gray-200 text-blue-600 hover:text-blue-700 transition-all duration-200'
                            onClick={e => {
                              e.stopPropagation()
                              handleDowloadFile(file)
                            }}
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className={getTimestampClass(isOwn)}>
            {formatMessageTime(message.timestamp)}
          </div>
          {/* Render seen by avatars for own messages */}
          {renderSeenByAvatars()}
        </div>
      </div>
      {/* Add unread message separator line if this is the first unread message */}
      {!isRead && lastReadMessageId === message.id && (
        <div className='flex items-center my-4 px-4'>
          <div className='flex-grow border-t border-gray-300'></div>
          <div className='mx-4 flex items-center'>
            <div className='w-2 h-2 rounded-full bg-blue-500 mr-2'></div>
            <span className='text-xs font-medium text-blue-500'>
              Tin nhắn chưa đọc
            </span>
          </div>
          <div className='flex-grow border-t border-gray-300'></div>
        </div>
      )}
      {/* File Viewer Modal - rendered via Portal to avoid z-index issues */}
      {typeof window !== 'undefined' && fileViewer && createPortal(fileViewer, document.body)}
    </div>
  )
}
export default memo(ChatPopupMessageItem)
