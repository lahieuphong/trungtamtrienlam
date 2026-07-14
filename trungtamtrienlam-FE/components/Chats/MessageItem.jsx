import React, { useState, useEffect, useContext } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  Paperclip,
  Download,
  ArrowUpCircle,
  NotebookIcon,
  PinIcon,
  Vote,
  Bell,
  X,
  RotateCcw
} from 'lucide-react'
import PollContent from './PollContent'
import AvatarWithFrame from '../avatars/avatarFrame'
import MarkdownViewer from '@/components/Chats/MarkDownViewer'
import SelectFileItem from '../files/SelectFileItem'
import NoteModal from './NoteModal'
import PollModal from './PollModal'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import ProgressContext from '@/contexts/ProgressContext'
import ReminderDetailModal from '@/components/Chats/ReminderModel'
import ReminderCard from '@/components/Chats/ReminderCard'
import PdfConverter from '@/components/converPDF/PdfConverter'
import OnlyOfficeComponent, {
  getTypeOnlyOffice
} from '../onlyOffices/OnlyOfficeComponent'
import RenderFileToken from '../controls/renderFileTokens/RenderFileToken'
import { OnlyOfficeConstants } from '@/constants/configConstants'
import { Modal } from '@/components/ui/modal'
import UniversalFilePreviewModal from '../files/UniversalFilePreviewModal'
import { FileHelpers } from '@/helpers/fileHelpers'
import { ApiConstants } from '@/constants/apiConstants'
import { v4 } from 'uuid'
import { FolderConstants } from '@/constants/dataConstants'
import { isCurrentUserMessage } from '@/helpers/chatMessageHelpers'
import { isReminderForUser } from './reminderUserList'
import { getChatFileDisplayName, getChatFileIdentity } from '@/helpers/chatFileHelpers'

const CONTEXT_MENU_WIDTH = 208
const CONTEXT_MENU_HEIGHT = 120
const CONTEXT_MENU_PADDING = 8

const renderSystemEventText = value => {
  const text = String(value || '').trim()
  if (!text) return ''

  const bold = (content, key) =>
    content ? (
      <span key={key} className='font-semibold text-gray-800'>
        {content}
      </span>
    ) : null

  const normal = (content, key) => (content ? <React.Fragment key={key}>{content}</React.Fragment> : null)
  const isMeaningfulTail = tail => {
    const normalized = String(tail || '').trim().toLowerCase()
    return Boolean(normalized && normalized !== 'mới')
  }

  const splitByPhrase = phrase => {
    const index = text.indexOf(phrase)
    if (index <= 0) return null

    return {
      before: text.slice(0, index).trim(),
      after: text.slice(index + phrase.length).trim()
    }
  }

  const actorOnly = phrase => {
    const parts = splitByPhrase(phrase)
    if (!parts) return null
    return [bold(parts.before, 'actor'), normal(phrase, 'phrase'), normal(parts.after ? ` ${parts.after}` : '', 'after')]
  }

  const actorAndTarget = (phrase, tailPhrase) => {
    const parts = splitByPhrase(phrase)
    if (!parts) return null

    const tailIndex = parts.after.indexOf(tailPhrase)
    if (tailIndex < 0) return null


    const target = parts.after.slice(0, tailIndex).trim()
    const rest = parts.after.slice(tailIndex)
    return [bold(parts.before, 'actor'), normal(phrase, 'phrase'), bold(target, 'target'), normal(rest, 'tail')]
  }

  const actorAndOptionalTail = phrase => {
    const parts = splitByPhrase(phrase)
    if (!parts) return null

    return [
      bold(parts.before, 'actor'),
      normal(phrase, 'phrase'),
      isMeaningfulTail(parts.after) ? bold(parts.after, 'tail') : normal(parts.after, 'tail')
    ]
  }

  const actorReminder = () => {
    const phrase = ' đã tạo nhắc hẹn '
    const parts = splitByPhrase(phrase)
    if (!parts) return null

    const timePhrase = ' vào '
    const timeIndex = parts.after.indexOf(timePhrase)
    if (timeIndex < 0) return actorAndOptionalTail(phrase)

    const reminderTitle = parts.after.slice(0, timeIndex).trim()
    const timeText = parts.after.slice(timeIndex)
    return [
      bold(parts.before, 'actor'),
      normal(phrase, 'phrase'),
      isMeaningfulTail(reminderTitle) ? bold(reminderTitle, 'reminder') : normal(reminderTitle, 'reminder'),
      normal(timeText, 'time')
    ]
  }

  if (text.startsWith('Nhắc hẹn:')) {
    const reminderText = text.slice('Nhắc hẹn:'.length).trim()
    return [normal('Nhắc hẹn: ', 'label'), bold(reminderText, 'reminder')]
  }

  return (
    actorAndTarget(' đã bổ nhiệm ', ' thành trưởng nhóm mới') ||
    actorAndTarget(' đã bổ nhiệm ', ' thành phó nhóm') ||
    actorAndTarget(' đã xóa ', ' khỏi nhóm') ||
    actorAndOptionalTail(' đã tham gia bình chọn ') ||
    actorOnly(' xác nhận:') ||
    actorOnly(' đã được thêm vào nhóm') ||
    actorAndOptionalTail(' đã tạo bình chọn ') ||
    actorAndOptionalTail(' đã tạo ghi chú ') ||
    actorOnly(' đã cập nhật ghi chú') ||
    actorReminder() ||
    actorOnly(' đã rời nhóm') ||
    text
  )
}

export default function MessageItem ({
  message,
  isAI,
  onRecallMessage,
  ListUsers,
  onUpdateNote,
  polls = [],
  onVote,
  handleAddNewOption,
  onReply,
  isRead = false,
  onMarkAsRead = null, // Add callback to mark message as read,
  reminders = [],
  onEditReminder,
  onJoinReminder,
  onDeclineReminder,
  onPinMessage,
  onUnpinMessage,
  onScrollToMessage,
  seenByUsers = null
}) {
  const { userInfo } = useLoadLocalStorage()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectFile, setSelectFile] = useState(null)
  const [showFileViewerModal, setShowFileViewerModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState(null)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  )
  const progressContext = useContext(ProgressContext)
  const isOwn = isCurrentUserMessage(message, userInfo)
  const messageType = Number(
    message?.messageType ?? message?.MessageType ?? message?.message
  )
  const eventType = Number(message?.eventType ?? message?.EventType)
  const reminderUserList =
    message?.ListUserJoinReminder ??
    message?.listUserJoinRemind ??
    message?.listUserJoinReminder ??
    []
  const [showReminderModal, setShowReminderModal] = useState(false)

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

    return users.find(user => {
      if (!user) return false

      return [
        user.id,
        user.ID,
        user.userID,
        user.UserID,
        user.value,
        user.Value
      ]
        .map(normalizeUserId)
        .some(value => value === lookup)
    })
  }

  const getUserDisplayName = (userId, isCurrentUser = false) => {
    if (isCurrentUser) return 'Bạn'

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

  const getFileType = file => {
    const fileName = typeof file === 'string'
      ? file
      : [
          file?.type,
          file?.Type,
          file?.name,
          file?.Name,
          file?.fileName,
          file?.FileName,
          file?.extension,
          file?.Extension,
          file?.file,
          file?.File,
          file?.path,
          file?.Path
        ]
          .filter(Boolean)
          .join('.')

    if (!fileName) {
      return { isPdf: false, isWord: false, isSupported: false, isImage: false, isVideo: false }
    }

    const isPdf = FileHelpers.isFilePdf(fileName)
    const isWord =
      FileHelpers.isFileDocDocument(fileName) ||
      FileHelpers.isFileDocxDocument(fileName)
    const isImage = /(^|\.)image\//i.test(fileName) || FileHelpers.isFileImage(fileName) || /\.(jpg|jpeg|png|gif|bmp|webp|jfif|svg|tif|tiff|ico|avif|heic|heif|apng|arw|dng)(\?|#|$)/i.test(fileName)
    const isVideo = /(^|\.)video\//i.test(fileName) || FileHelpers.isFileVideo(fileName) || /\.(mp4|mov|webm|mkv|avi|m4v)(\?|#|$)/i.test(fileName)
    const isSupported =
      isPdf ||
      isWord ||
      FileHelpers.isFileExcelDocument(fileName) ||
      FileHelpers.isFileExcelxDocument(fileName) ||
      FileHelpers.isFilePowerPointDocument(fileName) ||
      FileHelpers.isFilePowerPointxDocument(fileName) ||
      FileHelpers.isFileTxtDocument(fileName) ||
      isImage ||
      isVideo
    return { isPdf, isWord, isSupported, isImage, isVideo }
  }

  // Format thời gian hiển thị
  const formatReminderTime = dateTime => {
    if (!dateTime) return ''

    const date = new Date(dateTime)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const reminderDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )

    const timeString = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    if (reminderDate.getTime() === today.getTime()) {
      return `Hôm nay lúc ${timeString}`
    } else if (
      reminderDate.getTime() ===
      today.getTime() + 24 * 60 * 60 * 1000
    ) {
      return `Ngày mai lúc ${timeString}`
    } else {
      const dateString = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      return `${dateString} lúc ${timeString}`
    }
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
  const selectedFilePath = selectFile?.file || selectFile?.File
  const selectedFileName = getChatFileDisplayName(selectFile)
  const selectedFileKey = getChatFileIdentity(selectFile) || selectedFilePath || selectedFileName || selectFile?.id || 'file'
  const onlyOfficeType = getTypeOnlyOffice(getChatFileIdentity(selectFile))
  const renderFileViewer = () => {
    if (!selectFile || !showFileViewerModal) return null
    const selectedFileType = getFileType(selectFile)
    const fileName = selectedFileName

    if (selectedFileType?.isPdf) {
      return (
        <Modal
          onClose={onClosePreviewFile}
          isOpen={showFileViewerModal}
          size='full'
        >
          <RenderFileToken
            key={`pdf-${selectFile?.id || selectFile?.file}-${Date.now()}`}
            isPrivate={true}
            pathFile={selectedFilePath}
            Component={({ src }) => (
              <PdfConverter
                key={`pdf-converter-${
                  selectFile?.id || selectFile?.file
                }-${Date.now()}`}
                className='w-full h-[85vh] rounded-lg shadow-lg border border-gray-200 bg-white'
                fileUrl={src}
                fileName={fileName}
                title={fileName}
                uniqueKey={`pdf-${
                  selectFile?.id || selectFile?.file
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
          size='full'
        >
          <RenderFileToken
            key={`office-${selectFile?.id || selectFile?.file}-${Date.now()}`}
            isPrivate={true}
            pathFile={selectedFilePath}
            Component={({ src }) => (
              <OnlyOfficeComponent
                key={`office-${
                  selectFile?.id || selectFile?.file
                }-${Date.now()}`}
                className='h-[85vh] !w-[100%]'
                widthContent='100%'
                heightContent='100%'
                fileType={onlyOfficeType.type}
                documentType={onlyOfficeType.documentType}
                uniqueKey={`office-${
                  selectFile?.id || selectFile?.file
                }-${Date.now()}`}
                mode={OnlyOfficeConstants.modes.view}
                title={fileName}
                fileUrl={src}
                callbackUrl={
                  ApiConstants.onlyOfficeServerUrlCallBack +
                  `?savePath=${selectedFilePath}&isPrivate=true`
                }
              />
            )}
          />
        </Modal>
      )
    } else if (selectedFileType?.isImage) {
      return (
        <UniversalFilePreviewModal
          key={`preview-${selectedFileKey}`}
          file={selectFile}
          onClose={onClosePreviewFile}
        />
      )
    }

    return (
      <UniversalFilePreviewModal
        key={`preview-${selectedFileKey}`}
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
      return null
    }


    return (
      <div className='chat-seen-avatars mt-1 flex justify-end pr-1'>
        <div className='chat-seen-avatar-list flex -space-x-1'>
          {uniqueUsers.slice(0, 3).map((user, index) => {
            const userId = user.userID || user.UserID || user.id || user.ID
            const avatar = user.avatar || user.Avatar
            const fullName = user.fullName || user.FullName || user.name || user.Name

            return (
              <div
                key={`${userId}-${index}`}
                className='chat-seen-avatar h-[18px] w-[18px] rounded-full'
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <AvatarWithFrame
                  avatarPath={avatar}
                  altAvatar={fullName || userId}
                  size={18}
                />
              </div>
            )
          })}
          {uniqueUsers.length > 3 && (
            <div
              className='chat-seen-avatar w-[18px] h-[18px] bg-gray-200 border border-white rounded-full flex items-center justify-center text-[9px] font-medium text-gray-600'
              style={{ animationDelay: `${Math.min(uniqueUsers.length, 3) * 35}ms` }}
            >
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

  const getContextMenuPosition = e => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : windowWidth
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
    let x = e.clientX
    let y = e.clientY

    if (viewportWidth && x + CONTEXT_MENU_WIDTH + CONTEXT_MENU_PADDING > viewportWidth) {
      x = Math.max(CONTEXT_MENU_PADDING, viewportWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_PADDING)
    }

    if (viewportHeight && y + CONTEXT_MENU_HEIGHT + CONTEXT_MENU_PADDING > viewportHeight) {
      y = Math.max(CONTEXT_MENU_PADDING, viewportHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_PADDING)
    }

    return { x, y }
  }

  const shouldIgnoreMessageMenu = target =>
    Boolean(
      target?.closest?.(
        '.context-menu, button, a, input, textarea, select, [role="button"], [data-ignore-message-menu]'
      )
    )

  const openMessageMenu = e => {
    e.preventDefault()
    e.stopPropagation()

    // Chi hien thi context menu cho tin nhan cua minh hoac khi co quyen
    if (isOwn || message.sender !== 'me') {
      setContextMenuPosition(getContextMenuPosition(e))
      setShowContextMenu(true)
    }
  }

  const handleContextMenu = e => {
    openMessageMenu(e)
  }

  const handleMessageClick = e => {
    if (shouldIgnoreMessageMenu(e.target)) return
    openMessageMenu(e)
  }

  useEffect(() => {
    const handleClickOutside = event => {
      if (!event.target.closest('.context-menu')) setShowContextMenu(false)
    }
    const handleCloseFloatingMenu = () => setShowContextMenu(false)

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('scroll', handleCloseFloatingMenu, true)
      window.addEventListener('resize', handleCloseFloatingMenu)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('scroll', handleCloseFloatingMenu, true)
      window.removeEventListener('resize', handleCloseFloatingMenu)
    }
  }, [showContextMenu])

  const handleForwardMessage = () => {
    setShowContextMenu(false)
  }

  const handleReplyMessage = () => {
    if (typeof onReply === 'function') {
      onReply(message)
    }
    setShowContextMenu(false)
  }

  const handlePinMessage = () => {
    if (typeof onPinMessage === 'function') {
      onPinMessage(message.id)
    }
    setShowContextMenu(false)
  }

  const handleUnpinMessage = () => {
    if (typeof onUnpinMessage === 'function') {
      onUnpinMessage({ messageID: [message.id], eventID: [] })
    }
    setShowContextMenu(false)
  }

  const handleRecallMessage = () => {
    onRecallMessage?.(message.id)
    setShowContextMenu(false)
  }

  const handleOnSelectFile = file => {
    const uploaderName =
      file?.fullName ||
      file?.FullName ||
      file?.createdByName ||
      file?.CreatedByName ||
      file?.uploadedByName ||
      file?.UploadedByName ||
      file?.senderName ||
      file?.SenderName ||
      message?.senderName ||
      message?.SenderName ||
      message?.sender

    setSelectFile({
      ...file,
      fullName: uploaderName,
      senderName: uploaderName
    })
    setShowFileViewerModal(true)
  }

  const onClosePreviewFile = () => {
    setShowFileViewerModal(false)
    setSelectFile(null)
  }

  const handleVote = voteData => {
    onVote?.(voteData)
  }

  const handleUpdateNote = noteData => {
    onUpdateNote?.(noteData)
  }

  const handleDowloadFile = file => {
    if (file) {
      // Kiểm tra nếu là file zip
      const fileName = getChatFileDisplayName(file) || ''
      const filePath = file.file || file.File
      const fileExtension =
        file.Extension || file.extension || fileName.split('.').pop().toLowerCase()
      const zipId = v4().toString()
      if (fileExtension === 'zip') {
        // Xử lý đặc biệt cho file zip
        progressContext.addProgress({
          file,
          path: filePath,
          isPrivate: true,
          id: zipId,
          downloadType: FolderConstants.downloadTypes.zip,
          zip: {
            items: file,
            zipId
          },
          name: fileName || 'file.zip'
        })
      } else {
        // Xử lý cho file thường
        progressContext.addProgress({
          file,
          path: filePath,
          isPrivate: true,
          name: fileName || 'file'
        })
      }
    }
  }

  if (messageType === 5) {
    let displayContent = message.content

    if (
      message.content &&
      (message.content.includes('đã bổ nhiệm') ||
        message.content.includes('thành trưởng nhóm'))
    ) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []

      if (allUserIds.length >= 2) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const targetId = allUserIds[1].replace(/{|}/g, '')
        const isActorCurrentUser =
          userInfo && normalizeUserId(actorId) === normalizeUserId(userInfo.userID)
        const isTargetCurrentUser =
          userInfo && normalizeUserId(targetId) === normalizeUserId(userInfo.userID)

        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)

        if (message.content.includes('thành trưởng nhóm mới')) {
          displayContent = `${actorName} đã bổ nhiệm ${targetName} thành trưởng nhóm mới`
        } else if (message.content.includes('đã bổ nhiệm')) {
          displayContent = `${actorName} đã bổ nhiệm ${targetName} thành phó nhóm`
        }

        return (
          <div key={message.id} className='flex justify-center my-1.5 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {renderSystemEventText(displayContent)}
            </div>
          </div>
        )
      }
    }

    if (
      message.content &&
      (message.content.includes('đã xóa') ||
        message.content.includes('khỏi nhóm'))
    ) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []

      if (allUserIds.length >= 2) {
        const actorId = allUserIds[0].replace(/{|}/g, '')
        const targetId = allUserIds[1].replace(/{|}/g, '')
        const isActorCurrentUser =
          userInfo && normalizeUserId(actorId) === normalizeUserId(userInfo.userID)
        const isTargetCurrentUser =
          userInfo && normalizeUserId(targetId) === normalizeUserId(userInfo.userID)

        const actorName = getUserDisplayName(actorId, isActorCurrentUser)
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)

        if (
          message.content.includes('đã xóa') ||
          message.content.includes('khỏi nhóm')
        ) {
          displayContent = `${actorName} đã xóa ${targetName} khỏi nhóm`
        }
        return (
          <div key={message.id} className='flex justify-center my-1.5 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {renderSystemEventText(displayContent)}
            </div>
          </div>
        )
      }
    }

    // Xử lý message "xác nhận: Tham gia"
    if (
      message.content &&
      message.content.includes('xác nhận:') &&
      message.content.includes('Tham gia')
    ) {
      let displayContent = message.content
      
      // Tách tên user từ content (trước cụm "xác nhận:")
      const beforeConfirmText = message.content.split('xác nhận:')[0].trim()
      
      if (beforeConfirmText) {
        // Kiểm tra xem có phải user hiện tại không
        const isCurrentUser = userInfo && userInfo.fullName && beforeConfirmText === userInfo.fullName
        
        if (isCurrentUser) {
          displayContent = message.content.replace(beforeConfirmText, 'Bạn')
        } else {
          // Kiểm tra trong ListUsers để xác nhận
          let foundUser = null
          if (Array.isArray(ListUsers)) {
            foundUser = ListUsers.find(user => user && user.fullName === beforeConfirmText)
          } else if (typeof ListUsers === 'object' && ListUsers !== null) {
            if (ListUsers.users && Array.isArray(ListUsers.users)) {
              foundUser = ListUsers.users.find(user => user && user.fullName === beforeConfirmText)
            }
          }
          
          // Nếu tìm thấy user trong ListUsers thì giữ nguyên tên, nếu không tìm thấy thì cũng giữ nguyên
          displayContent = message.content
        }
      }

      return (
        <div key={message.id} className='flex justify-center my-1.5 px-4'>
          <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
            {renderSystemEventText(displayContent)}
          </div>
        </div>
      )
    }

    // Xử lý message "đã tham gia bình chọn"
    if (
      message.content &&
      message.content.includes('đã tham gia bình chọn')
    ) {
      let displayContent = message.content
      
      // Tách tên user từ content (trước cụm "đã tham gia bình chọn")
      const beforeVoteText = message.content.split('đã tham gia bình chọn')[0].trim()
      
      if (beforeVoteText) {
        // Kiểm tra xem có phải user hiện tại không
        const isCurrentUser = userInfo && userInfo.fullName && beforeVoteText === userInfo.fullName
        
        if (isCurrentUser) {
          displayContent = message.content.replace(beforeVoteText, 'Bạn')
        } else {
          // Kiểm tra trong ListUsers để xác nhận
          let foundUser = null
          if (Array.isArray(ListUsers)) {
            foundUser = ListUsers.find(user => user && user.fullName === beforeVoteText)
          } else if (typeof ListUsers === 'object' && ListUsers !== null) {
            if (ListUsers.users && Array.isArray(ListUsers.users)) {
              foundUser = ListUsers.users.find(user => user && user.fullName === beforeVoteText)
            }
          }
          
          // Nếu tìm thấy user trong ListUsers thì giữ nguyên tên, nếu không tìm thấy thì cũng giữ nguyên
          displayContent = message.content
        }
      }

      return (
        <div key={message.id} className='flex justify-center my-1.5 px-4'>
          <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
            {renderSystemEventText(displayContent)}
          </div>
        </div>
      )
    }

    // Xử lý message "xác nhận: Tham gia" hoặc "xác nhận: Không tham gia"
    if (
      message.content &&
      message.content.includes('xác nhận:') &&
      (message.content.includes('Tham gia') || message.content.includes('Không tham gia'))
    ) {
      let displayContent = message.content
      
      // Tách tên user từ content (trước cụm "xác nhận:")
      const beforeConfirmText = message.content.split('xác nhận:')[0].trim()
      
      if (beforeConfirmText) {
        // Kiểm tra xem có phải user hiện tại không
        const isCurrentUser = userInfo && userInfo.fullName && beforeConfirmText === userInfo.fullName
        
        if (isCurrentUser) {
          displayContent = message.content.replace(beforeConfirmText, 'Bạn')
        } else {
          // Kiểm tra trong ListUsers để xác nhận
          let foundUser = null
          if (Array.isArray(ListUsers)) {
            foundUser = ListUsers.find(user => user && user.fullName === beforeConfirmText)
          } else if (typeof ListUsers === 'object' && ListUsers !== null) {
            if (ListUsers.users && Array.isArray(ListUsers.users)) {
              foundUser = ListUsers.users.find(user => user && user.fullName === beforeConfirmText)
            }
          }
          
          // Nếu tìm thấy user trong ListUsers thì giữ nguyên tên, nếu không tìm thấy thì cũng giữ nguyên
          displayContent = message.content
        }
      }

      return (
        <div key={message.id} className='flex justify-center my-1.5 px-4'>
          <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
            {renderSystemEventText(displayContent)}
          </div>
        </div>
      )
    }

    // Xử lý message "được thêm vào nhóm"
    if (
      message.content &&
      (message.content.includes('được thêm vào nhóm') ||
        message.content.includes('đã được thêm'))
    ) {
      const allUserIds = message.content.match(/{([^}]+)}/g) || []

      if (allUserIds.length >= 1) {
        const targetId = allUserIds[0].replace(/{|}/g, '')
        const isTargetCurrentUser =
          userInfo && normalizeUserId(targetId) === normalizeUserId(userInfo.userID)
        const targetName = getUserDisplayName(targetId, isTargetCurrentUser)

        displayContent = `${targetName} đã được thêm vào nhóm`

        return (
          <div key={message.id} className='flex justify-center my-1.5 px-4'>
            <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
              {renderSystemEventText(displayContent)}
            </div>
          </div>
        )
      }
    }

    if (
      eventType === 2 &&
      message.content &&
      message.content.toLowerCase().includes('tạo bình chọn')
    ) {
      let displayContent = message.content
      
      // Tách tên user từ content (trước cụm "đã tạo bình chọn")
      const beforeCreateText = message.content.split('đã tạo bình chọn')[0].trim()
      
      if (beforeCreateText) {
        // Kiểm tra xem có phải user hiện tại không
        const isCurrentUser = userInfo && userInfo.fullName && beforeCreateText === userInfo.fullName
        
        if (isCurrentUser) {
          displayContent = message.content.replace(beforeCreateText, 'Bạn')
        }
      } else {
        // Fallback cho trường hợp có userID trong {}
        const allUserIds = message.content.match(/{([^}]+)}/g) || []
        
        if (allUserIds.length > 0) {
          const actorId = allUserIds[0].replace(/{|}/g, '')
          const isActorCurrentUser = userInfo && actorId === userInfo.userID
          let actorUser = null

          if (Array.isArray(ListUsers)) {
            actorUser = ListUsers.find(user => user && user.id === actorId)
          } else if (typeof ListUsers === 'object' && ListUsers !== null) {
            if (ListUsers.users && Array.isArray(ListUsers.users)) {
              actorUser = ListUsers.users.find(
                user => user && user.id === actorId
              )
            }
          }
          let actorName = isActorCurrentUser
            ? 'Bạn'
            : actorUser?.fullName || actorId

          displayContent = `${actorName} đã tạo bình chọn mới`
        } else {
          displayContent = 'Đã tạo bình chọn mới'
        }
      }

      // Tìm poll phù hợp với message hiện tại
      const matchingPoll = polls.find(
        poll => String(poll.id) === String(message.eventID)
      )

      // Hiển thị thông báo và poll UI nếu có
      return (
        <>
          <div
            key={`notify-${message.id}`}
            className='flex justify-center my-1.5 px-4'
          >
            <div className='bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2'>
              <Vote size={16} className='text-blue-500' />
              <span className='text-sm text-gray-600'>
                {renderSystemEventText(displayContent)}
              </span>
              {/* <span
                className='ml-1.5 inline-block cursor-pointer text-blue-500 hover:underline'
                onClick={() => setShowPollModal(true)}
              >
                Xem
              </span> */}
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

    if (message.content && message.content.toLowerCase().includes('ghi chú')) {
      let displayContent = message.content
      
      // Tách tên user từ content (trước cụm "đã tạo ghi chú")
      const beforeNoteText = message.content.split('đã tạo ghi chú')[0].trim()
      
      if (beforeNoteText) {
        // Kiểm tra xem có phải user hiện tại không
        const isCurrentUser = userInfo && userInfo.fullName && beforeNoteText === userInfo.fullName
        
        if (isCurrentUser) {
          displayContent = message.content.replace(beforeNoteText, 'Bạn')
        }
      } else {
        // Fallback cho trường hợp có userID trong {}
        const allUserIds = message.content.match(/{([^}]+)}/g) || []
        
        if (allUserIds.length > 0) {
          const actorId = allUserIds[0].replace(/{|}/g, '')
          const isActorCurrentUser = userInfo && actorId === userInfo.userID
          let actorUser = null

          if (Array.isArray(ListUsers)) {
            actorUser = ListUsers.find(user => user && user.id === actorId)
          } else if (typeof ListUsers === 'object' && ListUsers !== null) {
            if (ListUsers.users && Array.isArray(ListUsers.users)) {
              actorUser = ListUsers.users.find(
                user => user && user.id === actorId
              )
            }
          }
          let actorName = isActorCurrentUser
            ? 'Bạn'
            : actorUser?.fullName || actorId

          displayContent = `${actorName} đã tạo ghi chú mới`
        } else {
          displayContent = 'Đã tạo ghi chú mới'
        }
      }

      return (
        <>
          <div key={message.id} className='flex justify-center my-1.5 px-4'>
            <div
              className={`bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2 ${
                message.isPin ? 'border border-blue-300' : ''
              }`}
            >
              {/* {message.isPin && (
                <Pin size={14} className='text-blue-500' fill='currentColor' />
              )} */}
              <NotebookIcon className='text-gray-500' size={16} />
              <span className='text-sm text-gray-600'>
                {renderSystemEventText(displayContent)}{' '}
                <span
                  className='ml-1.5 inline-block cursor-pointer text-blue-500 hover:underline'
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
      (eventType === 3 &&
        message.content &&
        message.content.toLowerCase().includes('nhắc hẹn') &&
        reminderUserList &&
        Array.isArray(reminderUserList) &&
        reminderUserList.length > 0) ||
      (typeof reminderUserList === 'string' &&
        reminderUserList.trim() !== '')
    ) {
      const isUserInReminderList = isReminderForUser(
        reminderUserList,
        userInfo
      )

      // Chỉ hiển thị thông báo nếu user nằm trong danh sách
      if (!isUserInReminderList) {
        return null
      }

      // Tìm reminder phù hợp với message hiện tại
      const matchingReminder = reminders.find(
        reminder => String(reminder.id) === String(message.eventID)
      )

      const displayContent = `Nhắc hẹn: ${
        matchingReminder?.remindContent || message.content
      }`

      return (
        <>
          {/* Thông báo nhắc hẹn selective */}
          <div key={message.id} className='flex justify-center my-1.5 px-4'>
            <div
              className={`bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-4 flex items-center gap-2 ${
                message.isPin ? 'border border-yellow-300' : ''
              }`}
            >
              <Bell className='text-yellow-600' size={16} />
              <span className='text-sm text-yellow-800'>
                {renderSystemEventText(displayContent)}{' '}
                <span
                  className='ml-1.5 inline-block cursor-pointer text-blue-500 hover:underline'
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
    if (
      eventType === 3 &&
      message.content &&
      message.content.toLowerCase().includes('nhắc hẹn')
    ) {
      let displayContent = message.content

      // Tìm reminder phù hợp với message hiện tại
      const matchingReminder = reminders.find(
        reminder => String(reminder.id) === String(message.eventID)
      )

      // Tách tên user từ content (trước cụm "đã tạo nhắc hẹn")
      const beforeReminderText = message.content.split('đã tạo nhắc hẹn')[0].trim()
      
      if (beforeReminderText) {
        // Kiểm tra xem có phải user hiện tại không
        const isCurrentUser = userInfo && userInfo.fullName && beforeReminderText === userInfo.fullName
        
        if (isCurrentUser) {
          displayContent = `Bạn đã tạo nhắc hẹn ${
            matchingReminder?.remindContent || 'mới'
          } vào ${formatReminderTime(
            matchingReminder?.remindTime || matchingReminder?.remindTime
          )}`
        } else {
          displayContent = `${beforeReminderText} đã tạo nhắc hẹn ${
            matchingReminder?.remindContent || 'mới'
          } vào ${formatReminderTime(
            matchingReminder?.remindTime || matchingReminder?.remindTime
          )}`
        }
      } else {
        // Fallback cho trường hợp có userID trong {}
        const allUserIds = message.content.match(/{([^}]+)}/g) || []
        
        if (allUserIds.length > 0) {
          const actorId = allUserIds[0].replace(/{|}/g, '')
          const isActorCurrentUser = userInfo && actorId === userInfo.userID
          let actorUser = null

          if (Array.isArray(ListUsers)) {
            actorUser = ListUsers.find(user => user && user.id === actorId)
          } else if (typeof ListUsers === 'object' && ListUsers !== null) {
            if (ListUsers.users && Array.isArray(ListUsers.users)) {
              actorUser = ListUsers.users.find(
                user => user && user.id === actorId
              )
            }
          }
          let actorName = isActorCurrentUser
            ? 'Bạn'
            : actorUser?.fullName || actorId

          displayContent = `${actorName} đã tạo nhắc hẹn ${
            matchingReminder?.remindContent || 'mới'
          } vào ${formatReminderTime(
            matchingReminder?.remindTime || matchingReminder?.remindTime
          )}`
        } else {
          displayContent = 'Đã tạo nhắc hẹn mới'
        }
      }

      return (
        <>
          {/* Thông báo tạo nhắc hẹn public */}
          <div key={message.id} className='flex justify-center my-1.5 px-4'>
            <div
              className={`bg-gray-100 rounded-full py-2 px-4 flex items-center gap-2 ${
                message.isPin ? 'border border-blue-300' : ''
              }`}
            >
              <Bell className='text-gray-500' size={16} />
              <span className='text-sm text-gray-600'>
                {renderSystemEventText(displayContent)}{' '}
                <span
                  className='ml-1.5 inline-block cursor-pointer text-blue-500 hover:underline'
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

    if (typeof message.content === 'string' && message.content.includes('{')) {
      displayContent = replaceUserPlaceholders(message.content)
    } else if (message.senderID && message.content.includes(message.senderID)) {
      const isCurrentUser = isCurrentUserMessage(message, userInfo)
      const displayName = isCurrentUser ? 'Bạn' : message.senderName
      displayContent = message.content.replace(message.senderID, displayName)
      displayContent = displayContent.replace(/[{}]/g, '')
    }

    return (
      <div key={message.id} className='flex justify-center my-1.5 px-4'>
        <div className='bg-gray-100 rounded-full py-1 px-4 text-sm text-gray-600'>
          {renderSystemEventText(displayContent)}
        </div>
      </div>
    )
  }

  if (message.isUnsend) {
    return (
      <div key={message.id} className='mb-4'>
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
          {!isOwn && (
            <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0'>
              <AvatarWithFrame
                avatarPath={message?.avatar}
                altAvatar={message?.sender || 'Avatar'}
                size={40}
              />
            </div>
          )}
          <div
            className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
              isOwn ? 'order-1' : ''
            }`}
          >
            {!isOwn && (
              <div className='text-xs text-gray-600 mb-1 ml-1'>
                {message.senderName}
              </div>
            )}
            <div
              className={`p-3 rounded-2xl ${
                isOwn ? 'bg-[#F0F5FF]' : 'bg-gray-100'
              } text-gray-500 italic text-sm`}
            >
              Tin nhắn đã được thu hồi
            </div>
            <div
              className={`text-xs text-gray-500 mt-1 ${
                isOwn ? 'text-right' : 'text-left'
              }`}
            >
              {formatMessageTime(message.createdDate)}
            </div>

            {renderSeenByAvatars()}
          </div>
        </div>
      </div>
    )
  }

  // Kiểm tra xem message có liên quan đến poll không (thông báo hoặc hiển thị poll)
  if (eventType === 2) {
    const matchingPoll = polls.find(
      poll => String(poll.id || poll.ID) === String(message.eventID)
    )

    return (
      <div className='w-full max-w-full overflow-hidden'>
        <PollContent
          poll={matchingPoll}
          handleVote={handleVote}
          handleAddNewOption={handleAddNewOption}
        />
      </div>
    )
  }

  // Component Context Menu
  const ContextMenu = () => {
    if (!showContextMenu) return null

    return createPortal(
      <div
        className='context-menu fixed bg-white shadow-lg rounded-lg py-1 z-[99999] border border-gray-200 w-52'
        style={{
          top: `${contextMenuPosition.y}px`,
          left: `${contextMenuPosition.x}px`,
          position: 'fixed',
          zIndex: 99999
        }}
        onClick={event => event.stopPropagation()}
        onContextMenu={event => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {/* <button
          onClick={handleForwardMessage}
          className='flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100'
        >
          <svg
            className='w-4 h-4 mr-2 text-blue-500'
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='m15 17-5-5 5-5'></path>
            <path d='M19 17v-3a4 4 0 0 0-4-4H5'></path>
          </svg>
          Chuyển tiếp tin nhắn
        </button> */}
        {message.isPin ? (
          <button
            onClick={handleUnpinMessage}
            className='flex items-center w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-gray-100'
          >
            <PinIcon className='mr-2' size={16} />
            Bỏ ghim tin nhắn
          </button>
        ) : (
          <button
            onClick={handlePinMessage}
            className='flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100'
          >
            <PinIcon className='mr-2' size={16} />
            Ghim tin nhắn
          </button>
        )}
        <button
          onClick={handleReplyMessage}
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
            onClick={handleRecallMessage}
            className='flex items-center w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-gray-100'
          >
            <RotateCcw className='mr-2 shrink-0' size={16} />
            Thu hồi tin nhắn
          </button>
        )}
      </div>,
      document.body
    )
  }

  // Normal message render
  // Message read status will be handled by IntersectionObserver in MessageList
  const fileViewer = renderFileViewer()
  const deliveryText = message.isFailed
    ? 'Kh\u00f4ng g\u1eedi \u0111\u01b0\u1ee3c'
    : message.isPending
    ? '\u0110ang g\u1eedi...'
    : formatMessageTime(message.timestamp)

  return (
    <div
      key={message.id}
      className={`mb-4 transition-all duration-200 ${message.isPending ? 'opacity-80 translate-y-[1px]' : 'opacity-100 translate-y-0'}`}
    >
      {showContextMenu && <ContextMenu />}
      <div
        className={`flex ${
          isOwn ? 'justify-end' : 'justify-start'
        } mb-2 message-item`}
        data-message-id={message.id}
        data-from={isOwn ? 'me' : 'other'}
      >
        {!isOwn && (
          <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0'>
            {isAI && !isOwn ? (
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
                avatarPath={message?.avatar}
                altAvatar={message?.sender || 'Avatar'}
                size={35}
              />
            )}
          </div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
            isOwn ? 'order-1' : ''
          }`}
        >
          {!isOwn && (
            <div className='text-xs text-gray-600 mb-1 ml-1'>
              {message.senderName}
            </div>
          )}

          {(message.isPin || message.IsPin) && (
            <div
              className={`mb-1 flex items-center gap-1 text-[11px] text-gray-500 ${
                isOwn ? 'justify-end mr-1' : 'ml-1'
              }`}
            >
              <PinIcon size={11} className='text-red-500' fill='currentColor' />
              <span>Đã ghim</span>
            </div>
          )}

          <div
            onClick={message.isPending ? undefined : handleMessageClick}
            onContextMenu={message.isPending ? undefined : handleContextMenu}
            className={`p-3 rounded-2xl transition-colors duration-200 ${message.isPending ? 'shadow-sm' : ''} ${
              isOwn
                ? 'bg-[#F0F5FF] text-[#1F1F1F] ml-auto'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {/* Reply indicator */}
            {message.replyToMessage && (
              <div
                className={`mb-2 border-l-2 pl-2 cursor-pointer rounded p-1 transition-colors ${
                  isOwn
                    ? 'border-[#597EF7] bg-white/70 hover:bg-white'
                    : 'border-blue-400 hover:bg-blue-50'
                }`}
                onClick={e => {
                  e.stopPropagation() // Prevent triggering parent events
                  if (onScrollToMessage && message.replyToMessage.id) {
                    onScrollToMessage(message.replyToMessage.id)
                  }
                }}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isOwn ? 'text-[#2F54EB]' : 'text-blue-600'
                  }`}
                >
                  Trả lời{' '}
                  {message.replyToMessage.senderName ||
                    (message.replyToMessage.sender === 'me'
                      ? 'chính mình'
                      : message.replyToMessage.sender)}
                </div>
                <div
                  className={`text-xs line-clamp-2 ${
                    isOwn ? 'text-[#1F1F1F] font-medium' : 'text-gray-600'
                  }`}
                >
                  {message.replyToMessage.content ||
                    (message.replyToMessage.files?.length > 0
                      ? '[Tệp đính kèm]'
                      : '')}
                </div>
              </div>
            )}
            {message.type === 'file' && !(message.files && message.files.length > 0) ? (
              <div className='flex items-center gap-3' data-ignore-message-menu>
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
                {/* <div>{message.content}</div> */}
                <MarkdownViewer
                  content={message.content}
                  className=''
                />

                {/* Hiển thị file đính kèm */}
                {message.files && message.files.length > 0 && (
                  <div className='mt-2 space-y-2' data-ignore-message-menu>
                    {message.files.map((file, index) => {
                      const fileType = getFileType(file)
                      const filePath = file.file || file.File
                      const fileName = getChatFileDisplayName(file)
                      if (fileType.isImage) {
                        return (
                          <div
                            key={index}
                            className={`${
                              isOwn ? 'bg-white text-black' : 'bg-gray-100'
                            } rounded-lg relative group`}
                          >
                            <RenderFileToken
                              pathFile={filePath}
                              isPrivate={true}
                              Component={({ src }) => (
                                <img
                                  src={src}
                                  alt={fileName || 'Image'}
                                  className='block max-h-[300px] max-w-full rounded-lg border border-gray-200 object-contain shadow-sm cursor-pointer hover:opacity-95 transition-opacity'
                                  onClick={() => handleOnSelectFile(file)}
                                  onError={e => {
                                    e.currentTarget.src = '/placeholder.svg'
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
                          className={`${
                            isOwn ? 'bg-white text-black' : 'bg-gray-100'
                          } rounded-lg overflow-hidden relative`}
                        >
                          <SelectFileItem
                            file={file}
                            isCandelete={false}
                            onSelectFile={file => () => {
                              handleOnSelectFile(file)
                            }}
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

          <div
            className={`text-xs text-gray-500 mt-1 ${
              isOwn ? 'text-right' : 'text-left'
            } flex items-center ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {deliveryText}

            {/* Read status indicators - only show for own messages */}
            {/* {isOwn && (
              <div className="flex items-center ml-2">
                {isRead ? (
                  <span className="text-xs text-blue-500 ml-1">Đã xem</span>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-1"></div>
                )}
              </div>
            )} */}
          </div>

          {/* Render seen by avatars for own messages */}
          {renderSeenByAvatars()}
        </div>
      </div>


      {/* File Viewer Modal - rendered via Portal to avoid z-index issues */}
      {typeof window !== 'undefined' && fileViewer && createPortal(fileViewer, document.body)}
    </div>
  )
}
