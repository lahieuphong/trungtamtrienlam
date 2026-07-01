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

const EVENT_TYPE_IDS = [
  CalendarConstants.typeEvent.Meeting,
  CalendarConstants.typeEvent.Collaborate,
  CalendarConstants.typeEvent.Other,
]

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1'
  }
  return false
}

function getCalendarType(item) {
  const candidates = [
    item.type,
    item.calendar_type,
    item.calendarType,
    item.typeEvent,
    item.event_type,
    item.eventType,
  ]

  for (const candidate of candidates) {
    const type = toNumberOrNull(candidate)
    if (type !== null && EVENT_TYPE_IDS.includes(type)) return type
  }

  return CalendarConstants.typeEvent.Other
}

function getStatusFlags(item, rawType) {
  const statusValues = [
    item.status,
    item.statusType,
    item.status_type,
    item.calendarStatus,
    item.calendar_status,
    rawType,
  ]
    .map(toNumberOrNull)
    .filter((value) => value !== null)

  return {
    isCanceled: toBoolean(item.isCanceled) || toBoolean(item.is_canceled) || statusValues.includes(CalendarConstants.typeEvent.Cancel),
    isLocked: toBoolean(item.isLocked) || toBoolean(item.is_locked) || statusValues.includes(CalendarConstants.typeEvent.Lock),
    isNewToday: toBoolean(item.isNewToday) || toBoolean(item.is_new_today),
  }
}

function getStatusIcon({ isCanceled, isLocked, isNewToday }) {
  if (isCanceled) {
    return {
      month: { content: <CircleOff className="w-4 h-4 opacity-70 shrink-0" />, color: 'text-orange-500' },
      other: { content: <CircleOff className="absolute bottom-1 right-1 w-4 h-4 text-orange-500 pointer-events-none" />, color: 'text-orange-500' },
    }
  }

  if (isLocked) {
    return {
      month: { content: <LockKeyhole className="w-4 h-4 !text-gray-500 opacity-70 shrink-0" />, color: 'text-gray-500' },
      other: { content: <LockKeyhole className="absolute bottom-1 right-1 w-4 h-4 text-gray-500 pointer-events-none" />, color: 'text-gray-500' },
    }
  }

  if (isNewToday) {
    return {
      month: { content: <BadgeCheck className="w-4 h-4 !text-blue-600 opacity-70 shrink-0" />, color: 'text-blue-600' },
      other: { content: <BadgeCheck className="absolute bottom-1 right-1 w-4 h-4 text-blue-600 pointer-events-none" />, color: 'text-blue-600' },
    }
  }

  return {
    month: { content: '', color: '' },
    other: { content: '', color: '' },
  }
}

function getStatusColors(type, { isCanceled, isLocked }) {
  const baseColor = CalendarConstants.eventColorMain[type] || CalendarConstants.eventColorMain[CalendarConstants.typeEvent.Other]
  const baseColorMain = CalendarConstants.eventColor[type] || CalendarConstants.eventColor[CalendarConstants.typeEvent.Other]

  if (isCanceled) return { color: '#FFF7E6', colorMain: '#FA8C16' }
  if (isLocked) return { color: '#F5F5F5', colorMain: '#8C8C8C' }
  return { color: baseColor, colorMain: baseColorMain }
}

function getCurrentMinute() {
  const current = new Date()
  current.setSeconds(0, 0)
  return current
}

function isPastEvent(fromTime, currentMinute = getCurrentMinute()) {
  return Boolean(fromTime && fromTime.getTime() < currentMinute.getTime())
}

export function useCalendar() {
  function convertToEvent(calendars = []) {
    const currentMinute = getCurrentMinute()

    return calendars.map((item) => {
      const from = parseCalendarDate(item.fromTime || item.from_time || item.start_time)
      const to = parseCalendarDate(item.toTime || item.to_time || item.end_time)
      const rawType = toNumberOrNull(item.type)
      const type = getCalendarType(item)
      const statusFlags = getStatusFlags(item, rawType)
      const isCanceled = statusFlags.isCanceled
      const isLocked = statusFlags.isLocked || isPastEvent(from, currentMinute)
      const isNewToday = statusFlags.isNewToday
      const icon = getStatusIcon({ isCanceled, isLocked, isNewToday })
      const { color, colorMain } = getStatusColors(type, { isCanceled, isLocked })

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
        color,
        colorMain,
        isLocked,
        isCanceled,
        isNewToday,
        typeUserJoin: item.typeUserJoin ?? item.type_user_join,
        cancelReason: item.cancelReason || item.cancel_reason || '',
        icon,
        raw: item,
      }
    }).filter((event) => event.fromTime && event.toTime)
  }

  return { convertToEvent }
}
