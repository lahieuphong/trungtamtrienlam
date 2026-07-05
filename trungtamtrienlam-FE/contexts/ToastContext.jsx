"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import ToastContainer from "@/components/Toast/ToastContainer"
import { DEFAULT_TOAST_DURATION_MS, TOAST_TYPES } from "@/components/Toast/constants"

const ToastActionsContext = createContext(null)
const ToastStateContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastActionsContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const useToastState = () => {
  const context = useContext(ToastStateContext)
  if (!context) {
    throw new Error("useToastState must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = TOAST_TYPES.INFO, message, duration = DEFAULT_TOAST_DURATION_MS, position = "top-right" }) => {
    const id = uuidv4()
    const newToast = {
      id,
      type,
      message,
      duration,
      position,
    }

    setToasts((prevToasts) => [...prevToasts, newToast])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const updateToast = useCallback((id, newProps) => {
    setToasts((prevToasts) => prevToasts.map((toast) => (toast.id === id ? { ...toast, ...newProps } : toast)))
  }, [])

  const success = useCallback(
    (message, options = {}) => addToast({ type: TOAST_TYPES.SUCCESS, message, ...options }),
    [addToast],
  )

  const error = useCallback(
    (message, options = {}) => addToast({ type: TOAST_TYPES.ERROR, message, ...options }),
    [addToast],
  )

  const warning = useCallback(
    (message, options = {}) => addToast({ type: TOAST_TYPES.WARNING, message, ...options }),
    [addToast],
  )

  const info = useCallback(
    (message, options = {}) => addToast({ type: TOAST_TYPES.INFO, message, ...options }),
    [addToast],
  )

  const actions = useMemo(() => ({
    addToast,
    removeToast,
    updateToast,
    success,
    error,
    warning,
    info,
  }), [addToast, error, info, removeToast, success, updateToast, warning])

  const state = useMemo(() => ({
    toasts,
    removeToast,
  }), [removeToast, toasts])

  return (
    <ToastActionsContext.Provider value={actions}>
      {children}
      <ToastStateContext.Provider value={state}>
        <ToastContainer />
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  )
}
