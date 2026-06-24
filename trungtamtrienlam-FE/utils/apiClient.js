import axios from 'axios'
import { ApiConstants } from '@/constants/apiConstants'
import { ConfigConstants } from '@/constants/configConstants'

const apiClient = axios.create({
    baseURL: ApiConstants.baseUrl,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
})

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

        return Promise.reject(error)
    }
)

export default apiClient
