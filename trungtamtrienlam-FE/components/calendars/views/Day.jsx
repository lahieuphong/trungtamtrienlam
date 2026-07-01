'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { getCalendarDay, getCalendarDayV2 } from '@/lib/api/calendarApi'
import { useCalendar, formatDateKey } from '@/hooks/useCalendar'

const timeSlots = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, '0')}:00`)
const dayHeight = 960
const EVENT_BAR_HEIGHT = 24

function minutesOfDay(date) {
  const d = new Date(date)
  return d.getHours() * 60 + d.getMinutes()
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const startDiff = new Date(a.fromTime).getTime() - new Date(b.fromTime).getTime()
    if (startDiff !== 0) return startDiff
    return String(a.title || '').localeCompare(String(b.title || ''), 'vi')
  })
}

function getEventTop(event, stackIndex = 0) {
  const baseTop = (minutesOfDay(event.fromTime) / 1440) * dayHeight
  return Math.min(dayHeight - EVENT_BAR_HEIGHT - 2, baseTop + stackIndex * EVENT_BAR_HEIGHT)
}

function TimelineEventBar({ event, top, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(event)}
      title={`${event.title} ${event.time}`}
      className="absolute z-10 flex h-5 items-center gap-1 overflow-hidden rounded-[3px] border-l-2 px-1 text-left text-[12px] leading-none text-slate-900 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={{ top, left: 4, width: 'calc(100% - 8px)', backgroundColor: event.color, borderLeftColor: event.colorMain }}
    >
      <span className="min-w-0 flex-1 truncate font-semibold">{event.title}</span>
      <span className={`${event.icon.month?.color || ''} flex shrink-0 items-center`}>{event.icon.month?.content}</span>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-600">{event.time?.split(' - ')[0]}</span>
    </button>
  )
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

  const sortedEvents = useMemo(() => sortEvents(events), [events])
  const eventPositions = useMemo(() => {
    const stacks = new Map()
    return sortedEvents.map((event) => {
      const minute = minutesOfDay(event.fromTime)
      const stackIndex = stacks.get(minute) || 0
      stacks.set(minute, stackIndex + 1)
      return { event, top: getEventTop(event, stackIndex) }
    })
  }, [sortedEvents])

  const nowTop = (minutesOfDay(now) / 1440) * dayHeight
  const showNowLine = isSameDay(selectedDate, now)

  return (
    <div className="w-full select-none">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white text-xs shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 text-[14px] font-medium text-blue-600">
          <span className="capitalize">{format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
          {loading && <span className="text-xs text-blue-500">Đang tải...</span>}
        </div>

        <div className="relative border-l border-blue-300" style={{ height: dayHeight }}>
          {timeSlots.map((time) => (
            <div key={time} className="absolute left-0 right-0 flex border-t border-slate-200 text-xs text-slate-400" style={{ top: `${(Number(time.slice(0, 2)) / 24) * dayHeight}px` }}>
              <div className="w-16 flex-shrink-0 pt-1 text-center text-xs font-medium text-slate-500">{time.slice(0, 2)}</div>
              <div className="flex-1 border-l border-dotted border-slate-200" />
            </div>
          ))}

          {showNowLine && (
            <div className="pointer-events-none absolute left-16 right-0 z-[8]" style={{ top: nowTop }}>
              <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-rose-500 via-rose-400/80 to-rose-200/20" />
              <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.16)]" />
              <div className="absolute -left-16 -top-3 flex h-6 w-14 items-center justify-center rounded-full bg-rose-500 px-2 text-[11px] font-semibold leading-none text-white shadow-sm ring-2 ring-white">
                {format(now, 'HH:mm')}
              </div>
            </div>
          )}

          <div className="absolute left-16 right-0 top-0 h-full">
            {eventPositions.map(({ event, top }) => (
              <TimelineEventBar key={event.id} event={event} top={top} onOpen={onOpenEvent} />
            ))}
          </div>

          {!loading && events.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">Không có lịch trong ngày này</div>
          )}
        </div>
      </div>
    </div>
  )
}