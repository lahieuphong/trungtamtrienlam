'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfigConstants } from '@/constants/configConstants'
import apiClient from '@/utils/apiClient'


const normalizeUserInfo = userInfo => {
    if (!userInfo || typeof userInfo !== 'object') return null

    const userID = String(
        userInfo.userID ?? userInfo.UserID ?? userInfo.id ?? userInfo.ID ?? ''
    ).trim()
    const fullName = String(
        userInfo.fullName ??
            userInfo.FullName ??
            userInfo.full_name ??
            [userInfo.first_name, userInfo.last_name].filter(Boolean).join(' ') ??
            userInfo.username ??
            ''
    ).trim()

    return {
        ...userInfo,
        ...(userID ? { userID, UserID: userID } : {}),
        ...(fullName ? { fullName, FullName: fullName } : {}),
    }
}

const notifyLocalStorageUpdated = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('localStorageUpdate'))
    }
}

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
            setUser(normalizeUserInfo(JSON.parse(storedUser)))
        }
        setLoading(false)
    }, [])

    const login = async (username, password) => {
        const res = await apiClient.post('/auth/login/', { username, password })
        const { access, refresh, user: userInfo } = res.data
        const normalizedUserInfo = normalizeUserInfo(userInfo)
        localStorage.setItem(ConfigConstants.localstorageTokenKey, access)
        localStorage.setItem(ConfigConstants.localstorageRefreshTokenKey, refresh)
        localStorage.setItem(ConfigConstants.localstorageUserInfoKey, JSON.stringify(normalizedUserInfo))
        setToken(access)
        setUser(normalizedUserInfo)
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
        notifyLocalStorageUpdated()
        return normalizedUserInfo
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
        notifyLocalStorageUpdated()
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
