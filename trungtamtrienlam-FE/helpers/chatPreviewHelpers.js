import { ChatMessageConstants } from '../constants/chatConstants'
import { FileHelpers } from './fileHelpers'
import { getChatFileDisplayName, normalizeChatFiles } from './chatFileHelpers'

const ATTACHMENT_MESSAGE_TYPES = new Set([
  ChatMessageConstants.MessageType.ImageOrVideo,
  ChatMessageConstants.MessageType.File
])

const parseFileField = value => {
  if (!value) return []
  if (Array.isArray(value)) return normalizeChatFiles(value)
  if (typeof value === 'object') return normalizeChatFiles([value])

  const rawValue = String(value || '').trim()
  if (!rawValue || rawValue === 'null' || rawValue === '[]') return []

  try {
    const parsed = JSON.parse(rawValue)
    if (Array.isArray(parsed)) return normalizeChatFiles(parsed)
    if (parsed && typeof parsed === 'object') return normalizeChatFiles([parsed])
  } catch {
    const fileNameMatches = [...rawValue.matchAll(/"FileName"\s*:\s*"([^"]+)"/g)]
    const idMatches = [...rawValue.matchAll(/"ID"\s*:\s*"?([^",}]+)"?/g)]

    if (fileNameMatches.length > 0) {
      return normalizeChatFiles(
        fileNameMatches.map((match, index) => ({
          ID: idMatches[index]?.[1] || `${match[1]}-${index}`,
          FileName: match[1]
        }))
      )
    }
  }

  return []
}

export const getChatPreviewFiles = chat => {
  const fileSources = [
    chat?.lastFiles,
    chat?.LastFiles,
    chat?.lastMessageFiles,
    chat?.LastMessageFiles,
    chat?.chatFiles,
    chat?.ChatFiles,
    chat?.files,
    chat?.Files
  ]

  const files = []
  fileSources.forEach(source => {
    parseFileField(source).forEach(file => {
      const identity = [file.id, file.ID, file.file, file.File, file.FileName, file.fileName]
        .filter(Boolean)
        .join('|')

      if (!files.some(existing => {
        const existingIdentity = [existing.id, existing.ID, existing.file, existing.File, existing.FileName, existing.fileName]
          .filter(Boolean)
          .join('|')
        return existingIdentity && identity && existingIdentity === identity
      })) {
        files.push(file)
      }
    })
  })

  return files
}

const getMessageType = chat => Number(
  chat?.messageType ??
    chat?.MessageType ??
    chat?.lastMessageType ??
    chat?.LastMessageType ??
    0
)

export const hasChatAttachmentPreview = chat =>
  getChatPreviewFiles(chat).length > 0 || ATTACHMENT_MESSAGE_TYPES.has(getMessageType(chat))

const getFileKind = file => {
  const fileName = getChatFileDisplayName(file) || file?.extension || file?.Extension || file?.type || file?.Type || ''
  const type = String(file?.type || file?.Type || '').toLowerCase()

  if (type.startsWith('image/') || FileHelpers.isFileImage(fileName)) return 'image'
  if (type.startsWith('video/') || FileHelpers.isFileVideo(fileName)) return 'video'
  if (type.startsWith('audio/') || FileHelpers.isFileAudio(fileName)) return 'audio'
  if (FileHelpers.isFile3D(fileName)) return 'model3d'
  if (FileHelpers.isFilePdf(fileName)) return 'pdf'
  if (FileHelpers.isFileDocument(fileName)) return 'document'
  if (FileHelpers.checkValidFileZip(fileName)) return 'archive'
  return 'file'
}

const getAttachmentNoun = chat => {
  const files = getChatPreviewFiles(chat)
  if (files.length === 0) return 'tệp đính kèm'

  const kinds = files.map(getFileKind)
  const firstKind = kinds[0]
  const allSameKind = kinds.every(kind => kind === firstKind)

  if (files.length > 1) {
    if (allSameKind && firstKind === 'image') return `${files.length} ảnh`
    if (allSameKind && firstKind === 'video') return `${files.length} video`
    if (allSameKind && firstKind === 'audio') return `${files.length} âm thanh`
    if (allSameKind && firstKind === 'model3d') return `${files.length} mô hình 3D`
    return `${files.length} tệp đính kèm`
  }

  switch (firstKind) {
    case 'image':
      return 'ảnh'
    case 'video':
      return 'video'
    case 'audio':
      return 'âm thanh'
    case 'model3d':
      return 'mô hình 3D'
    case 'pdf':
      return 'PDF'
    case 'document':
      return 'tài liệu'
    case 'archive':
      return 'tệp nén'
    default:
      return 'tệp đính kèm'
  }
}

const buildAttachmentAction = chat => {
  const noun = getAttachmentNoun(chat)
  return /^\d+\s/.test(noun) ? `đã gửi ${noun}` : `đã gửi một ${noun}`
}

export const getChatAttachmentActionPreview = chat =>
  hasChatAttachmentPreview(chat) ? buildAttachmentAction(chat) : ''

export const formatChatListPreview = value => {
  if (value === null || value === undefined) return ''

  const text = String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  if (!text) return ''

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  return lines.length > 1 ? `${lines[0]}...` : lines[0]
}

export const getChatAttachmentPreview = (chat, { isOwn = false } = {}) => {
  const action = getChatAttachmentActionPreview(chat)
  if (!action) return ''

  return isOwn ? `Bạn ${action}` : action.charAt(0).toUpperCase() + action.slice(1)
}