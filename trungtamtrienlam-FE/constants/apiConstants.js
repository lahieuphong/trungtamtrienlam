const LOCAL_BACKEND_API_URL = 'http://localhost:8000/api'
const LOCAL_FRONTEND_URL = 'http://localhost:3000/'
const LOCAL_DEV_FRONTEND_PORTS = new Set(['3000', '3001', '5173'])

const normalizeBaseUrl = (url) => (url || '').replace(/\/+$/, '')

const getRuntimeOrigin = () => {
  if (typeof globalThis === 'undefined' || !globalThis.location) return ''
  return globalThis.location.origin || ''
}

const isLocalDevFrontendApi = (url) => {
  const runtimeOrigin = getRuntimeOrigin()
  if (!runtimeOrigin) return false

  try {
    const runtimeUrl = new URL(runtimeOrigin)
    const apiUrl = new URL(url, runtimeOrigin)
    const localHosts = ['localhost', '127.0.0.1']
    const isLocalRuntime = localHosts.includes(runtimeUrl.hostname)
    const isFrontendPort = LOCAL_DEV_FRONTEND_PORTS.has(runtimeUrl.port)
    const isApiOnFrontendPort =
      localHosts.includes(apiUrl.hostname) &&
      LOCAL_DEV_FRONTEND_PORTS.has(apiUrl.port)

    return (
      isLocalRuntime &&
      isFrontendPort &&
      isApiOnFrontendPort &&
      /^\/api(?:\/|$)/i.test(apiUrl.pathname)
    )
  } catch {
    return false
  }
}

const normalizeApiBaseUrl = (url) => {
  const candidate = normalizeBaseUrl(url || LOCAL_BACKEND_API_URL)
  const raw = isLocalDevFrontendApi(candidate)
    ? LOCAL_BACKEND_API_URL
    : candidate

  return /\/api$/i.test(raw) ? raw : `${raw}/api`
}

const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
const backendBaseUrl = apiBaseUrl.replace(/\/api$/i, '')
const cloudBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_CLOUND_URL || backendBaseUrl)
const frontendBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_HOME_PAGE_URL || LOCAL_FRONTEND_URL)

class ApiConstants {
    static baseUrl = apiBaseUrl
    static cdnUrl = backendBaseUrl
    static backendBaseUrl = backendBaseUrl
    static onlyOfficeServerUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL || 'https://onlyoffice.hongvan.net'
    static onlyOfficeServerUrlCallBack = process.env.NEXT_PUBLIC_ONLYOFFICE_CALLBACK_URL || `${backendBaseUrl}/api/OnlyOfficeCallback/ReceiveCallback`
    static onlyOfficeServerUrlScript = process.env.NEXT_PUBLIC_ONLYOFFICE_SCRIPT_URL || `${ApiConstants.onlyOfficeServerUrl}/web-apps/apps/api/documents/api.js`
    static onlyOfficeJwtToken = process.env.NEXT_PUBLIC_ONLYOFFICE_JWT_TOKEN || 'whNGmbB9qFvcQaqI5MrMIaeSFZmsmtkVYNcgPrlY'
    static onlyOfficeScript = ApiConstants.onlyOfficeServerUrlScript
    static apiCloudCDN = `${cloudBaseUrl}/api`
    static urlCloudCDN = cloudBaseUrl
    static shareLinkUrl = `${frontendBaseUrl}/chia-se-lien-ket`
}

class ApiCloudCDNFileConstants {
    static getPublicToken = '/file/getPublicToken'
    static view = '/file/View?pathFile={pathFile}&publicToken={publicToken}&isPrivate={isPrivate}'
}

export { ApiConstants, ApiCloudCDNFileConstants }
