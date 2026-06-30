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
    <div className="w-full select-none">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white text-xs shadow-sm">
        <div className="flex border-b border-slate-200 bg-white">
          <div className="w-16 flex-shrink-0 border-r border-slate-200" />
          <div className="grid flex-1" style={gridColumnsStyle}>
            {weekDays.map((day) => {
              const today = isSameDay(day, new Date())
              return (
                <div key={day.toISOString()} className={`border-r border-slate-200 py-2.5 text-center text-[13px] font-medium last:border-r-0 ${today ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}>
                  <span className="block lg:hidden">{format(day, 'dd/MM')}</span>
                  <span className="hidden lg:block capitalize">{format(day, 'EEEE dd/MM', { locale: vi })}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative border-t border-blue-300" style={{ height: dayHeight }}>
          {timeSlots.map((time) => (
            <div key={time} className="absolute left-0 right-0 flex border-t border-slate-200" style={{ top: `${(Number(time.slice(0, 2)) / 24) * dayHeight}px` }}>
              <div className="w-16 flex-shrink-0 pt-1 text-center text-xs font-medium text-slate-500">{time.slice(0, 2)}</div>
              <div className="grid flex-1" style={gridColumnsStyle}>
                {weekDays.map((day) => <div key={`${time}-${day.toISOString()}`} className="border-l border-dotted border-slate-200" />)}
              </div>
            </div>
          ))}

          <div className="absolute left-16 top-0 z-10 h-full w-[calc(100%-64px)]">
            <div className="grid h-full" style={gridColumnsStyle}>
              {weekDays.map((day) => {
                const dayEvents = sortEvents(events.filter((event) => isSameDay(event.fromTime, day)))
                const stacks = new Map()
                return (
                  <div key={day.toISOString()} className="relative border-l border-dotted border-slate-200">
                    {dayEvents.map((event) => {
                      const minute = minutesOfDay(event.fromTime)
                      const stackIndex = stacks.get(minute) || 0
                      stacks.set(minute, stackIndex + 1)
                      return (
                        <TimelineEventBar
                          key={event.id}
                          event={event}
                          top={getEventTop(event, stackIndex)}
                          onOpen={onOpenEvent}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {showNowLine && nowColumn >= 0 && (
            <div className="pointer-events-none absolute z-20 h-0.5 bg-red-500" style={{ top: nowTop, left: `calc(64px + ${nowColumn} * ((100% - 64px) / 7))`, width: 'calc((100% - 64px) / 7)' }}>
              <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500 shadow" />
              <p className="absolute left-[25px] -top-5 -translate-x-1/2 rounded bg-red-600 px-1 text-xs text-white">{format(now, 'HH:mm')}</p>
            </div>
          )}
        </div>

        {loading && <div className="absolute right-3 top-10 z-30 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-blue-500 shadow-sm">Đang tải...</div>}
        {!loading && events.length === 0 && <div className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">Không có lịch trong tuần này</div>}
      </div>
    </div>
  )
}