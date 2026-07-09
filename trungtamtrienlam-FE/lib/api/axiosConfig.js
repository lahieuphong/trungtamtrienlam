import axios from 'axios'
import { ConfigConstants } from '@/constants/configConstants'

const normalizeApiBaseUrl = (url) => {
  const fallback = 'http://localhost:8000/api'
  const raw = (url || fallback).replace(/\/+$/, '')
  return /\/api$/i.test(raw) ? raw : `${raw}/api`
}

const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
const API_AI_URL = process.env.NEXT_PUBLIC_API_AI_URL || ''
const API_CLOUD_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_CLOUND_URL || process.env.NEXT_PUBLIC_API_URL)

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
}

export default axiosInstance
export {
  axiosAIInstance,
  axiosCloudCDNInstance,
  axiosInstanceStorageServer,
  axiosInstanceStorageServerCloud,
  axiosVoiceInstance,
}
