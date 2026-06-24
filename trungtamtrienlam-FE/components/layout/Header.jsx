'use client'

import { useState } from 'react'
import { Bell, Menu, MessageCircleMore } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

export default function Header() {
    const { setMobileOpen, isMobile } = useSidebar()
    const [notifCount] = useState(0)
    const [messageCount] = useState(0)

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center h-16 fixed top-0 right-0 w-full z-[48]">
            <div className="flex items-center">
                {isMobile && (
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="mr-3 text-gray-500 hover:text-gray-700"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-1">
                {/* Messages */}
                <div className="relative">
                    <button className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                        <MessageCircleMore className="w-5 h-5" />
                        {messageCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">
                                {messageCount > 99 ? '99+' : messageCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                        <Bell className="w-5 h-5" />
                        {notifCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full animate-pulse">
                                {notifCount > 99 ? '99+' : notifCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    )
}
