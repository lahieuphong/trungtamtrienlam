'use client'

import { createContext, useContext, useState } from 'react'

const MaintenanceContext = createContext({
  isMaintenanceAllowed: false,
  setIsMaintenanceAllowed: () => {},
  isCountdown: false,
  setIsCountdown: () => {},
  startTime: null,
  setStartTime: () => {},
})

export function MaintenanceProvider({ children }) {
  const [isMaintenanceAllowed, setIsMaintenanceAllowed] = useState(false)
  const [isCountdown, setIsCountdown] = useState(false)
  const [startTime, setStartTime] = useState(null)

  return (
    <MaintenanceContext.Provider value={{
      isMaintenanceAllowed,
      setIsMaintenanceAllowed,
      isCountdown,
      setIsCountdown,
      startTime,
      setStartTime,
    }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenance() {
  return useContext(MaintenanceContext)
}
