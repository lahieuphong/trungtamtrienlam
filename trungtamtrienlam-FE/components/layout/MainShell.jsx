'use client'

import { useSidebar } from '@/contexts/SidebarContext'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainShell({ children }) {
    const { collapsed, isMobile } = useSidebar()

    // Offset for fixed sidebar
    const marginLeft = isMobile ? 'ml-0' : collapsed ? 'md:ml-16' : 'md:ml-64'

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${marginLeft}`}>
                <Header />
                <main className="flex-1 pt-16 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    )
}
