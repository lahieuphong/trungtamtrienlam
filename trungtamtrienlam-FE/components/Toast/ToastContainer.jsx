"use client"

import { useToastState } from "@/contexts/ToastContext"
import Toast from "./Toast"

export default function ToastContainer() {
  const { toasts, removeToast } = useToastState()

  const groupedToasts = toasts.reduce((acc, toast) => {
    const position = toast.position || "top-right"
    if (!acc[position]) {
      acc[position] = []
    }
    acc[position].push(toast)
    return acc
  }, {})

  const positionClasses = {
    "top-right": "pointer-events-none top-20 right-4 flex flex-col items-end",
    "top-left": "pointer-events-none top-20 left-4 flex flex-col items-start",
    "bottom-right": "pointer-events-none bottom-4 right-4 flex flex-col items-end",
    "bottom-left": "pointer-events-none bottom-4 left-4 flex flex-col items-start",
    "top-center": "pointer-events-none top-20 left-1/2 -translate-x-1/2 flex flex-col items-center",
    "bottom-center": "pointer-events-none bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center",
  }

  return (
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div key={position} className={`fixed z-[9998] ${positionClasses[position] || positionClasses["top-right"]}`}>
          {positionToasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
      ))}
    </>
  )
}
