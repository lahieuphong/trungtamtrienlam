"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
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

function isSameToast(toast, nextToast) {
  return toast.type === nextToast.type
    && toast.message === nextToast.message
    && toast.position === nextToast.position
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastsRef = useRef([])

  const commitToasts = useCallback((nextToasts) => {
    toastsRef.current = nextToasts
    setToasts(nextToasts)
  }, [])

  const addToast = useCallback(({ type = TOAST_TYPES.INFO, message, duration = DEFAULT_TOAST_DURATION_MS, position = "top-right" }) => {
    const duplicateToast = toastsRef.current.find((toast) => isSameToast(toast, { type, message, position }))
    if (duplicateToast) return duplicateToast.id

    const id = uuidv4()
    const newToast = {
      id,
      type,
      message,
      duration,
      position,
    }

    commitToasts([...toastsRef.current, newToast])
    return id
  }, [commitToasts])

  const removeToast = useCallback((id) => {
    commitToasts(toastsRef.current.filter((toast) => toast.id !== id))
  }, [commitToasts])

  const updateToast = useCallback((id, newProps) => {
    commitToasts(toastsRef.current.map((toast) => (toast.id === id ? { ...toast, ...newProps } : toast)))
  }, [commitToasts])

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
