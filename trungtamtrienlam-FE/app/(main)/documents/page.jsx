'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function DocumentsPage() {
  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: 'Văn bản', isHome: true }]} />
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
        Đang phát triển...
      </div>
    </div>
  )
}