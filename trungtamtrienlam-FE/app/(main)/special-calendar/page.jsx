'use client'

import { Suspense } from 'react'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import CalendarPage from '@/components/calendars/calendar-page'
import { CalendarConstants } from '@/constants/calendarConstants'

export default function SpecialCalendarPage() {
  return (
    <div className="p-6">
      <Breadcrumb items={[{ label: 'Lịch đặc biệt', isHome: true }]} />
      <Suspense fallback={<div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Đang tải lịch...</div>}>
        <CalendarPage version={CalendarConstants.calendarVersion.v2} />
      </Suspense>
    </div>
  )
}
