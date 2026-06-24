'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function MonumentPrivatePage() {
    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Hồ sơ không công khai', isHome: true }]} />
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-400">Tính năng đang được phát triển.</p>
            </div>
        </div>
    )
}