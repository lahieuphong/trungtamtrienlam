'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const PermissionContext = createContext()

export const usePermissionContext = () => {
    const ctx = useContext(PermissionContext)
    if (!ctx) throw new Error('usePermissionContext must be used within PermissionProvider')
    return ctx
}

export const PermissionProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        try {
            const raw = localStorage.getItem('permissionInfo')
            if (raw) setPermissions(JSON.parse(raw))
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }, [])

    return (
        <PermissionContext.Provider value={{ permissions, setPermissions, loading }}>
            {children}
        </PermissionContext.Provider>
    )
}
