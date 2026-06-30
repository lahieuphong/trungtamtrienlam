'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Heading,
  Italic,
  Link,
  Link2,
  List,
  ListOrdered,
  MapPin,
  Pencil,
  Redo2,
  Tag,
  Type,
  Underline,
  Undo2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/contexts/ToastContext'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { createEvent, createEventV2, updateEvent, updateEventV2 } from '@/lib/api/calendarApi'
import { combineDateAndTime, formatDateInput, formatTimeInput } from '@/hooks/useCalendar'

const optionTypeEvents = [
  { label: 'Cuộc họp', value: CalendarConstants.typeEvent.Meeting },
  { label: 'Công tác', value: CalendarConstants.typeEvent.Collaborate },
  { label: 'Khác', value: CalendarConstants.typeEvent.Other },
]

const scopeOptions = [
  { label: 'Toàn trung tâm', value: CalendarConstants.participateType.Department },
  { label: 'Chỉ cá nhân', value: CalendarConstants.participateType.Personal },
]

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const iconInputClass = 'h-10 w-full cursor-pointer rounded-md border border-slate-300 bg-white pl-3 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const labelClass = 'flex items-center gap-2 text-sm font-semibold text-slate-600'

const now = () => {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)
  return { start, end }
}

const pad = (value) => String(value).padStart(2, '0')

const formatDisplayDate = (value) => {
  if (!value) return ''
  const parts = String(value).split('-')
  if (parts.length !== 3 || parts[0].length !== 4) return value
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const parseDisplayDate = (value) => {
  const trimmed = value.trim()
  const viDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (viDate) {
    const [, day, month, year] = viDate
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return trimmed
}

const dateFromIso = (value) => {
  if (!value) return null
  const parts = String(value).split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

const isoFromDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1)

const getCalendarDays = (viewDate) => {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - mondayOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

const splitTime = (value) => {
  const [hour = '00', minute = '00'] = String(value || '').split(':')
  return {
    hour: hour.replace(/\D/g, '').slice(0, 2) || '00',
    minute: minute.replace(/\D/g, '').slice(0, 2) || '00',
  }
}

const normalizeTime = ({ hour, minute }) => {
  const nextHour = Math.min(Number(hour) || 0, 23)
  const nextMinute = Math.min(Number(minute) || 0, 59)
  return `${pad(nextHour)}:${pad(nextMinute)}`
}

const getFloatingPickerPosition = (target, container) => {
  if (!target) return null
  const rect = target.getBoundingClientRect()
  const containerRect = container?.getBoundingClientRect?.() || { top: 0, left: 0, width: window.innerWidth }
  const margin = 8
  const width = 256
  const top = rect.bottom - containerRect.top + 4
  const left = Math.min(Math.max(margin, rect.left - containerRect.left), containerRect.width - width - margin)

  return { top, left }
}

export default function CalendarForm({
  isOpen,
  onClose,
  view = 'month',
  version = CalendarConstants.calendarVersion.v2,
  calendar,
  defaultDate,
  onSelectDated,
  onSaved,
}) {
  const toast = useToast()
  const { triggerReload } = useCalendarReload()
  const initialTimes = useMemo(() => now(), [])
  const [saving, setSaving] = useState(false)
  const pickerLayerRef = useRef(null)
  const [activePicker, setActivePicker] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: CalendarConstants.typeEvent.Meeting,
    description: '',
    startDate: formatDateInput(defaultDate || initialTimes.start),
    startTime: formatTimeInput(defaultDate || initialTimes.start),
    endDate: formatDateInput(initialTimes.end),
    endTime: formatTimeInput(initialTimes.end),
    link: '',
    place: '',
    joinType: CalendarConstants.participateType.Department,
  })
  const [errors, setErrors] = useState({})
  const isVersionV2 = version === CalendarConstants.calendarVersion.v2

  useEffect(() => {
    if (!calendar) return
    const from = calendar.fromTime || calendar.raw?.fromTime || calendar.raw?.from_time || calendar.raw?.start_time
    const to = calendar.toTime || calendar.raw?.toTime || calendar.raw?.to_time || calendar.raw?.end_time
    setFormData({
      name: calendar.title || calendar.raw?.name || calendar.raw?.title || '',
      type: Number(calendar.type ?? calendar.raw?.type ?? CalendarConstants.typeEvent.Meeting),
      description: calendar.description || calendar.raw?.description || '',
      startDate: formatDateInput(from),
      startTime: formatTimeInput(from),
      endDate: formatDateInput(to),
      endTime: formatTimeInput(to),
      link: calendar.link || calendar.raw?.link || '',
      place: calendar.location || calendar.raw?.place || calendar.raw?.location || '',
      joinType: Number(calendar.raw?.joinType ?? calendar.raw?.join_type ?? CalendarConstants.participateType.Department),
    })
  }, [calendar])
  useEffect(() => {
    if (!activePicker) return

    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-calendar-picker-popover]') || target.closest('[data-calendar-picker-trigger]')) return
      setActivePicker(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activePicker])

  const setFieldValue = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFieldValue(name, value)
  }

  const handleDateChange = (name) => (event) => {
    setFieldValue(name, parseDisplayDate(event.target.value))
  }

  const clearDate = (name) => {
    setFieldValue(name, '')
  }

  const validate = () => {
    const nextErrors = {}
    const fromTime = combineDateAndTime(formData.startDate, formData.startTime)
    const toTime = combineDateAndTime(formData.endDate, formData.endTime)
    if (!formData.name.trim()) nextErrors.name = 'Tên lịch không được để trống'
    if (!formData.description.trim()) nextErrors.description = 'Nội dung sự kiện không được để trống'
    if (!fromTime) nextErrors.startDate = 'Thời gian bắt đầu không hợp lệ'
    if (!toTime) nextErrors.endDate = 'Thời gian kết thúc không hợp lệ'
    if (fromTime && toTime && new Date(toTime) < new Date(fromTime)) {
      nextErrors.endDate = 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    const fromTime = combineDateAndTime(formData.startDate, formData.startTime)
    const toTime = combineDateAndTime(formData.endDate, formData.endTime)
    const payload = {
      id: calendar?.id,
      name: formData.name.trim(),
      title: formData.name.trim(),
      type: Number(formData.type),
      calendar_type: Number(formData.type),
      description: formData.description,
      fromTime,
      toTime,
      start_time: fromTime,
      end_time: toTime,
      link: formData.link,
      place: formData.place,
      location: formData.place,
      joinType: Number(formData.joinType),
    }

    try {
      setSaving(true)
      if (calendar?.id) {
        version === CalendarConstants.calendarVersion.v1 ? await updateEvent(payload) : await updateEventV2(payload)
        toast.success('Cập nhật lịch thành công')
      } else {
        version === CalendarConstants.calendarVersion.v1 ? await createEvent(payload) : await createEventV2(payload)
        toast.success('Thêm lịch thành công')
      }
      triggerReload(view)
      onSelectDated?.(new Date(fromTime))
      onSaved?.()
      onClose?.()
    } catch (error) {
      const message = error?.response?.data?.message || 'Không lưu được lịch'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const openPicker = (name, target) => {
    if (!name) {
      setActivePicker(null)
      return
    }
    const position = getFloatingPickerPosition(target, pickerLayerRef.current)
    setActivePicker(position ? { name, ...position } : null)
  }

  const closeDialog = (open) => {
    if (!open && !saving) onClose?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[calc(100vh-56px)] w-[calc(100vw-32px)] max-w-3xl gap-0 overflow-visible rounded-lg border-0 bg-white p-0 shadow-2xl sm:max-w-[768px]">
        <DialogHeader className="border-b border-slate-200 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="text-lg font-semibold text-slate-950">
            {calendar?.id ? 'Cập nhật sự kiện' : 'Thêm sự kiện'}
          </DialogTitle>
        </DialogHeader>

        <form id="eventCalendarForm" onSubmit={handleSubmit} className="max-h-[calc(100vh-180px)] space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <section className="space-y-2">
            <FieldLabel icon={<Tag size={18} />} label="Phân Loại" required />
            <div className="flex flex-wrap items-center gap-5">
              {optionTypeEvents.map((option) => (
                <RadioOption
                  key={option.value}
                  name="type"
                  value={option.value}
                  checked={Number(formData.type) === option.value}
                  onChange={handleChange}
                >
                  {option.label}
                </RadioOption>
              ))}
            </div>
          </section>

          <Field label="Tên Lịch" icon={<Pencil size={18} />} error={errors.name} required>
            <input name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="Nhập tên lịch" />
          </Field>

          <Field label="Nội dung sự kiện" icon={<AlignLeft size={18} />} error={errors.description} required>
            <RichTextShell>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                className="min-h-[148px] w-full resize-none border-0 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                placeholder=""
              />
            </RichTextShell>
          </Field>

          <section className="space-y-3">
            <FieldLabel icon={<Clock size={18} />} label="Thời gian tham gia" required />
            <div className="space-y-2">
              <TimeRow
                label="Bắt đầu"
                timeName="startTime"
                timeValue={formData.startTime}
                dateName="startDate"
                dateValue={formData.startDate}
                activePicker={activePicker}
                pickerRoot={pickerLayerRef.current}
                onOpenPicker={openPicker}
                onSetField={setFieldValue}
                onTimeChange={handleChange}
                onDateChange={handleDateChange('startDate')}
                onClearDate={() => clearDate('startDate')}
              />
              <TimeRow
                label="Kết thúc"
                timeName="endTime"
                timeValue={formData.endTime}
                dateName="endDate"
                dateValue={formData.endDate}
                activePicker={activePicker}
                pickerRoot={pickerLayerRef.current}
                onOpenPicker={openPicker}
                onSetField={setFieldValue}
                onTimeChange={handleChange}
                onDateChange={handleDateChange('endDate')}
                onClearDate={() => clearDate('endDate')}
              />
            </div>
            {(errors.startDate || errors.endDate) && <p className="text-xs text-red-500">{errors.startDate || errors.endDate}</p>}
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Link" icon={<Link size={18} />}>
              <input name="link" value={formData.link} onChange={handleChange} className={inputClass} placeholder="Nhập link" />
            </Field>
            <Field label="Địa điểm" icon={<MapPin size={18} />}>
              <input name="place" value={formData.place} onChange={handleChange} className={inputClass} placeholder="Nhập địa điểm" />
            </Field>
          </div>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-5">
              {scopeOptions.map((option) => (
                <RadioOption
                  key={option.value}
                  name="joinType"
                  value={option.value}
                  checked={Number(formData.joinType) === option.value}
                  onChange={handleChange}
                >
                  {option.label}
                </RadioOption>
              ))}
            </div>
          </section>
        </form>

        <div ref={pickerLayerRef} className="pointer-events-none absolute inset-0 z-[100]" />

        <DialogFooter className="border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:space-x-2 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="min-w-[84px] gap-1.5">
            <X size={16} />
            Hủy
          </Button>
          <Button
            type="submit"
            form="eventCalendarForm"
            disabled={saving}
            className="min-w-[112px] gap-1.5 bg-blue-500 text-white hover:bg-blue-600"
          >
            <Check size={16} />
            {saving ? 'Đang lưu' : 'Hoàn tất'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, icon, required, error, children }) {
  return (
    <section className="space-y-2">
      <FieldLabel icon={icon} label={label} required={required} />
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </section>
  )
}

function FieldLabel({ icon, label, required }) {
  return (
    <div className={labelClass}>
      <span className="text-slate-500">{icon}</span>
      <span>
        {label} {required && <span className="text-red-500">*</span>}
      </span>
    </div>
  )
}

function RadioOption({ name, value, checked, onChange, children }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 group">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors group-hover:border-[#597EF7] peer-focus:ring-2 peer-focus:ring-[#597EF7]/50 ${checked ? 'border-[#597EF7]' : 'border-slate-300'}`}>
        <span className={`h-3 w-3 rounded-full bg-[#597EF7] transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
      </span>
      <span>{children}</span>
    </label>
  )
}
function RichTextShell({ children }) {
  const toolbarItems = [
    { key: 'bold', Icon: Bold },
    { key: 'italic', Icon: Italic },
    { key: 'underline', Icon: Underline },
    { key: 'divider-1', divider: true },
    { key: 'link', Icon: Link2 },
    { key: 'divider-2', divider: true },
    { key: 'list', Icon: List },
    { key: 'list-ordered', Icon: ListOrdered },
    { key: 'divider-3', divider: true },
    { key: 'align-left', Icon: AlignLeft },
    { key: 'align-center', Icon: AlignCenter },
    { key: 'align-right', Icon: AlignRight },
  ]

  return (
    <div className="overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      <div className="flex min-h-12 flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 px-2 py-2 text-slate-600">
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200">
          <Undo2 size={16} />
        </button>
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200">
          <Redo2 size={16} />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-300" />
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 hover:bg-slate-100">
          H <ChevronDown size={14} />
        </button>
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 hover:bg-slate-100">
          <Type size={16} /> <ChevronDown size={14} />
        </button>
        <input type="color" value="#000000" readOnly className="ml-1 h-7 w-7 cursor-pointer rounded border border-slate-300 bg-white p-0" aria-label="Màu chữ" />
        <span className="mx-1 h-6 w-px bg-slate-300" />
        {toolbarItems.map((item) => {
          if (item.divider) return <span key={item.key} className="mx-1 h-6 w-px bg-slate-300" />
          const Icon = item.Icon
          return (
            <button key={item.key} type="button" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200 hover:text-slate-900">
              <Icon size={16} />
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}
function TimeRow({
  label,
  timeName,
  timeValue,
  dateName,
  dateValue,
  activePicker,
  pickerRoot,
  onOpenPicker,
  onSetField,
  onTimeChange,
  onDateChange,
  onClearDate,
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[64px_124px_minmax(220px,1fr)] sm:items-center">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          name={timeName}
          data-calendar-picker-trigger
          value={timeValue}
          onChange={onTimeChange}
          onFocus={(event) => onOpenPicker(timeName, event.currentTarget, 'time')}
          className={iconInputClass}
          placeholder="hh:mm"
        />
        <Clock size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        {activePicker?.name === timeName && pickerRoot && createPortal(
          <div data-calendar-picker-popover className="pointer-events-auto absolute z-[9999]" style={{ top: activePicker.top, left: activePicker.left }}>
            <TimePopover
              value={timeValue}
              onChange={(value) => onSetField(timeName, value)}
              onClose={() => onOpenPicker(null)}
            />
          </div>,
          pickerRoot
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          name={dateName}
          data-calendar-picker-trigger
          value={formatDisplayDate(dateValue)}
          onChange={onDateChange}
          onFocus={(event) => onOpenPicker(dateName, event.currentTarget, 'date')}
          className="h-10 w-full cursor-pointer rounded-md border border-slate-300 bg-white pl-3 pr-16 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="dd/mm/yyyy"
        />
        {dateValue && (
          <button
            type="button"
            onClick={onClearDate}
            data-calendar-picker-trigger
            className="absolute right-9 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Xóa ngày"
          >
            <X size={14} />
          </button>
        )}
        <CalendarDays size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        {activePicker?.name === dateName && pickerRoot && createPortal(
          <div data-calendar-picker-popover className="pointer-events-auto absolute z-[9999]" style={{ top: activePicker.top, left: activePicker.left }}>
            <DatePopover
              value={dateValue}
              onSelect={(value) => {
                onSetField(dateName, value)
                onOpenPicker(null)
              }}
            />
          </div>,
          pickerRoot
        )}
      </div>
    </div>
  )
}

function TimePopover({ value, onChange, onClose }) {
  const [draft, setDraft] = useState(() => splitTime(value))

  useEffect(() => {
    setDraft(splitTime(value))
  }, [value])

  const updateDraft = (field, nextValue) => {
    setDraft((current) => ({ ...current, [field]: nextValue.replace(/\D/g, '').slice(0, 2) }))
  }

  const stepDraft = (field, amount) => {
    setDraft((current) => {
      const limit = field === 'hour' ? 24 : 60
      const currentValue = Number(current[field])
      const nextValue = ((Number.isNaN(currentValue) ? 0 : currentValue) + amount + limit) % limit
      return { ...current, [field]: pad(nextValue) }
    })
  }

  const commit = (nextValue) => {
    onChange(nextValue)
    onClose()
  }

  return (
    <div className="w-[256px] rounded-md border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-end gap-3 text-center">
        <TimeNumberInput
          label="Giờ"
          value={draft.hour}
          onChange={(nextValue) => updateDraft('hour', nextValue)}
          onIncrement={() => stepDraft('hour', 1)}
          onDecrement={() => stepDraft('hour', -1)}
        />
        <span className="pb-1 text-xl font-semibold text-slate-900">:</span>
        <TimeNumberInput
          label="Phút"
          value={draft.minute}
          onChange={(nextValue) => updateDraft('minute', nextValue)}
          onIncrement={() => stepDraft('minute', 1)}
          onDecrement={() => stepDraft('minute', -1)}
        />
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {['07:00', '12:00', '17:30'].map((time) => (
          <button key={time} type="button" onClick={() => commit(time)} className="h-7 rounded bg-slate-100 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600">
            {time}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <Button type="button" size="sm" className="bg-blue-500 text-white hover:bg-blue-600" onClick={() => commit(normalizeTime(draft))}>
          Xác nhận
        </Button>
      </div>
    </div>
  )
}

function TimeNumberInput({ label, value, onChange, onIncrement, onDecrement }) {
  return (
    <label className="space-y-1 text-xs text-slate-500">
      <span>{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-center text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded border border-slate-200 bg-slate-50 shadow-sm">
          <button
            type="button"
            onClick={onIncrement}
            className="flex h-4 w-5 items-center justify-center text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
            aria-label={`Tăng ${label.toLowerCase()}`}
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-4 w-5 items-center justify-center border-t border-slate-200 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
            aria-label={`Giảm ${label.toLowerCase()}`}
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
    </label>
  )
}

function DatePopover({ value, onSelect }) {
  const selectedDate = dateFromIso(value)
  const [viewDate, setViewDate] = useState(selectedDate || new Date())
  const today = new Date()
  const days = getCalendarDays(viewDate)

  useEffect(() => {
    const nextDate = dateFromIso(value)
    if (nextDate) setViewDate(nextDate)
  }, [value])

  return (
    <div className="w-[256px] rounded-md border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100" onClick={() => setViewDate((current) => addMonths(current, -1))}>
          <ChevronLeft size={16} />
        </button>
        <div className="font-semibold text-slate-900">tháng {pad(viewDate.getMonth() + 1)} {viewDate.getFullYear()}</div>
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100" onClick={() => setViewDate((current) => addMonths(current, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-slate-700">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((date) => {
          const iso = isoFromDate(date)
          const isMuted = date.getMonth() !== viewDate.getMonth()
          const isSelected = selectedDate && sameDay(date, selectedDate)
          const isToday = sameDay(date, today)
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`h-8 rounded-md text-sm transition-colors ${isSelected ? 'bg-blue-500 font-semibold text-white' : isToday ? 'bg-blue-50 font-semibold text-blue-600' : isMuted ? 'text-slate-300 hover:bg-slate-50' : 'text-slate-900 hover:bg-slate-100'}`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
