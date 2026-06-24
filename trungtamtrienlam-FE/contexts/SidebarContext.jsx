'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    return (
        <SidebarContext.Provider value={{
            collapsed, setCollapsed,
            mobileOpen, setMobileOpen,
            isMobile,
            toggle: () => setCollapsed(v => !v),
            toggleMobile: () => setMobileOpen(v => !v),
        }}>
            {children}
        </SidebarContext.Provider>
    )
}

export const useSidebar = () => {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
    return ctx
}
