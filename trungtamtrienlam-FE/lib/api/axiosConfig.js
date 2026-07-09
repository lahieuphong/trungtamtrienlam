import axios from 'axios'
import { ApiConstants } from '@/constants/apiConstants'
import { ConfigConstants } from '@/constants/configConstants'

const normalizeApiBaseUrl = (url) => {
  const fallback = ApiConstants.baseUrl || 'http://localhost:8000/api'
  const raw = (url || fallback).replace(/\/+$/, '')
  return /\/api$/i.test(raw) ? raw : `${raw}/api`
}

const API_BASE_URL = ApiConstants.baseUrl
const API_AI_URL = process.env.NEXT_PUBLIC_API_AI_URL || ''
const API_CLOUD_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_CLOUND_URL || API_BASE_URL)

const createClient = (baseURL) => axios.create({
  baseURL,
  timeout: 1000 * 60 * 60,
})

const axiosInstance = createClient(API_BASE_URL)
const axiosCloudCDNInstance = createClient(API_CLOUD_URL)
const axiosAIInstance = createClient(API_AI_URL || API_BASE_URL)
const axiosVoiceInstance = createClient(API_BASE_URL)
const axiosInstanceStorageServer = createClient(API_BASE_URL)
const axiosInstanceStorageServerCloud = createClient(API_CLOUD_URL)

const formatAxiosRequestUrl = (config = {}) => {
  const baseURL = (config.baseURL || '').replace(/\/+$/, '')
  const url = config.url || ''
  if (/^https?:\/\//i.test(url)) return url
  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}
const emptyApiPayload = (data = []) => ({
  status: 200,
  message: 'No data',
  data: {
    status: 200,
    message: null,
    data,
  },
  errors: null,
})

const createChatNotFoundFallbackResponse = (config = {}) => {
  if ((config.method || 'get').toLowerCase() !== 'get') return null

  const url = (config.url || '').toLowerCase()
  if (url.includes('/chat/getdetail')) {
    return emptyApiPayload({ dataChat: null, dataChatMessage: [] })
  }
  if (url.includes('/chat/getattack')) {
    return emptyApiPayload({ chatFiles: [], chatLinks: [], files: [], links: [] })
  }
  if (url.includes('/chat/getuseridadmin')) {
    return emptyApiPayload('')
  }

  const emptyListEndpoints = [
    '/chat/getlist',
    '/chat/listuserwaitconfirm',
    '/chat/getuserbychatid',
    '/chat/getmesspin',
    '/chatnote/getlist',
    '/chatnote/getdetail',
    '/chatvote/getlist',
    '/chatvote/getvoteresult',
    '/chatremind/getlist',
    '/chatremind/getdetail',
  ]

  if (emptyListEndpoints.some(endpoint => url.includes(endpoint))) {
    return emptyApiPayload([])
  }

  return emptyApiPayload([])
}
const getToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(ConfigConstants.localstorageTokenKey) || ''
}

const attachAuth = (config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

for (const client of [
  axiosInstance,
  axiosCloudCDNInstance,
  axiosAIInstance,
  axiosVoiceInstance,
  axiosInstanceStorageServer,
  axiosInstanceStorageServerCloud,
]) {
  client.interceptors.request.use(attachAuth, (error) => Promise.reject(error))
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 404) {
        console.warn('[api:404]', error.config?.method?.toUpperCase(), formatAxiosRequestUrl(error.config), error.response?.data)
        const fallbackData = createChatNotFoundFallbackResponse(error.config)
        if (fallbackData) {
          return Promise.resolve({
            ...error.response,
            status: 200,
            statusText: 'OK',
            data: fallbackData,
          })
        }
      }
      return Promise.reject(error)
    }
  )
}

export default axiosInstance
export {
  axiosAIInstance,
  axiosCloudCDNInstance,
  axiosInstanceStorageServer,
  axiosInstanceStorageServerCloud,
  axiosVoiceInstance,
}
