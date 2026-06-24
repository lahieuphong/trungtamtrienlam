'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'

export default function Header() {
    const { user, logout } = useAuth()
    const { toggle } = useSidebar()

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
            <button
                onClick={toggle}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
            >
                ☰
            </button>

            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                    {user?.full_name || user?.username || 'Người dùng'}
                </span>
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                </div>
                <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                    Đăng xuất
                </button>
            </div>
        </header>
    )
}
