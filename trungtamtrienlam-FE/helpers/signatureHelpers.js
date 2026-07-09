import { getEmailSignatures } from '@/lib/api/emailApi'
// Marker để đánh dấu vị trí bắt đầu của chữ ký
const SIGNATURE_START_MARKER = '<!-- SIGNATURE_START -->'
const SIGNATURE_END_MARKER = '<!-- SIGNATURE_END -->'

export function addSignatureToContent (content, signature) {
  if (!signature) return content
  // Xóa chữ ký cũ nếu có
  const contentWithoutSignature = removeSignatureFromContent(content)
  // Thêm chữ ký mới với marker
  const signatureWithMarker = `${SIGNATURE_START_MARKER}<br><br>${signature}${SIGNATURE_END_MARKER}`
  return (
    contentWithoutSignature +
    (contentWithoutSignature ? '' : '') +
    signatureWithMarker
  )
}

/**
 * Xóa chữ ký khỏi email content
 */
export function removeSignatureFromContent (content) {
  if (!content) return ''

  // Tìm và xóa chữ ký có marker
  const signatureRegex = new RegExp(
    `${SIGNATURE_START_MARKER}.*?${SIGNATURE_END_MARKER}`,
    'gs'
  )
  let cleanContent = content.replace(signatureRegex, '')

  // Fallback: xóa chữ ký không có marker (pattern đơn giản)
  // Tìm pattern <br><br> ở cuối + text có thể là chữ ký
  const fallbackRegex = /<br><br>(?:(?!<br><br>).)*$/s
  if (!content.includes(SIGNATURE_START_MARKER)) {
    // Chỉ áp dụng fallback nếu không có marker
    const lines = cleanContent.split('<br>')
    if (lines.length > 3) {
      const possibleSignature = lines.slice(-3).join('<br>')
      if (
        possibleSignature.includes('@') ||
        possibleSignature.includes('Trân trọng') ||
        possibleSignature.includes('Best regards')
      ) {
        cleanContent = lines.slice(0, -3).join('<br>')
      }
    }
  }
  // Loại bỏ <br> thừa ở cuối
  cleanContent = cleanContent.replace(/(<br>\s*){2,}$/g, '')
  return cleanContent
}

/**
 * Thay thế chữ ký hiện tại bằng chữ ký mới
 */
export function replaceSignature (content, newSignature) {
  const contentWithoutSignature = removeSignatureFromContent(content)
  return addSignatureToContent(contentWithoutSignature, newSignature)
}

/**
 * Kiểm tra xem email có chứa chữ ký không
 */
export function hasSignature (content) {
  if (!content) return false
  // Kiểm tra marker trước
  if (content.includes(SIGNATURE_START_MARKER)) {
    return true
  }
  // Fallback: kiểm tra pattern chữ ký thường gặp
  const signatureIndicators = [
    '@',
    'Trân trọng',
    'Best regards',
    'Sincereely',
    'Kind regards'
  ]
  const lines = content.split('<br>')
  const lastFewLines = lines.slice(-3).join(' ')
  return signatureIndicators.some(indicator =>
    lastFewLines.toLowerCase().includes(indicator.toLowerCase())
  )
}

/**
 * Tách nội dung email và chữ ký
 */
export function separateContentAndSignature (content) {
  if (!content) return { content: '', signature: '' }
  const signatureRegex = new RegExp(
    `${SIGNATURE_START_MARKER}(.*?)${SIGNATURE_END_MARKER}`,
    'gs'
  )
  const match = signatureRegex.exec(content)
  if (match) {
    const signature = match[1].replace(/^<br><br>/, '').replace(/<br><br>$/, '')
    const contentWithoutSig = content.replace(signatureRegex, '')
    return {
      content: contentWithoutSig,
      signature: signature
    }
  }
  return { content, signature: '' }
}

/**
 * Format chữ ký cho hiển thị trong dropdown
 */
export function formatSignaturePreview (signature, maxLength = 50) {
  if (!signature) return ''
  // Loại bỏ HTML tags và lấy text thuần
  const textOnly = signature.replace(/<[^>]*>/g, '').trim()
  if (textOnly.length <= maxLength) {
    return textOnly
  }
  return textOnly.substring(0, maxLength) + '...'
}

/**
 * Lấy chữ ký mặc định từ backend
 */
export async function getDefaultSignature (userEmail) {
  try {
    if (!userEmail) return null
    const response = await getEmailSignatures(userEmail)
    let signatures = []
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        signatures = response.data
      } else if (response.data.data && Array.isArray(response.data.data)) {
        signatures = response.data.data
      } else if (
        response.data.signatures &&
        Array.isArray(response.data.signatures)
      ) {
        signatures = response.data.signatures
      }
    } else if (response && Array.isArray(response)) {
      signatures = response
    }

    const defaultSig = signatures.find(sig => sig.IsDefault || sig.isDefault)
    return defaultSig || null
  } catch (error) {
    throw error
  }
}

/**
 * Lấy tất cả chữ ký từ backend
 */
export async function getAllSignatures (userEmail) {
  try {
    if (!userEmail) return []
    const response = await getEmailSignatures(userEmail)
    let signatures = []
    // Handle different response formats
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        signatures = response.data
      } else if (response.data.data && Array.isArray(response.data.data)) {
        signatures = response.data.data
      } else if (
        response.data.signatures &&
        Array.isArray(response.data.signatures)
      ) {
        signatures = response.data.signatures
      }
    } else if (response && Array.isArray(response)) {
      signatures = response
    }
    return signatures
  } catch (error) {
    throw error
  }
}

/**
 * Insert signature before quoted content in reply emails
 */
export const insertSignatureBeforeQuote = (emailContent, signatureContent, shouldInsertBeforeQuote = false) => {
  if (!shouldInsertBeforeQuote || !signatureContent) {
    return emailContent
  }

  // Patterns to identify quoted content
  const quotedPatterns = [
    /^On .* wrote:$/m, 
    /^Vào .* đã viết:$/m, 
    /^From: .*$/m, 
    /^Từ: .*$/m, 
    /^-----Original Message-----$/m, 
    /^----- Tin nhắn gốc -----$/m, 
    /^> /m,
    /<blockquote/i, 
    /^--$/m 
  ]

  let insertPosition = -1

  // Find the first occurrence of any quoted pattern
  for (const pattern of quotedPatterns) {
    const match = emailContent.match(pattern)
    if (match && (insertPosition === -1 || match.index < insertPosition)) {
      insertPosition = match.index
    }
  }

  if (insertPosition === -1) {
    // No quoted content found, append signature at the end
    return emailContent + '\n\n' + signatureContent
  }

  // Insert signature before quoted content
  const beforeQuote = emailContent.substring(0, insertPosition).trim()
  const afterQuote = emailContent.substring(insertPosition)

  return beforeQuote + '\n\n' + signatureContent + '\n\n' + afterQuote
}

export const removeSignatureSeparator = (content, shouldRemove = false) => {
  if (!shouldRemove) {
    return content
  }

  return content.replace(/^--\s*$/gm, '').replace(/\n\n+/g, '\n\n')
}

export const processEmailForReply = (emailContent, signatureContent, insertBeforeQuote = false) => {
  let processedContent = emailContent

  // 1. Insert signature before quoted content
  processedContent = insertSignatureBeforeQuote(processedContent, signatureContent, insertBeforeQuote)

  // 2. Remove signature separator lines
  processedContent = removeSignatureSeparator(processedContent, insertBeforeQuote)

  return processedContent
}

export const getUserSignatureSettings = (userEmail) => {
  try {
    const settings = localStorage.getItem(`signatureSettings_${userEmail}`)
    return settings ? JSON.parse(settings) : {
      insertBeforeQuote: false,
      defaultSignature: '',
      replySignature: ''
    }
  } catch (error) {
    console.error('Error loading signature settings:', error)
    return {
      insertBeforeQuote: false,
      defaultSignature: '',
      replySignature: ''
    }
  }
}

export const saveUserSignatureSettings = (userEmail, settings) => {
  try {
    localStorage.setItem(`signatureSettings_${userEmail}`, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving signature settings:', error)
  }
}
