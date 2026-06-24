'use client'

import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const toggle = () => setCollapsed(v => !v)
    const toggleMobile = () => setMobileOpen(v => !v)

    return (
        <SidebarContext.Provider value={{ collapsed, mobileOpen, toggle, toggleMobile }}>
            {children}
        </SidebarContext.Provider>
    )
}

export const useSidebar = () => {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
    return ctx
}
