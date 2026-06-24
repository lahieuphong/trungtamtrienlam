'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function MonumentProfilePage() {
  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: 'Hồ sơ di tích', isHome: true }]} />
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
        Đang phát triển...
      </div>
    </div>
  )
}