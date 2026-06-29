"use client"

import { useEffect, useState } from "react"
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { TOAST_TYPES } from "./constants"

const toastTypeConfig = {
  [TOAST_TYPES.SUCCESS]: {
    icon: CheckCircle,
    bgColor: "bg-[#f6ffed]",
    borderColor: "border-[#52c41a]",
    textColor: "text-[#52c41a]",
    iconColor: "text-[#52c41a]",
  },
  [TOAST_TYPES.ERROR]: {
    icon: AlertCircle,
    bgColor: "bg-[#fff2f0]",
    borderColor: "border-[#ff4d4f]",
    textColor: "text-[#ff4d4f]",
    iconColor: "text-[#ff4d4f]",
  },
  [TOAST_TYPES.WARNING]: {
    icon: AlertTriangle,
    bgColor: "bg-[#fffbe6]",
    borderColor: "border-[#faad14]",
    textColor: "text-[#faad14]",
    iconColor: "text-[#faad14]",
  },
  [TOAST_TYPES.INFO]: {
    icon: Info,
    bgColor: "bg-[#e6f7ff]",
    borderColor: "border-[#1890ff]",
    textColor: "text-[#1890ff]",
    iconColor: "text-[#1890ff]",
  },
}

const formatErrorMessages = (message) => {
  if (typeof message === "string") {
    return message
  }

  if (Array.isArray(message)) {
    return message
  }

  if (typeof message === "object" && message !== null) {
    const errorMessages = []

    for (const key in message) {
      const value = message[key]
      if (!value) continue

      const text = Array.isArray(value) ? value.join(", ") : String(value)
      if (!text.trim()) continue

      const formattedKey = key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        .replace(/^./, (str) => str.toUpperCase())

      errorMessages.push(`${formattedKey}: ${text}`)
    }

    return errorMessages.length > 0 ? errorMessages : "Đã xảy ra lỗi"
  }

  return "Đã xảy ra lỗi"
}

export default function Toast({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false)
  const { id, type, message, duration } = toast

  const config = toastTypeConfig[type] || toastTypeConfig[TOAST_TYPES.INFO]
  const Icon = config.icon
  const formattedMessage = formatErrorMessages(message)
  const isMessageArray = Array.isArray(formattedMessage)

  useEffect(() => {
    if (!duration) return undefined

    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onRemove(id)
      }, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onRemove])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(id)
    }, 300)
  }

  return (
    <div
      className={`pointer-events-auto flex items-start w-full max-w-md shadow-md rounded-md overflow-hidden mb-4 transition-all duration-300 will-change-transform ${isExiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"} ${config.bgColor}`}
      role="alert"
    >
      <div className={`w-1.5 h-full self-stretch ${config.borderColor}`}></div>
      <div className="flex-1 flex p-4">
        <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <div className="text-[#1f1f1f] flex-1 text-sm leading-5">
          {isMessageArray ? (
            <ul className="list-disc pl-5 space-y-1">
              {formattedMessage.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{formattedMessage}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-3 text-gray-400 hover:text-gray-600 focus:outline-none flex-shrink-0"
          aria-label="Close"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
