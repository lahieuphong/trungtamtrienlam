'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Tổng quan', icon: '📊' },
    { href: '/accounts', label: 'Tài khoản', icon: '👥' },
    { href: '/tasks/tasks', label: 'Công việc', icon: '✅' },
    { href: '/documents', label: 'Văn bản', icon: '📄' },
    { href: '/archives', label: 'Lưu trữ', icon: '🗂️' },
    { href: '/calendar', label: 'Lịch làm việc', icon: '📅' },
    { href: '/chats', label: 'Tin nhắn', icon: '💬' },
    { href: '/media', label: 'Quản lý file', icon: '📁' },
    { href: '/ratings', label: 'Đánh giá', icon: '⭐' },
    { href: '/templates', label: 'Mẫu biểu', icon: '📋' },
    { href: '/notifications', label: 'Thông báo', icon: '🔔' },
    { href: '/permissions', label: 'Phân quyền', icon: '🔐' },
    { href: '/reports', label: 'Báo cáo', icon: '📈' },
    { href: '/settings', label: 'Cài đặt', icon: '⚙️' },
]

export default function Sidebar() {
    const { collapsed } = useSidebar()
    const pathname = usePathname()

    return (
        <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 overflow-hidden`}>
            <div className="flex items-center h-14 px-4 border-b border-gray-200 flex-shrink-0">
                {!collapsed && (
                    <span className="font-bold text-sm text-gray-800 truncate">Trung tâm triển lãm</span>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
                {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                active
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <span className="text-base flex-shrink-0">{item.icon}</span>
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
