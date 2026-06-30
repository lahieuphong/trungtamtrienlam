'use client'

import { useState } from 'react'
import { addDays, addMonths, addWeeks, startOfDay, subDays, subMonths, subWeeks } from 'date-fns'
import { BadgeCheck, CalendarCheck, CircleOff, LockKeyhole, Plus, SquareArrowLeft, SquareArrowRight } from 'lucide-react'
import { CalendarReloadProvider } from '@/contexts/CalendarReloadContext'
import { CalendarConstants } from '@/constants/calendarConstants'
import FilterDropdown from './FilterDropdown'
import ToggleButtonGroup from './ToggleButtonGroup'
import DatePickerV2 from './DatePickerV2'
import CalendarButton from './CalendarButton'
import CalendarScrollWrapper from './CalendarScrollWrapper'
import Day from './views/Day'
import Week from './views/Week'
import Month from './views/Month'
import CalendarForm from './forms/calendar-form'
import EventDetail from './forms/event-detail'

const meetingOptions = [
  { id: CalendarConstants.typeEvent.All, label: 'Tất cả', dotColor: 'border border-gray-700', color: 'black' },
  { id: CalendarConstants.typeEvent.Meeting, label: 'Cuộc họp', color: 'green', dotColor: 'bg-green-500' },
  { id: CalendarConstants.typeEvent.Collaborate, label: 'Công tác', color: 'blue', dotColor: 'bg-blue-500' },
  { id: CalendarConstants.typeEvent.Other, label: 'Khác', color: 'gray', dotColor: 'bg-gray-400' },
]

function getCurrentWeek(weekStart = 'monday') {
  const today = new Date()
  const startDay = weekStart === 'monday' ? 1 : 0
  const startOfWeek = new Date(today)
  while (startOfWeek.getDay() !== startDay) startOfWeek.setDate(startOfWeek.getDate() - 1)
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  return { from: startOfWeek, to: endOfWeek }
}

export default function CalendarPage({ version = CalendarConstants.calendarVersion.v2 }) {
  const [view, setView] = useState(CalendarConstants.views.Month)
  const [joinType, setJoinType] = useState(CalendarConstants.joinTypes.Office)
  const [type, setType] = useState(CalendarConstants.typeEvent.All)
  const [selectDate, setSelectDate] = useState(new Date())
  const [selectDateWeek, setSelectDateWeek] = useState(getCurrentWeek('monday'))
  const [isOpenForm, setIsOpenForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const handlePrev = () => {
    switch (view) {
      case CalendarConstants.views.Day:
        setSelectDate((prev) => subDays(prev, 1))
        break
      case CalendarConstants.views.Week:
        setSelectDateWeek((prev) => {
          const nextFrom = subWeeks(prev.from, 1)
          nextFrom.setHours(0, 0, 0, 0)
          const nextTo = new Date(nextFrom)
          nextTo.setDate(nextFrom.getDate() + 6)
          nextTo.setHours(23, 59, 59, 999)
          return { from: nextFrom, to: nextTo }
        })
        break
      case CalendarConstants.views.Month:
      default:
        setSelectDate((prev) => subMonths(prev, 1))
        break
    }
  }

  const handleNext = () => {
    switch (view) {
      case CalendarConstants.views.Day:
        setSelectDate((prev) => addDays(prev, 1))
        break
      case CalendarConstants.views.Week:
        setSelectDateWeek((prev) => {
          const nextFrom = addWeeks(prev.from, 1)
          nextFrom.setHours(0, 0, 0, 0)
          const nextTo = new Date(nextFrom)
          nextTo.setDate(nextFrom.getDate() + 6)
          nextTo.setHours(23, 59, 59, 999)
          return { from: nextFrom, to: nextTo }
        })
        break
      case CalendarConstants.views.Month:
      default:
        setSelectDate((prev) => addMonths(prev, 1))
        break
    }
  }

  const getMode = (currentView) => currentView === CalendarConstants.views.Month ? 'month' : 'day'

  const today = startOfDay(new Date())
  const isCurrentDateSelected = view === CalendarConstants.views.Week
    ? selectDateWeek.from && selectDateWeek.to && today >= startOfDay(selectDateWeek.from) && today <= startOfDay(selectDateWeek.to)
    : selectDate && startOfDay(selectDate).getTime() === today.getTime()

  const viewKey = CalendarConstants.viewType[view]

  return (
    <CalendarReloadProvider>
      <>
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <h1 className="text-xl font-semibold mb-4">Quản lý lịch</h1>
          <CalendarButton onClick={() => setIsOpenForm(true)} variant="primary" leftIcon={<Plus className="w-6 h-6" />}>
            Thêm lịch
          </CalendarButton>
        </div>

        <ToggleButtonGroup
          options={[
            { value: CalendarConstants.joinTypes.Office, label: 'Lịch cơ quan' },
            { value: CalendarConstants.joinTypes.Personal, label: 'Lịch cá nhân' },
          ]}
          value={joinType}
          onChange={setJoinType}
          size="sm"
          buttonStyle={{ height: 30, minWidth: 50, fontSize: 14, backgroundColor: '#fffff' }}
          activeButtonStyle={{ borderRadius: 5 }}
          className="mb-6 mt-6"
        />

        <div className="bg-white p-4 border-b rounded-xl mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-3 items-center">
              <CalendarButton
                variant="outline"
                leftIcon={<CalendarCheck className="w-4 h-4" />}
                className={`h-[39px] ${isCurrentDateSelected ? ' !text-blue-500 !border-blue-300' : '!text-gray-600'}`}
                onClick={() => {
                  if (view === CalendarConstants.views.Week) setSelectDateWeek(getCurrentWeek('monday'))
                  else setSelectDate(new Date())
                }}
              >
                Hôm nay
              </CalendarButton>

              <ToggleButtonGroup
                options={[
                  { value: CalendarConstants.views.Day, label: 'Ngày' },
                  { value: CalendarConstants.views.Week, label: 'Tuần' },
                  { value: CalendarConstants.views.Month, label: 'Tháng' },
                ]}
                value={view}
                onChange={setView}
                size="sm"
                buttonStyle={{ height: 30, minWidth: 50, fontSize: 14 }}
                activeButtonStyle={{ borderRadius: 5 }}
              />

              <div className="w-[170px] sm:w-[200px]">
                {view !== CalendarConstants.views.Week ? (
                  <DatePickerV2 mode={getMode(view)} onChange={(value) => setSelectDate(value)} value={selectDate} />
                ) : (
                  <DatePickerV2 mode="week" onChange={(value) => setSelectDateWeek(value)} value={selectDateWeek} />
                )}
              </div>

              <div className="flex gap-1 items-center">
                <CalendarButton variant="outline" onClick={handlePrev} className="bg-gray-100 !px-2 rounded hover:!bg-blue-50 !border-none">
                  <SquareArrowLeft className="text-gray-600" size={23} />
                </CalendarButton>
                <CalendarButton variant="outline" onClick={handleNext} className="bg-gray-100 !px-2 rounded hover:!bg-blue-50 !border-none">
                  <SquareArrowRight className="text-gray-600" size={23} />
                </CalendarButton>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-blue-500">
                  <BadgeCheck className="w-4 h-4" />
                  <span className="text-sm">Mới</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                  <CircleOff className="w-4 h-4" />
                  <span className="text-sm">Hủy</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <LockKeyhole className="w-4 h-4" />
                  <span className="text-sm">Khóa</span>
                </div>
              </div>

              <FilterDropdown value={type} onChange={setType} options={meetingOptions} placeholder="Lọc" className="!w-[8rem]" height="!px-3 !py-2" />
            </div>
          </div>
        </div>

        <CalendarScrollWrapper>
          {view === CalendarConstants.views.Day ? (
            <Day date={selectDate} type={type} joinType={joinType} version={version} onOpenEvent={setSelectedEvent} />
          ) : view === CalendarConstants.views.Week ? (
            <Week fromDate={selectDateWeek.from} toDate={selectDateWeek.to} type={type} joinType={joinType} version={version} onOpenEvent={setSelectedEvent} />
          ) : (
            <Month date={selectDate} type={type} joinType={joinType} version={version} onOpenEvent={setSelectedEvent} />
          )}
        </CalendarScrollWrapper>

        {isOpenForm && (
          <CalendarForm
            isOpen={isOpenForm}
            onClose={() => setIsOpenForm(false)}
            view={viewKey}
            defaultDate={view === CalendarConstants.views.Week ? selectDateWeek.from : selectDate}
            onSelectDated={setSelectDate}
            version={version}
            onSelectDatedWeek={setSelectDateWeek}
          />
        )}

        <EventDetail
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          view={viewKey}
          version={version}
        />
      </>
    </CalendarReloadProvider>
  )
}
