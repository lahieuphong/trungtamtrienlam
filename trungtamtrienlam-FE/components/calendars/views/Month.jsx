'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format, isSameDay, isWithinInterval, startOfMonth, startOfWeek, subDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronDown } from 'lucide-react'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { getCalendarMonth, getCalendarMonthV2 } from '@/lib/api/calendarApi'
import { useCalendar, formatDateKey } from '@/hooks/useCalendar'

const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const MAX_VISIBLE_EVENTS = 3
const WEEK_ROW_MIN_HEIGHT = 128
const EVENT_TOP = 8
const EVENT_ROW_HEIGHT = 24
const MORE_BUTTON_HEIGHT = 24
const MORE_BUTTON_TOP = EVENT_TOP + MAX_VISIBLE_EVENTS * EVENT_ROW_HEIGHT
const DAY_NUMBER_SPACE = 36

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

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const startDiff = new Date(a.fromTime).getTime() - new Date(b.fromTime).getTime()
    if (startDiff !== 0) return startDiff
    return String(a.title || '').localeCompare(String(b.title || ''), 'vi')
  })
}

function eventKey(event, dayKey, index) {
  const id = event.id ?? event.raw?.id ?? event.raw?.calendar_id ?? event.title ?? 'event'
  const start = event.fromTime ? new Date(event.fromTime).getTime() : 'start'
  const end = event.toTime ? new Date(event.toTime).getTime() : 'end'
  return `${dayKey}-${id}-${start}-${end}-${index}`
}

function capitalizeFirst(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function MonthEventBar({ event, top, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(event)}
      title={`${event.title} ${event.time}`}
      className="absolute inset-x-1 z-10 flex h-5 items-center gap-1 overflow-hidden rounded-[3px] border-l-2 px-1 text-left text-[12px] leading-none text-slate-900 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={{ top, backgroundColor: event.color, borderLeftColor: event.colorMain }}
    >
      <span className="min-w-0 flex-1 truncate font-semibold">{event.title}</span>
      <span className={`${event.icon.month?.color || ''} flex shrink-0 items-center`}>{event.icon.month?.content}</span>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-600">{event.time?.split(' - ')[0]}</span>
    </button>
  )
}

function getPopoverPositionClass(dayIndex) {
  if (dayIndex === 0) return 'left-1 -translate-y-full'
  if (dayIndex === 6) return 'right-1 -translate-y-full'
  return 'left-1/2 -translate-x-1/2 -translate-y-full'
}

function MonthOverflowPopover({ day, events, dayIndex, onOpen, onClose, innerRef }) {
  return (
    <div
      ref={innerRef}
      className={`absolute z-50 flex w-[270px] flex-col rounded-lg border border-slate-200 bg-white px-2 pb-3 pt-2 text-left shadow-xl ${getPopoverPositionClass(dayIndex)}`}
      style={{ top: MORE_BUTTON_TOP - 4 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-1 text-[13px] font-semibold text-slate-600">
        {capitalizeFirst(format(day, 'EEEE dd/MM/yyyy', { locale: vi }))}
      </div>
      <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
        {events.map((event, index) => (
          <button
            key={eventKey(event, formatDateKey(day), index)}
            type="button"
            onClick={() => {
              onClose()
              onOpen?.(event)
            }}
            className="flex h-6 w-full items-center gap-1 overflow-hidden rounded-[3px] border-l-2 px-1 text-left text-[12px] leading-none transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ backgroundColor: event.color, borderLeftColor: event.colorMain }}
            title={`${event.title} ${event.time}`}
          >
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{event.title}</span>
            <span className={`${event.icon.month?.color || ''} flex shrink-0 items-center`}>{event.icon.month?.content}</span>
            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-600">{event.time?.split(' - ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Month({ date, joinType, type, version, onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [openPopoverDay, setOpenPopoverDay] = useState(null)
  const popoverRef = useRef(null)
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

  useEffect(() => {
    setOpenPopoverDay(null)
  }, [date, joinType, type, reloadKey.month])

  useEffect(() => {
    if (!openPopoverDay) return

    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (popoverRef.current?.contains(target) || target.closest('[data-month-more-button]')) return
      setOpenPopoverDay(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openPopoverDay])

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
            const maxVisibleEventsInWeek = Math.max(
              0,
              ...week.map((day) => Math.min(groupedEvents.get(formatDateKey(day))?.length || 0, MAX_VISIBLE_EVENTS))
            )
            const hasOverflowInWeek = week.some((day) => (groupedEvents.get(formatDateKey(day))?.length || 0) > MAX_VISIBLE_EVENTS)
            const rowHeight = Math.max(
              WEEK_ROW_MIN_HEIGHT,
              EVENT_TOP + maxVisibleEventsInWeek * EVENT_ROW_HEIGHT + (hasOverflowInWeek ? MORE_BUTTON_HEIGHT : 0) + DAY_NUMBER_SPACE
            )

            return (
              <div
                key={weekIndex}
                className="relative grid grid-cols-7 border-b border-slate-200 last:border-b-0"
                style={{ minHeight: rowHeight }}
              >
                {week.map((day, dayIndex) => {
                  const key = formatDateKey(day)
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  const isToday = isSameDay(day, new Date())
                  const dayEvents = groupedEvents.get(key) || []
                  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS)
                  const overflowCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS)
                  const isPopoverOpen = openPopoverDay === key

                  return (
                    <div
                      key={key}
                      className={`relative border-r border-slate-200 last:border-r-0 ${isCurrentMonth ? 'bg-white' : 'bg-slate-200/80'}`}
                    >
                      {visibleEvents.map((event, eventIndex) => (
                        <MonthEventBar
                          key={eventKey(event, key, eventIndex)}
                          event={event}
                          onOpen={onOpenEvent}
                          top={EVENT_TOP + eventIndex * EVENT_ROW_HEIGHT}
                        />
                      ))}

                      {overflowCount > 0 && (
                        <>
                          <button
                            type="button"
                            data-month-more-button
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenPopoverDay(isPopoverOpen ? null : key)
                            }}
                            className="absolute inset-x-1 z-30 flex h-6 items-center justify-center rounded-lg bg-slate-100 px-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            style={{ top: MORE_BUTTON_TOP }}
                          >
                            +{overflowCount} thêm
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </button>

                          {isPopoverOpen && (
                            <MonthOverflowPopover
                              innerRef={popoverRef}
                              day={day}
                              events={dayEvents}
                              dayIndex={dayIndex}
                              onOpen={onOpenEvent}
                              onClose={() => setOpenPopoverDay(null)}
                            />
                          )}
                        </>
                      )}

                      <span
                        className={`absolute bottom-2 left-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-medium ${isToday ? 'bg-blue-500 text-white' : isCurrentMonth ? 'text-slate-600' : 'text-slate-400'}`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {loading && <div className="absolute right-3 top-10 z-30 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-blue-500 shadow-sm">Đang tải...</div>}
      </div>
    </div>
  )
}