'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, isSameDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { getCalendarWeek, getCalendarWeekV2 } from '@/lib/api/calendarApi'
import { useCalendar } from '@/hooks/useCalendar'

const timeSlots = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, '0')}:00`)
const dayHeight = 960

function minutesOfDay(date) {
  const d = new Date(date)
  return d.getHours() * 60 + d.getMinutes()
}

function eventStyle(event) {
  const top = (minutesOfDay(event.fromTime) / 1440) * dayHeight
  const duration = Math.max((event.toTime - event.fromTime) / 60000, 30)
  const height = Math.max((duration / 1440) * dayHeight, 70)
  return { top, height }
}

export default function Week({ fromDate, toDate, joinType, type, version, onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())
  const { reloadKey } = useCalendarReload()
  const { convertToEvent } = useCalendar()

  const weekDays = useMemo(() => {
    const start = fromDate ? new Date(fromDate) : new Date()
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [fromDate])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = version === CalendarConstants.calendarVersion.v1
          ? await getCalendarWeek({ type, joinType, fromDate, toDate })
          : await getCalendarWeekV2({ type, joinType, fromDate, toDate })
        const raw = res?.data?.data?.calendars || []
        if (mounted) setEvents(convertToEvent(raw))
      } catch (error) {
        if (mounted) setEvents([])
        console.error('Lỗi khi tải tuần lịch:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [fromDate, toDate, joinType, type, reloadKey.week, version])

  const gridColumnsStyle = { gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))' }
  const nowTop = (minutesOfDay(now) / 1440) * dayHeight
  const showNowLine = weekDays.some((day) => isSameDay(day, now))
  const nowColumn = weekDays.findIndex((day) => isSameDay(day, now))

  return (
    <div className="bg-gray-50 select-none">
      <div className="mx-auto bg-white rounded-xl shadow overflow-hidden relative border border-gray-100">
        <div className="h-8 flex border-b border-gray-200">
          <div className="w-16 flex-shrink-0" />
          <div className="flex-1 grid" style={gridColumnsStyle}>
            {weekDays.map((day) => {
              const today = isSameDay(day, new Date())
              return (
                <div key={day.toISOString()} className={`border-l border-gray-200 text-center text-xs font-semibold py-2 ${today ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
                  <span className="block lg:hidden">{format(day, 'dd/MM')}</span>
                  <span className="hidden lg:block capitalize">{format(day, 'EEEE dd/MM', { locale: vi })}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative border-t border-blue-300" style={{ height: dayHeight }}>
          {timeSlots.map((time) => (
            <div key={time} className="absolute left-0 right-0 flex border-t border-gray-200" style={{ top: `${(Number(time.slice(0, 2)) / 24) * dayHeight}px` }}>
              <div className="w-16 flex-shrink-0 text-center pt-1 text-gray-500 text-xs font-medium">{time.slice(0, 2)}</div>
              <div className="flex-1 grid" style={gridColumnsStyle}>
                {weekDays.map((day) => <div key={`${time}-${day.toISOString()}`} className="border-l border-dotted border-gray-200" />)}
              </div>
            </div>
          ))}

          <div className="absolute top-0 left-16 h-full z-10 w-[calc(100%-64px)]">
            <div className="relative h-full grid" style={gridColumnsStyle}>
              {weekDays.map((day) => {
                const dayEvents = events.filter((event) => isSameDay(event.fromTime, day))
                return (
                  <div key={day.toISOString()} className="relative border-l border-dotted border-gray-200">
                    {dayEvents.map((event, index) => {
                      const style = eventStyle(event)
                      const width = dayEvents.length > 1 ? `calc(${100 / Math.min(dayEvents.length, 3)}% - 4px)` : 'calc(100% - 8px)'
                      const left = `${(index % 3) * (100 / Math.min(dayEvents.length, 3))}%`
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onOpenEvent?.(event)}
                          className="absolute rounded-lg shadow-sm border-l-2 px-2 py-1 text-left overflow-hidden hover:shadow-md transition-all"
                          style={{ top: style.top, height: style.height, width, left, backgroundColor: event.color, borderLeftColor: event.colorMain }}
                        >
                          <div className="space-y-1 pr-4">
                            <p className="font-semibold text-[11px] text-gray-800 line-clamp-2">{event.title}</p>
                            <p className="text-[11px] text-gray-600 truncate">{event.time}</p>
                          </div>
                          {event.icon.other?.content}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {showNowLine && nowColumn >= 0 && (
            <div className="absolute z-20 h-0.5 bg-red-500 pointer-events-none" style={{ top: nowTop, left: `calc(64px + ${nowColumn} * ((100% - 64px) / 7))`, width: 'calc((100% - 64px) / 7)' }}>
              <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow" />
              <p className="text-xs text-white bg-red-600 px-1 rounded absolute left-[25px] -translate-x-1/2 -top-5">{format(now, 'HH:mm')}</p>
            </div>
          )}
        </div>

        {loading && <div className="absolute right-4 top-11 text-xs text-blue-500">Đang tải...</div>}
        {!loading && events.length === 0 && <div className="py-6 text-center text-xs text-gray-400 border-t">Không có lịch trong tuần này</div>}
      </div>
    </div>
  )
}
