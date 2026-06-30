import apiClient from '@/utils/apiClient'

const unwrap = async (promise) => (await promise).data

export const getCalendarDay = async (params = {}) => unwrap(apiClient.get('/calendars/GetCalendarDay/', { params }))
export const getCalendarWeek = async (params = {}) => unwrap(apiClient.get('/calendars/GetCalendarWeek/', { params }))
export const getCalendarMonth = async (params = {}) => unwrap(apiClient.get('/calendars/GetCalendarMonth/', { params }))
export const getDetailEventCalendar = async (params = {}) => unwrap(apiClient.get('/calendars/Detail/', { params }))

export const changeEventTime = async ({ id, fromTime, toTime }) => unwrap(
  apiClient.patch('/calendars/ChangeEventTime/', { id, fromTime, toTime })
)

export const createEvent = async (data) => unwrap(apiClient.post('/calendars/Create/', data))
export const updateEvent = async (data) => unwrap(apiClient.post('/calendars/Update/', data))
export const deleteEvent = async ({ id }) => unwrap(apiClient.post('/calendars/Delete/', { id }))
export const cancelEvent = async ({ id, cancelReason }) => unwrap(apiClient.patch('/calendars/Cancel/', { id, cancelReason }))
export const lockEvent = async ({ id }) => unwrap(apiClient.patch('/calendars/Lock/', { id }))
export const cancelUndoEvent = async ({ id }) => unwrap(apiClient.patch('/calendars/UndoCancel/', { id }))

export const getCalendarDayV2 = getCalendarDay
export const getCalendarWeekV2 = getCalendarWeek
export const getCalendarMonthV2 = getCalendarMonth
export const getDetailEventCalendarV2 = getDetailEventCalendar
export const changeEventTimeV2 = changeEventTime
export const createEventV2 = createEvent
export const updateEventV2 = updateEvent
export const deleteEventV2 = deleteEvent
export const cancelEventV2 = cancelEvent
export const lockEventV2 = lockEvent
export const cancelUndoEventV2 = cancelUndoEvent
