'use client'

import { createContext, useCallback, useContext, useState } from 'react'

const CalendarReloadContext = createContext(null)

export const CalendarReloadProvider = ({ children }) => {
  const [reloadKey, setReloadKey] = useState({ day: 0, week: 0, month: 0 })

  const triggerReload = useCallback((view) => {
    setReloadKey((prev) => ({
      ...prev,
      [view]: (prev[view] || 0) + 1,
    }))
  }, [])

  return (
    <CalendarReloadContext.Provider value={{ reloadKey, triggerReload }}>
      {children}
    </CalendarReloadContext.Provider>
  )
}

export const useCalendarReload = () => {
  const context = useContext(CalendarReloadContext)
  if (!context) return { reloadKey: { day: 0, week: 0, month: 0 }, triggerReload: () => {} }
  return context
}
