import { ApiConstants } from '@/constants/apiConstants'

const ABSOLUTE_URL_RE = /^(https?:|blob:|data:)/i

export function buildMediaUrl(filePath) {
    const rawPath = String(filePath || '').trim()
    if (!rawPath) return null
    if (ABSOLUTE_URL_RE.test(rawPath)) return rawPath

    const cleanPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const baseUrl = ApiConstants.cdnUrl || ''

    if (cleanPath.startsWith('media/')) {
        return `${baseUrl}/${cleanPath}`
    }

    return `${baseUrl}/media/${cleanPath}`
}

export function getStaffFileUrl(staffFilesJson, typeFile) {
    try {
        const files = Array.isArray(staffFilesJson)
            ? staffFilesJson
            : JSON.parse(staffFilesJson || '[]')
        const staffFile = files.find((file) => Number(file.TypeFile ?? file.typeFile) === Number(typeFile))
        return buildMediaUrl(
            staffFile?.File ??
            staffFile?.file ??
            staffFile?.Path ??
            staffFile?.path ??
            staffFile?.Url ??
            staffFile?.url
        )
    } catch {
        return null
    }
}
