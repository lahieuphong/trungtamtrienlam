'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function WebsitesNewsPage() {
    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Quản lý tin tức', isHome: true }]} />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-400">Tính năng đang được phát triển.</p>
            </div>
        </div>
    )
}