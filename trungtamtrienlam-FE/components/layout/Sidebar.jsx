'use client'

import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    ChevronDown, ChevronRight, ChevronLeft,
    Menu, X, MoreVertical, LogOut,
} from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissionContext } from '@/contexts/PermissionContext'

// Mirror of 185's getIcon() — maps uniqueKey → <img> element
function getIcon(uniqueKey) {
    const icons = {
        dashboard:      '/icons/Icon_dashboard.svg',
        Calendar:       '/icons/Icon_calendar.svg',
        documents:      '/icons/Icon_mail.svg',
        Tasks:          '/icons/Icon_task.svg',
        Media:          '/icons/Icon_qlykholuutru.svg',
        Ratings:        '/icons/Icon_rating.svg',
        templates:      '/icons/Icon_templates.svg',
        Staff:          '/icons/Icon_users.svg',
        Permission:     '/icons/Icon_users.svg',
        Settings:       '/icons/Icon_setting.svg',
        Monument:       '/icons/Icon_quanlyditich.svg',
        wordprocessing: '/icons/Icon_thuvienvanban.svg',
    }
    const src = icons[uniqueKey]
    if (!src) return null
    return (
        <img
            src={src}
            alt={uniqueKey}
            className="w-5 h-5 flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
    )
}

function buildMenuTree(items, parentId = null) {
    return items
        .filter(item => item.parrentID === parentId)
        .map(item => ({
            id: item.uniqueKey || item.functionID,
            functionID: item.functionID,
            label: item.functionName,
            path: item.path,
            icon: getIcon(item.uniqueKey),
            children: buildMenuTree(items, item.functionID),
        }))
}


export default function Sidebar() {
    const pathname = usePathname()
    const { collapsed, setCollapsed, mobileOpen, setMobileOpen, isMobile } = useSidebar()
    const { user, logout } = useAuth()
    const { permissions } = usePermissionContext()
    const [expandedMenus, setExpandedMenus] = useState({})
    const [menuItems, setMenuItems] = useState([])

    // Build tree whenever permissions change
    useEffect(() => {
        if (!permissions?.length) return
        const viewable = permissions.filter(
            p => p.actionNames === 'View' || p.actionNames === 'View, View'
        )
        setMenuItems(buildMenuTree(viewable, null))
    }, [permissions])

    // Auto-expand parent if a child route is active
    useEffect(() => {
        const expand = (items) => {
            items.forEach(item => {
                if (item.children?.length) {
                    const hasActive = item.children.some(c => pathname.startsWith(c.path || '___'))
                    if (hasActive) {
                        setExpandedMenus(prev => ({ ...prev, [item.id]: true }))
                    }
                    expand(item.children)
                }
            })
        }
        expand(menuItems)
    }, [pathname, menuItems])

    const handleResize = useCallback(() => {
        requestAnimationFrame(() => {
            const full = document.getElementById('sidebarFull')
            const head = document.getElementById('headerSidebar')
            const foot = document.getElementById('footerSidebar')
            const body = document.getElementById('bodySidebar')
            if (full && head && foot && body) {
                body.style.maxHeight = `${full.clientHeight - head.clientHeight - foot.clientHeight}px`
            }
        })
    }, [])

    useLayoutEffect(() => {
        window.addEventListener('resize', handleResize)
        handleResize()
        return () => window.removeEventListener('resize', handleResize)
    }, [handleResize])

    const toggleMenu = (id) => {
        setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }))
        handleResize()
    }

    const renderMenuItems = (items, level = 0) => (
        <ul className={level > 0 ? 'pl-4 py-1 bg-gray-50' : ''}>
            {items.map(item => {
                const hasChildren = item.children?.length > 0
                const isExpanded = expandedMenus[item.id]
                const isCurrent = pathname === item.path

                return (
                    <li key={item.id} className="mb-1">
                        {hasChildren ? (
                            <>
                                <button
                                    onClick={() => { toggleMenu(item.id); handleResize() }}
                                    className={`flex items-center justify-between w-full px-4 py-2 text-sm ${
                                        isCurrent || (item.path && pathname.startsWith(item.path))
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="flex items-center gap-2 flex-1">
                                            {item.icon}
                                            {(!collapsed || isMobile) && <span>{item.label}</span>}
                                        </span>
                                    </div>
                                    {(!collapsed || isMobile) && (
                                        isExpanded
                                            ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                            : <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                    )}
                                </button>
                                {(!collapsed || isMobile) && isExpanded &&
                                    renderMenuItems(item.children, level + 1)}
                            </>
                        ) : (
                            <Link
                                href={item.path || '#'}
                                className={`flex items-center px-4 py-2 text-sm ${
                                    isCurrent ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                title={collapsed && !isMobile ? item.label : ''}
                                onClick={() => isMobile && setMobileOpen(false)}
                            >
                                <span className="flex items-center gap-2 flex-1">
                                    {item.icon}
                                    {(!collapsed || isMobile) && <span>{item.label}</span>}
                                </span>
                            </Link>
                        )}
                    </li>
                )
            })}
        </ul>
    )

    const avatarInitial = (user?.full_name || user?.username || 'U')[0].toUpperCase()

    const sidebarCls = [
        'h-screen fixed top-0 left-0 bg-white border-r border-gray-200 transition-all duration-300 z-[49]',
        isMobile
            ? `w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : collapsed ? 'w-16' : 'w-64',
    ].join(' ')

    return (
        <>
            {/* Mobile overlay */}
            {isMobile && mobileOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop collapse toggle */}
            {!isMobile && (
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden md:flex text-gray-500 fixed top-2 z-50 w-10 h-10 rounded-full bg-white shadow-md items-center justify-center"
                    style={{ left: collapsed ? '2.5rem' : '14.625rem' }}
                >
                    {collapsed
                        ? <ChevronRight className="w-5 h-5" />
                        : <ChevronLeft className="w-5 h-5" />
                    }
                </button>
            )}

            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center"
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <aside id="sidebarFull" className={sidebarCls}>
                {/* Header */}
                <div id="headerSidebar" className="p-4 border-b border-gray-200 flex items-center justify-between h-16">
                    {(!collapsed || isMobile) ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={36}
                                height={36}
                                className="w-[37px] h-[37px] object-contain flex-shrink-0"
                            />
                            <div className="text-[10px] leading-tight">
                                <p className="font-semibold">TT BẢO TỒN & PHÁT HUY GIÁ TRỊ</p>
                                <p className="font-semibold">DI TÍCH LỊCH SỬ VĂN HÓA TP HCM</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto">
                            <Image src="/logo.png" alt="Logo" width={36} height={36} className="w-[37px] h-[37px] object-contain" />
                        </div>
                    )}
                </div>

                {/* Nav body */}
                <div id="bodySidebar" className="py-4 overflow-y-auto">
                    {menuItems.length > 0
                        ? renderMenuItems(menuItems)
                        : (!collapsed || isMobile) && (
                            <p className="text-xs text-gray-400 px-4 py-2">Chưa có quyền truy cập</p>
                        )
                    }
                </div>

                {/* Footer */}
                <div
                    id="footerSidebar"
                    className={`absolute bottom-0 left-0 border-t border-gray-200 p-2 bg-white ${collapsed && !isMobile ? 'w-16' : 'w-full'}`}
                >
                    {(!collapsed || isMobile) ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                                    {avatarInitial}
                                </div>
                                <div className="text-xs min-w-0">
                                    <p className="font-semibold truncate">{user?.full_name || user?.username || 'Người dùng'}</p>
                                    <p className="text-gray-500 truncate">{user?.position || 'Admin'}</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input id="sidebarCheck" type="checkbox" className="peer hidden" />
                                <label htmlFor="sidebarCheck" className="cursor-pointer p-2 block">
                                    <MoreVertical className="w-4 h-4" />
                                </label>
                                <div className="fixed bottom-0 left-[-100%] bg-white shadow-lg rounded-md transition-all duration-300 peer-checked:left-[152px] peer-checked:bottom-[60px] z-50">
                                    <button
                                        onClick={logout}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full whitespace-nowrap"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center py-1">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {avatarInitial}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}
