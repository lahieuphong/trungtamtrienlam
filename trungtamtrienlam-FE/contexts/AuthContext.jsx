'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfigConstants } from '@/constants/configConstants'
import apiClient from '@/utils/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedToken = localStorage.getItem(ConfigConstants.localstorageTokenKey)
        const storedUser = localStorage.getItem(ConfigConstants.localstorageUserInfoKey)
        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
        }
        setLoading(false)
    }, [])

    const login = async (username, password) => {
        const res = await apiClient.post('/auth/login/', { username, password })
        const { access, refresh, user: userInfo } = res.data
        localStorage.setItem(ConfigConstants.localstorageTokenKey, access)
        localStorage.setItem(ConfigConstants.localstorageRefreshTokenKey, refresh)
        localStorage.setItem(ConfigConstants.localstorageUserInfoKey, JSON.stringify(userInfo))
        setToken(access)
        setUser(userInfo)
        // Fetch menu permissions after login
        try {
            const permRes = await apiClient.get('/auth/permissions/by-user/', {
                headers: { Authorization: `Bearer ${access}` },
            })
            if (permRes.data?.data) {
                localStorage.setItem('permissionInfo', JSON.stringify(permRes.data.data))
            }
        } catch {
            // Non-critical — sidebar will show empty menu
        }
        return userInfo
    }

    const logout = async () => {
        const refreshToken = localStorage.getItem(ConfigConstants.localstorageRefreshTokenKey)
        if (refreshToken) {
            apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {})
        }
        localStorage.removeItem(ConfigConstants.localstorageTokenKey)
        localStorage.removeItem(ConfigConstants.localstorageRefreshTokenKey)
        localStorage.removeItem(ConfigConstants.localstorageUserInfoKey)
        localStorage.removeItem('permissionInfo')
        setToken(null)
        setUser(null)
        router.replace('/login')
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
