const getNameFromPath = path => {
  const value = String(path || '').split('?')[0].split('#')[0]
  const name = value.split('/').pop() || value

  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

const getExtension = value => {
  const cleanValue = String(value || '').split('?')[0].split('#')[0]
  const cleanName = cleanValue.split('/').pop() || cleanValue
  const extension = cleanName.includes('.') ? cleanName.split('.').pop() : cleanName

  return String(extension || '').replace(/^\./, '').toLowerCase()
}

const getLocalPreviewUrl = file => {
  if (file?.previewUrl || file?.objectUrl || file?.localUrl) {
    return file.previewUrl || file.objectUrl || file.localUrl
  }

  if (typeof URL !== 'undefined' && typeof Blob !== 'undefined' && file instanceof Blob) {
    return URL.createObjectURL(file)
  }

  return ''
}

const getFilePath = file =>
  file?.file ||
  file?.File ||
  file?.url ||
  file?.Url ||
  file?.path ||
  file?.Path ||
  file?.link ||
  file?.Link ||
  ''

export const normalizeChatFile = (file, index = 0) => {
  if (!file) return null

  const originalFilePath = getFilePath(file)
  const previewUrl = getLocalPreviewUrl(file)
  const filePath = originalFilePath || previewUrl
  const fileName =
    file.FileName ||
    file.fileName ||
    file.name ||
    file.Name ||
    file.fullName ||
    file.FullName ||
    getNameFromPath(filePath) ||
    `File ${index + 1}`
  const extension =
    getExtension(file.Extension || file.extension) ||
    getExtension(fileName) ||
    getExtension(filePath)
  const type =
    file.type ||
    file.Type ||
    (extension ? `file/${extension}` : 'application/octet-stream')

  return {
    ...file,
    id: file.ID || file.id || filePath || `${fileName}-${index}`,
    ID: file.ID || file.id || filePath || `${fileName}-${index}`,
    name: fileName,
    Name: fileName,
    fileName,
    FileName: fileName,
    file: filePath,
    File: filePath,
    path: file.path || file.Path || filePath,
    previewUrl,
    extension,
    Extension: extension,
    type,
    Type: type,
    size: file.Size ?? file.size ?? file.fileSize ?? file.FileSize ?? '',
    Size: file.Size ?? file.size ?? file.fileSize ?? file.FileSize ?? ''
  }
}

export const normalizeChatFiles = files =>
  (Array.isArray(files) ? files : [])
    .map((file, index) => normalizeChatFile(file, index))
    .filter(Boolean)

export const getChatFileDisplayName = file =>
  file?.name ||
  file?.fileName ||
  file?.FileName ||
  file?.Name ||
  getNameFromPath(getFilePath(file))

export const getChatFileIdentity = file => {
  const name = getChatFileDisplayName(file)
  const path = getFilePath(file)
  const extension = file?.extension || file?.Extension || getExtension(name) || getExtension(path)
  const type = file?.type || file?.Type

  return [name, path, extension, type].filter(Boolean).join('.')
}
