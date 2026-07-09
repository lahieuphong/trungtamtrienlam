const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'svg',
  'tiff'
]

const DOCUMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'rtf',
  'odt'
]

export const isImageFile = filename => {
  const extension = getExtension(filename)
  return Boolean(extension && IMAGE_EXTENSIONS.includes(extension))
}

export const isDocumentFile = filename => {
  const extension = getExtension(filename)
  return Boolean(extension && DOCUMENT_EXTENSIONS.includes(extension))
}

export const aggregateChatAttachments = messages => {
  const photos = []
  const documents = []
  const links = []
  const seenFiles = new Set()
  const seenLinks = new Set()

  ;(messages || []).forEach(message => {
    const createdDate = getMessageDate(message)

    getMessageFiles(message).forEach(file => {
      const normalized = normalizeFile(file, createdDate)
      if (!normalized.file) return

      const fileKey = normalized.id || normalized.file
      if (seenFiles.has(fileKey)) return
      seenFiles.add(fileKey)

      const fileName = normalized.name || normalized.file
      if (isImageFile(fileName) || isImageFile(normalized.file)) {
        photos.push(normalized)
        return
      }

      documents.push(normalized)
    })

    getMessageLinks(message).forEach(link => {
      const normalized = normalizeLink(link, createdDate)
      if (!normalized.file) return

      const linkKey = normalized.file
      if (seenLinks.has(linkKey)) return
      seenLinks.add(linkKey)
      links.push(normalized)
    })
  })

  return { photos, documents, links }
}

const getExtension = filename => {
  const value = String(filename || '').split('?')[0].split('#')[0]
  const lastPart = value.split('/').pop() || ''
  const extension = lastPart.includes('.') ? lastPart.split('.').pop() : ''
  return extension.toLowerCase()
}

const getMessageDate = message =>
  message?.createdDate ||
  message?.CreatedDate ||
  message?.timestamp ||
  message?.createdAt ||
  new Date().toISOString()

const getMessageFiles = message => {
  if (Array.isArray(message?.files)) return message.files

  return safeParseList(
    message?.chatFiles ||
      message?.ChatFiles ||
      message?.Files ||
      message?.files ||
      ''
  )
}

const getMessageLinks = message => {
  const links = [
    ...safeParseList(
      message?.chatLinks ||
        message?.ChatLinks ||
        message?.links ||
        message?.Links ||
        ''
    ),
    ...extractUrls(message?.content || message?.Content || '')
  ]

  return links
}

const safeParseList = value => {
  if (!value) return []
  if (Array.isArray(value)) return value

  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const extractUrls = text => {
  if (!text || typeof text !== 'string') return []
  return text.match(/https?:\/\/[^\s<>"')]+/g) || []
}

const normalizeFile = (file, createdDate) => {
  if (!file) return {}

  const filePath =
    file.file ||
    file.File ||
    file.url ||
    file.Url ||
    file.path ||
    file.Path ||
    ''
  const fileName =
    file.name ||
    file.fileName ||
    file.FileName ||
    file.fullName ||
    file.FullName ||
    getNameFromPath(filePath)
  const extension =
    file.extension || file.Extension || getExtension(fileName || filePath)

  return {
    ...file,
    id: file.id || file.ID || filePath,
    name: fileName,
    fullName: file.fullName || file.FullName || fileName,
    file: filePath,
    url: file.url || file.Url || filePath,
    extension,
    type: file.type || (extension ? `file/${extension}` : ''),
    size: file.size || file.Size || 0,
    createdDate: file.createdDate || file.CreatedDate || createdDate
  }
}

const normalizeLink = (link, createdDate) => {
  const value =
    typeof link === 'string'
      ? link
      : link?.file || link?.File || link?.url || link?.Url || link?.link || link?.Link || ''

  return {
    id: typeof link === 'object' ? link.id || link.ID || value : value,
    file: value,
    url: value,
    createdDate:
      typeof link === 'object'
        ? link.createdDate || link.CreatedDate || createdDate
        : createdDate
  }
}

const getNameFromPath = path => {
  const value = String(path || '').split('?')[0].split('#')[0]
  return decodeURIComponent(value.split('/').pop() || value)
}
