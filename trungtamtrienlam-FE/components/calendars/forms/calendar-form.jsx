'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlignLeft, CalendarDays, Check, Clock, Link, MapPin, Pencil, Tag, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { useToast } from '@/contexts/ToastContext'
import { CalendarConstants } from '@/constants/calendarConstants'
import { useCalendarReload } from '@/contexts/CalendarReloadContext'
import { createEvent, createEventV2, updateEvent, updateEventV2 } from '@/lib/api/calendarApi'
import CalendarButton from '../CalendarButton'
import { combineDateAndTime, formatDateInput, formatTimeInput } from '@/hooks/useCalendar'

const optionTypeEvents = [
  { label: 'Cuộc họp', value: CalendarConstants.typeEvent.Meeting },
  { label: 'Công tác', value: CalendarConstants.typeEvent.Collaborate },
  { label: 'Khác', value: CalendarConstants.typeEvent.Other },
]

const now = () => {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)
  return { start, end }
}

export default function CalendarForm({
  isOpen,
  onClose,
  view = 'month',
  version = CalendarConstants.calendarVersion.v2,
  calendar,
  defaultDate,
  onSelectDated,
  onSelectJoinType,
  onSelectType,
  onSaved,
}) {
  const toast = useToast()
  const { triggerReload } = useCalendarReload()
  const initialTimes = useMemo(() => now(), [])
  const [saving, setSaving] = useState(false)
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

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const validate = () => {
    const nextErrors = {}
    const fromTime = combineDateAndTime(formData.startDate, formData.startTime)
    const toTime = combineDateAndTime(formData.endDate, formData.endTime)
    if (!formData.name.trim()) nextErrors.name = 'Tên lịch không được để trống'
    if (!formData.description.trim()) nextErrors.description = 'Mô tả không được để trống'
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
      onSelectJoinType?.(payload.joinType === CalendarConstants.participateType.Personal ? CalendarConstants.joinTypes.Personal : CalendarConstants.joinTypes.Office)
      onSelectType?.(payload.type)
      onSaved?.()
      onClose?.()
    } catch (error) {
      const message = error?.response?.data?.message || 'Không lưu được lịch'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <>
      <CalendarButton variant="outline" onClick={onClose} disabled={saving}>
        <X size={16} className="mr-2" />
        Hủy
      </CalendarButton>
      <CalendarButton variant="danger" type="submit" form="eventCalendarForm" isLoading={saving}>
        <Check size={16} className="mr-2" />
        Lưu
      </CalendarButton>
    </>
  )

  return (
    <Modal open={isOpen} onClose={onClose} title={calendar?.id ? 'Cập nhật lịch' : 'Thêm lịch'} size="xl" footer={footer}>
      <form id="eventCalendarForm" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="mb-2 flex items-center text-sm font-medium text-gray-700">
            <Tag size={18} className="mr-2 text-gray-500" />
            Loại lịch <span className="text-red-500">*</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {optionTypeEvents.map((option) => (
              <label key={option.value} className={`flex items-center rounded-lg border px-3 py-2 text-sm cursor-pointer ${Number(formData.type) === option.value ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="type" value={option.value} checked={Number(formData.type) === option.value} onChange={handleChange} className="mr-2" />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <Field label="Tên lịch" icon={<Pencil size={18} className="mr-2 text-gray-500" />} error={errors.name} required>
          <input name="name" value={formData.name} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Nhập tên lịch" />
        </Field>

        <Field label="Mô tả" icon={<AlignLeft size={18} className="mr-2 text-gray-500" />} error={errors.description} required>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Nhập mô tả" />
        </Field>

        <Field label="Thời gian" icon={<Clock size={18} className="mr-2 text-gray-500" />} error={errors.startDate || errors.endDate} required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Link" icon={<Link size={18} className="mr-2 text-gray-500" />}>
            <input name="link" value={formData.link} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nhập link" />
          </Field>
          <Field label="Địa điểm" icon={<MapPin size={18} className="mr-2 text-gray-500" />}>
            <input name="place" value={formData.place} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nhập địa điểm" />
          </Field>
        </div>

        <Field label="Phạm vi lịch" icon={<CalendarDays size={18} className="mr-2 text-gray-500" />}>
          <div className="flex flex-wrap gap-2">
            <label className={`flex items-center rounded-lg border px-3 py-2 text-sm cursor-pointer ${Number(formData.joinType) === CalendarConstants.participateType.Department ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="joinType" value={CalendarConstants.participateType.Department} checked={Number(formData.joinType) === CalendarConstants.participateType.Department} onChange={handleChange} className="mr-2" />
              Lịch cơ quan
            </label>
            <label className={`flex items-center rounded-lg border px-3 py-2 text-sm cursor-pointer ${Number(formData.joinType) === CalendarConstants.participateType.Personal ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="joinType" value={CalendarConstants.participateType.Personal} checked={Number(formData.joinType) === CalendarConstants.participateType.Personal} onChange={handleChange} className="mr-2" />
              Lịch cá nhân
            </label>
          </div>
        </Field>
      </form>
    </Modal>
  )
}

function Field({ label, icon, required, error, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center text-sm font-medium text-gray-700">
        {icon}
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
