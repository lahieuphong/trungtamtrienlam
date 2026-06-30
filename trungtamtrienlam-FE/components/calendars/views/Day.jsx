'use client'

import { useEffect, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Clock9, MapPin } from 'lucide-react'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { getCalendarDay, getCalendarDayV2 } from '@/lib/api/calendarApi'
import { useCalendar, formatDateKey } from '@/hooks/useCalendar'

const timeSlots = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, '0')}:00`)
const dayHeight = 960

function minutesOfDay(date) {
  const d = new Date(date)
  return d.getHours() * 60 + d.getMinutes()
}

function eventStyle(event) {
  const top = (minutesOfDay(event.fromTime) / 1440) * dayHeight
  const duration = Math.max((event.toTime - event.fromTime) / 60000, 30)
  const height = Math.max((duration / 1440) * dayHeight, 58)
  return { top, height }
}

export default function Day({ date, joinType, type, version, onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())
  const { reloadKey } = useCalendarReload()
  const { convertToEvent } = useCalendar()
  const selectedDate = new Date(date)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const day = formatDateKey(selectedDate)
        const res = version === CalendarConstants.calendarVersion.v1
          ? await getCalendarDay({ joinType, type, day })
          : await getCalendarDayV2({ joinType, type, day })
        const raw = res?.data?.data?.calendars || []
        if (mounted) setEvents(convertToEvent(raw).filter((event) => isSameDay(event.fromTime, selectedDate) || isSameDay(event.toTime, selectedDate)))
      } catch (error) {
        if (mounted) setEvents([])
        console.error('Error loading calendar day:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [date, joinType, type, reloadKey.day, version])

  const nowTop = (minutesOfDay(now) / 1440) * dayHeight
  const showNowLine = isSameDay(selectedDate, now)

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden relative select-none border border-gray-100">
      <div className="px-6 py-4 border-b text-blue-600 font-medium flex items-center justify-between">
        <span className="capitalize">{format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi })}</span>
        {loading && <span className="text-xs text-blue-500">Đang tải...</span>}
      </div>

      <div className="relative h-[960px] border-l border-blue-300">
        {timeSlots.map((time) => (
          <div key={time} className="absolute left-0 right-0 flex border-t border-gray-300 text-xs text-gray-400" style={{ top: `${(Number(time.slice(0, 2)) / 24) * dayHeight}px` }}>
            <div className="w-16 flex-shrink-0 text-center pt-1 text-gray-500 text-xs font-medium">{time.slice(0, 2)}</div>
            <div className="flex-1 border-l border-dotted border-gray-200" />
          </div>
        ))}

        {showNowLine && (
          <div className="absolute left-16 right-0 h-0.5 bg-red-500 z-20 pointer-events-none" style={{ top: nowTop }}>
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow" />
            <p className="text-xs text-white bg-red-600 px-1 rounded absolute left-[25px] -translate-x-1/2 -top-5">{format(now, 'HH:mm')}</p>
          </div>
        )}

        <div className="absolute top-0 left-16 right-0 h-full">
          {events.map((event, index) => {
            const style = eventStyle(event)
            const overlapWidth = events.length > 1 ? 'calc(100% - 10px)' : 'calc(100% - 10px)'
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onOpenEvent?.(event)}
                className="absolute rounded-lg shadow-sm border-l-2 px-3 py-2 text-left overflow-hidden hover:shadow-md transition-all"
                style={{ top: style.top, height: style.height, left: 5 + (index % 2) * 6, width: overlapWidth, backgroundColor: event.color, borderLeftColor: event.colorMain }}
              >
                <p className="font-semibold text-sm text-gray-800 line-clamp-2 pr-5">{event.title}</p>
                <div className="mt-1 flex flex-col md:flex-row md:items-center gap-1 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1"><Clock9 size={15} /> {event.time}</span>
                  {event.location && <span className="inline-flex items-center gap-1"><MapPin size={15} /> {event.location}</span>}
                </div>
                {event.icon.other?.content}
              </button>
            )
          })}
        </div>

        {!loading && events.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">Không có lịch trong ngày này</div>
        )}
      </div>
    </div>
  )
}
