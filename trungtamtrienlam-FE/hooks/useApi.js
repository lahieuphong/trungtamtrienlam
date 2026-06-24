import { useState, useCallback } from 'react'
import apiClient from '@/utils/apiClient'

export function useApi() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const request = useCallback(async (method, url, data = null, config = {}) => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiClient[method](url, data, config)
            return res.data
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Có lỗi xảy ra'
            setError(message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        loading,
        error,
        get: (url, config) => request('get', url, null, config),
        post: (url, data, config) => request('post', url, data, config),
        put: (url, data, config) => request('put', url, data, config),
        patch: (url, data, config) => request('patch', url, data, config),
        delete: (url, config) => request('delete', url, null, config),
    }
}
