import axios from 'axios'
import { ApiConstants } from '@/constants/apiConstants'
import { ConfigConstants } from '@/constants/configConstants'

const apiClient = axios.create({
    baseURL: ApiConstants.baseUrl,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
})

const formatAxiosRequestUrl = (config = {}) => {
    const baseURL = (config.baseURL || ApiConstants.baseUrl || '').replace(/\/+$/, '')
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

const createApiClientNotFoundFallbackResponse = (config = {}) => {
    if ((config.method || 'get').toLowerCase() !== 'get') return null

    const url = (config.url || '').toLowerCase()
    if (url.includes('/user/getlistdropdownforchats')) {
        return emptyApiPayload({ users: [] })
    }
    if (url.includes('/auth/permissions/by-user')) {
        return emptyApiPayload([])
    }

    return emptyApiPayload([])
}
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(ConfigConstants.localstorageTokenKey)
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true
            try {
                const refreshToken = localStorage.getItem(ConfigConstants.localstorageRefreshTokenKey)
                const res = await axios.post(`${ApiConstants.baseUrl}/auth/refresh/`, { refresh: refreshToken })
                const newToken = res.data.access
                localStorage.setItem(ConfigConstants.localstorageTokenKey, newToken)
                original.headers.Authorization = `Bearer ${newToken}`
                return apiClient(original)
            } catch {
                localStorage.removeItem(ConfigConstants.localstorageTokenKey)
                localStorage.removeItem(ConfigConstants.localstorageRefreshTokenKey)
                localStorage.removeItem(ConfigConstants.localstorageUserInfoKey)
                window.location.href = '/login'
            }
        }
        if (error.response?.status === 404) {
            console.warn('[api:404]', error.config?.method?.toUpperCase(), formatAxiosRequestUrl(error.config), error.response?.data)
            const fallbackData = createApiClientNotFoundFallbackResponse(error.config)
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

export default apiClient
