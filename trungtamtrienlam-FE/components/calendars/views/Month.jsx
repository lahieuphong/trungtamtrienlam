'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, endOfMonth, format, isSameDay, isWithinInterval, startOfMonth, startOfWeek } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronDown } from 'lucide-react'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { getCalendarMonth, getCalendarMonthV2 } from '@/lib/api/calendarApi'
import { useCalendar, formatDateKey } from '@/hooks/useCalendar'

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MAX_VISIBLE_EVENTS = 3

function generateCalendar(currentDate) {
  const first = startOfMonth(currentDate)
  const start = startOfWeek(first, { weekStartsOn: 1 })
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function eventHappensOn(event, day) {
  const from = new Date(event.fromTime)
  const to = new Date(event.toTime)
  const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return isWithinInterval(normalizedDay, { start, end })
}

export default function Month({ date, joinType, type, version, onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [openPopoverDay, setOpenPopoverDay] = useState(null)
  const { reloadKey } = useCalendarReload()
  const { convertToEvent } = useCalendar()

  const currentDate = new Date(date)
  const days = useMemo(() => generateCalendar(currentDate), [date])
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = version === CalendarConstants.calendarVersion.v1
          ? await getCalendarMonth({ type, joinType, year, month })
          : await getCalendarMonthV2({ type, joinType, year, month })
        const raw = res?.data?.data?.calendars || []
        if (mounted) setEvents(convertToEvent(raw))
      } catch (error) {
        if (mounted) setEvents([])
        console.error('Error loading calendar month:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [joinType, type, year, month, reloadKey.month, version])

  const groupedEvents = useMemo(() => {
    const map = new Map()
    days.forEach((day) => {
      const key = formatDateKey(day)
      map.set(key, events.filter((event) => eventHappensOn(event, day)).sort((a, b) => a.fromTime - b.fromTime))
    })
    return map
  }, [days, events])

  const monthLabel = format(currentDate, "'Tháng' M yyyy", { locale: vi })

  return (
    <div className="w-full select-none">
      <div className="bg-white rounded-xl shadow text-[10px] sm:text-xs overflow-hidden relative border border-gray-100">
        <div className="px-4 py-3 border-b flex items-center justify-between bg-white">
          <span className="font-semibold text-gray-700 capitalize">{monthLabel}</span>
          {loading && <span className="text-xs text-blue-500">Đang tải...</span>}
        </div>
        <div className="grid grid-cols-7 border-b font-semibold text-center text-gray-600">
          {weekdays.map((day) => <div key={day} className="py-2 border-r last:border-r-0">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 auto-rows-[126px]">
          {days.map((day) => {
            const key = formatDateKey(day)
            const dayEvents = groupedEvents.get(key) || []
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = isSameDay(day, new Date())
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS)
            const hiddenEvents = dayEvents.slice(MAX_VISIBLE_EVENTS)
            const isPopoverOpen = openPopoverDay === key

            return (
              <div
                key={key}
                className={`relative border-r border-b last:border-r-0 px-1.5 py-1.5 transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-300'} ${isToday ? 'ring-1 ring-blue-400 ring-inset' : ''}`}
              >
                <div className={`mb-1 flex h-5 items-center justify-center text-[11px] font-semibold ${isToday ? 'mx-auto w-5 rounded-full bg-blue-500 text-white' : 'text-gray-600'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {visibleEvents.map((event) => (
                    <button
                      key={`${event.id}-${key}`}
                      type="button"
                      onClick={() => onOpenEvent?.(event)}
                      className="w-full h-6 rounded px-2 flex items-center gap-1.5 border-l-2 text-left hover:shadow-sm transition-all overflow-hidden"
                      style={{ backgroundColor: event.color, borderLeftColor: event.colorMain }}
                    >
                      <span className="font-semibold truncate flex-1 text-gray-800">{event.title}</span>
                      <span className={`${event.icon.month?.color}`}>{event.icon.month?.content}</span>
                      <span className="whitespace-nowrap text-gray-600">{event.time.split(' - ')[0]}</span>
                    </button>
                  ))}
                  {hiddenEvents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenPopoverDay(isPopoverOpen ? null : key)}
                      className="inline-flex items-center text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      +{hiddenEvents.length} <ChevronDown className="ml-1 h-3 w-3" />
                    </button>
                  )}
                </div>
                {isPopoverOpen && (
                  <div className="absolute left-2 top-9 z-40 w-[260px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                    <div className="mb-2 text-sm font-semibold text-gray-600">{format(day, 'dd/MM/yyyy')}</div>
                    <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                      {dayEvents.map((event) => (
                        <button
                          key={`${event.id}-popover-${key}`}
                          type="button"
                          onClick={() => { setOpenPopoverDay(null); onOpenEvent?.(event) }}
                          className="w-full rounded px-2 py-1.5 flex items-center gap-2 border-l-2 text-left hover:bg-gray-50"
                          style={{ borderLeftColor: event.colorMain, backgroundColor: event.color }}
                        >
                          <span className="font-semibold truncate flex-1 text-gray-800">{event.title}</span>
                          <span className="text-gray-600 whitespace-nowrap">{event.time.split(' - ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {!loading && events.length === 0 && (
          <div className="absolute inset-x-0 bottom-4 text-center text-xs text-gray-400 pointer-events-none">Không có lịch trong tháng này</div>
        )}
      </div>
    </div>
  )
}
