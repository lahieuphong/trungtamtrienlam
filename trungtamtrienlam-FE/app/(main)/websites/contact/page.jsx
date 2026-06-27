'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function WebsitesContactPage() {
    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Danh sách liên hệ', isHome: true }]} />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-400">Tính năng đang được phát triển.</p>
            </div>
        </div>
    )
}