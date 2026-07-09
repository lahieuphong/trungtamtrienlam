'use client'

import { createContext, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const ProgressContext = createContext({
  progresses: [],
  addProgress: () => {},
  onProgress: () => {},
  onPlay: () => {},
  onPause: () => {},
  onDelete: () => {},
})

export default ProgressContext

export const ProgressProvider = ({ children }) => {
  const [progresses, setProgresses] = useState([])

  const addProgress = (progress) => {
    const id = progress?.id || uuidv4()
    setProgresses((prev) => [...prev, { ...progress, id }])
    return id
  }
  const onProgress = (id, percentProgress, loadedSizeProgress, totalSizeProgress) => {
    setProgresses((prev) => prev.map((item) => item.id === id ? { ...item, percentProgress, loadedSizeProgress, totalSizeProgress } : item))
  }
  const onPlay = (id) => setProgresses((prev) => prev.map((item) => item.id === id ? { ...item, isPlayProgress: true } : item))
  const onPause = (id) => setProgresses((prev) => prev.map((item) => item.id === id ? { ...item, isPlayProgress: false } : item))
  const onDelete = (id) => setProgresses((prev) => prev.filter((item) => item.id !== id))

  const value = useMemo(() => ({ progresses, addProgress, onProgress, onPlay, onPause, onDelete }), [progresses])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}
