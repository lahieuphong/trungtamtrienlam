'use client'

import { BadgeCheck, CircleOff, LockKeyhole } from 'lucide-react'
import { CalendarConstants } from '@/constants/calendarConstants'

export function pad(value) {
  return String(value).padStart(2, '0')
}

export function formatDateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDateInput(date) {
  if (!date) return ''
  return formatDateKey(date)
}

export function formatTimeInput(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function combineDateAndTime(date, time) {
  if (!date || !time) return null
  return `${date}T${time}:00`
}

export function parseCalendarDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatEventTime(fromTime, toTime) {
  const from = parseCalendarDate(fromTime)
  const to = parseCalendarDate(toTime)
  if (!from || !to) return ''
  return `${pad(from.getHours())}:${pad(from.getMinutes())} - ${pad(to.getHours())}:${pad(to.getMinutes())}`
}

export function formatDateLabel(date) {
  const d = new Date(date)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function getEventTypeLabel(type) {
  switch (Number(type)) {
    case CalendarConstants.typeEvent.Meeting:
      return 'Cuộc họp'
    case CalendarConstants.typeEvent.Collaborate:
      return 'Công tác'
    case CalendarConstants.typeEvent.Other:
      return 'Khác'
    default:
      return 'Lịch'
  }
}

export function useCalendar() {
  function convertToEvent(calendars = []) {
    return calendars.map((item) => {
      const from = parseCalendarDate(item.fromTime || item.from_time || item.start_time)
      const to = parseCalendarDate(item.toTime || item.to_time || item.end_time)
      const type = Number(item.type ?? item.calendar_type ?? CalendarConstants.typeEvent.Meeting)
      let icon = {
        month: { content: '', color: '' },
        other: { content: '', color: '' },
      }

      if (item.isCanceled || item.is_canceled) {
        icon = {
          month: { content: <CircleOff className="w-4 h-4 opacity-70 shrink-0" />, color: 'text-orange-500' },
          other: { content: <CircleOff className="absolute bottom-1 right-1 w-4 h-4 text-orange-500 pointer-events-none" />, color: 'text-orange-500' },
        }
      }
      if (item.isLocked || item.is_locked) {
        icon = {
          month: { content: <LockKeyhole className="w-4 h-4 !text-gray-500 opacity-70 shrink-0" />, color: 'text-gray-500' },
          other: { content: <LockKeyhole className="absolute bottom-1 right-1 w-4 h-4 text-gray-500 pointer-events-none" />, color: 'text-gray-500' },
        }
      }
      if (item.isNewToday || item.is_new_today) {
        icon = {
          month: { content: <BadgeCheck className="w-4 h-4 !text-blue-600 opacity-70 shrink-0" />, color: 'text-blue-600' },
          other: { content: <BadgeCheck className="absolute bottom-1 right-1 w-4 h-4 text-blue-600 pointer-events-none" />, color: 'text-blue-600' },
        }
      }

      return {
        id: item.id,
        title: item.name || item.title || 'Không có tiêu đề',
        description: item.description || '',
        location: item.place || item.location || '',
        link: item.link || '',
        type,
        typeLabel: getEventTypeLabel(type),
        dayFrom: from ? formatDateKey(from) : '',
        dayTo: to ? formatDateKey(to) : '',
        time: formatEventTime(from, to),
        fromTime: from,
        toTime: to,
        color: CalendarConstants.eventColorMain[type] || CalendarConstants.eventColorMain[CalendarConstants.typeEvent.Other],
        colorMain: CalendarConstants.eventColor[type] || CalendarConstants.eventColor[CalendarConstants.typeEvent.Other],
        isLocked: Boolean(item.isLocked || item.is_locked),
        isCanceled: Boolean(item.isCanceled || item.is_canceled),
        cancelReason: item.cancelReason || item.cancel_reason || '',
        icon,
        raw: item,
      }
    }).filter((event) => event.fromTime && event.toTime)
  }

  return { convertToEvent }
}
