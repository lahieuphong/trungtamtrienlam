'use client'

import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function TasksInternalPage() {
  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: 'Công việc nội bộ', isHome: true }]} />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Đang phát triển...
      </div>
    </div>
  )
}