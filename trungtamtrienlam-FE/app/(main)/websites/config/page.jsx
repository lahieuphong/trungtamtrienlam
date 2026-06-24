'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function WebsitesConfigPage() {
    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Cấu hình trang web', isHome: true }]} />
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-400">Tính năng đang được phát triển.</p>
            </div>
        </div>
    )
}