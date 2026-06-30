'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, format, isSameDay, isWithinInterval, startOfMonth, startOfWeek, subDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronDown } from 'lucide-react'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { getCalendarMonth, getCalendarMonthV2 } from '@/lib/api/calendarApi'
import { useCalendar, formatDateKey } from '@/hooks/useCalendar'

const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const MAX_VISIBLE_EVENTS = 3
const WEEK_ROW_HEIGHT = 128
const EVENT_TOP = 8
const EVENT_ROW_HEIGHT = 24

function normalizeDate(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function generateCalendar(currentDate) {
  let start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const firstOfMonth = startOfMonth(currentDate)
  if (start.getTime() === firstOfMonth.getTime()) start = subDays(start, 7)

  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index))
  return Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7))
}

function eventHappensOn(event, day) {
  const start = normalizeDate(event.fromTime)
  const end = normalizeDate(event.toTime)
  return isWithinInterval(normalizeDate(day), { start, end })
}

function eventOverlapsWeek(event, weekStart, weekEnd) {
  const start = normalizeDate(event.fromTime)
  const end = normalizeDate(event.toTime)
  return start <= weekEnd && end >= weekStart
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const startDiff = new Date(a.fromTime).getTime() - new Date(b.fromTime).getTime()
    if (startDiff !== 0) return startDiff
    return String(a.title || '').localeCompare(String(b.title || ''), 'vi')
  })
}

function MonthEventBar({ event, style, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(event)}
      title={`${event.title} ${event.time}`}
      className="absolute z-10 flex h-5 items-center gap-1 overflow-hidden rounded-[3px] border-l-2 px-1 text-left text-[12px] leading-none text-slate-900 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={{ ...style, backgroundColor: event.color, borderLeftColor: event.colorMain }}
    >
      <span className="min-w-0 flex-1 truncate font-semibold">{event.title}</span>
      <span className={`${event.icon.month?.color || ''} flex shrink-0 items-center`}>{event.icon.month?.content}</span>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-600">{event.time?.split(' - ')[0]}</span>
    </button>
  )
}

export default function Month({ date, joinType, type, version, onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [openPopoverDay, setOpenPopoverDay] = useState(null)
  const { reloadKey } = useCalendarReload()
  const { convertToEvent } = useCalendar()

  const currentDate = new Date(date)
  const weeks = useMemo(() => generateCalendar(currentDate), [date])
  const days = useMemo(() => weeks.flat(), [weeks])
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
      map.set(key, sortEvents(events.filter((event) => eventHappensOn(event, day))))
    })
    return map
  }, [days, events])

  return (
    <div className="w-full select-none">
      <div className="relative rounded-xl border border-slate-200 bg-white text-xs shadow-sm">
        <div className="grid grid-cols-7 overflow-hidden rounded-t-xl border-b border-slate-200 bg-white text-center text-[13px] font-medium text-slate-700">
          {weekdays.map((day) => (
            <div key={day} className="border-r border-slate-200 py-2.5 last:border-r-0">{day}</div>
          ))}
        </div>

        <div className="relative">
          {weeks.map((week, weekIndex) => {
            const weekStart = normalizeDate(week[0])
            const weekEnd = normalizeDate(week[6])
            const weeklyEvents = sortEvents(events.filter((event) => eventOverlapsWeek(event, weekStart, weekEnd)))
            const occupiedRows = []
            const overflowByDay = {}
            const eventBars = []

            weeklyEvents.forEach((event) => {
              const eventStart = normalizeDate(event.fromTime)
              const eventEnd = normalizeDate(event.toTime)
              const startIdx = Math.max(0, differenceInCalendarDays(eventStart, weekStart))
              const endIdx = Math.min(6, differenceInCalendarDays(eventEnd, weekStart))
              if (endIdx < 0 || startIdx > 6) return

              let rowIndex = 0
              while (true) {
                if (!occupiedRows[rowIndex]) occupiedRows[rowIndex] = Array(7).fill(false)
                let hasConflict = false
                for (let col = startIdx; col <= endIdx; col += 1) {
                  if (occupiedRows[rowIndex][col]) {
                    hasConflict = true
                    break
                  }
                }
                if (!hasConflict) break
                rowIndex += 1
              }

              if (rowIndex >= MAX_VISIBLE_EVENTS) {
                const dayId = formatDateKey(addDays(weekStart, startIdx))
                overflowByDay[dayId] = [...(overflowByDay[dayId] || []), event]
                return
              }

              for (let col = startIdx; col <= endIdx; col += 1) occupiedRows[rowIndex][col] = true

              const colSpan = endIdx - startIdx + 1
              eventBars.push(
                <MonthEventBar
                  key={`${event.id}-${weekIndex}-${rowIndex}`}
                  event={event}
                  onOpen={onOpenEvent}
                  style={{
                    left: `calc(${(startIdx / 7) * 100}% + 4px)`,
                    width: `calc(${(colSpan / 7) * 100}% - 8px)`,
                    top: EVENT_TOP + rowIndex * EVENT_ROW_HEIGHT,
                  }}
                />
              )
            })

            return (
              <div
                key={weekIndex}
                className="relative grid grid-cols-7 border-b border-slate-200 last:border-b-0"
                style={{ minHeight: WEEK_ROW_HEIGHT }}
              >
                {week.map((day, dayIndex) => {
                  const key = formatDateKey(day)
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  const isToday = isSameDay(day, new Date())
                  const overflowEvents = overflowByDay[key] || []
                  const dayEvents = groupedEvents.get(key) || []
                  const isPopoverOpen = openPopoverDay === key

                  return (
                    <div
                      key={key}
                      className={`relative border-r border-slate-200 last:border-r-0 ${isCurrentMonth ? 'bg-white' : 'bg-slate-200/80'}`}
                    >
                      {overflowEvents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setOpenPopoverDay(isPopoverOpen ? null : key)}
                          className="absolute inset-x-1 z-20 flex h-6 items-center justify-center rounded-md bg-slate-100 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                          style={{ top: EVENT_TOP + MAX_VISIBLE_EVENTS * EVENT_ROW_HEIGHT }}
                        >
                          +{overflowEvents.length} thêm
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </button>
                      )}

                      {isPopoverOpen && (
                        <div
                          className={`absolute left-1/2 z-40 w-[260px] -translate-x-1/2 rounded-md border border-slate-200 bg-white p-2 shadow-xl ${weekIndex === 0 ? 'top-[94px]' : 'bottom-[34px]'}`}
                        >
                          <div className="mb-2 text-sm font-semibold text-slate-700 capitalize">
                            {format(day, 'EEEE dd/MM/yyyy', { locale: vi })}
                          </div>
                          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                            {dayEvents.map((event) => (
                              <button
                                key={`${event.id}-popover-${key}`}
                                type="button"
                                onClick={() => { setOpenPopoverDay(null); onOpenEvent?.(event) }}
                                className="flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-[3px] border-l-2 px-2 text-left text-[12px] hover:brightness-95"
                                style={{ backgroundColor: event.color, borderLeftColor: event.colorMain }}
                              >
                                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{event.title}</span>
                                <span className={`${event.icon.month?.color || ''} flex shrink-0 items-center`}>{event.icon.month?.content}</span>
                                <span className="shrink-0 whitespace-nowrap text-slate-600">{event.time?.split(' - ')[0]}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <span
                        className={`absolute bottom-2 left-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-medium ${isToday ? 'bg-blue-500 text-white' : isCurrentMonth ? 'text-slate-600' : 'text-slate-400'}`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  )
                })}
                {eventBars}
              </div>
            )
          })}
        </div>

        {loading && <div className="absolute right-3 top-10 z-30 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-blue-500 shadow-sm">Đang tải...</div>}
      </div>
    </div>
  )
}
