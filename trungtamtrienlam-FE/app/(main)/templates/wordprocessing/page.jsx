'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function TemplatesWordPage() {
  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: 'Xử lý văn bản', isHome: true }]} />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Đang phát triển...
      </div>
    </div>
  )
}