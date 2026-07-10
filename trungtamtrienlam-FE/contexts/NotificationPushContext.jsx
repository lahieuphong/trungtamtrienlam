"use client"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import Image from "next/image"
import NotificationItem from "@/components/notifications/NotificationItem"

const NOTIFICATION_LIMIT = 5
const DISMISS_DELAY_MS = 20000
const NOTIFICATION_MODES = { PUSH: "push", NOTI: "noti" }
const CHAT_NOTIFICATION_TYPE = 10

const NotificationContext = createContext(null)

const parseMetaData = value => {
  if (!value) return null
  if (typeof value === "object") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const normalizeNotification = notification => {
  if (!notification || typeof notification !== "object") return notification

  const metaData = parseMetaData(notification.metaData ?? notification.MetaData)
  const referenceType = String(
    notification.referenceType ?? notification.reference_type ?? notification.ReferenceType ?? ""
  ).toLowerCase()
  const rawType =
    notification.type ??
    notification.Type ??
    notification.notificationType ??
    notification.notification_type ??
    notification.NotificationType
  const rawRefID =
    notification.refID ??
    notification.RefID ??
    notification.referenceId ??
    notification.reference_id ??
    notification.ReferenceID ??
    metaData?.chatID ??
    metaData?.ChatID
  const isChatNotification =
    referenceType === "chat" ||
    Number(rawType) === CHAT_NOTIFICATION_TYPE ||
    Boolean(metaData?.chatID || metaData?.ChatID)
  const normalizedType = isChatNotification ? CHAT_NOTIFICATION_TYPE : rawType

  return {
    ...notification,
    id: String(notification.id ?? notification.ID ?? notification.notiId ?? ""),
    type: normalizedType,
    refID: rawRefID == null ? rawRefID : String(rawRefID),
    title: notification.title ?? notification.Title ?? "",
    content: notification.content ?? notification.Content ?? notification.message ?? "",
    isRead: Boolean(notification.isRead ?? notification.IsRead ?? notification.is_read),
    createdDate:
      notification.createdDate ??
      notification.CreatedDate ??
      notification.created_at ??
      notification.createdAt,
    time:
      notification.time ??
      notification.createdDate ??
      notification.CreatedDate ??
      notification.created_at ??
      notification.createdAt,
    metaData,
  }
}

const normalizeNotificationList = value => {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.results)
      ? value.results
      : Array.isArray(value?.data)
        ? value.data
        : Array.isArray(value?.data?.data)
          ? value.data.data
          : []

  return list.map(normalizeNotification).filter(Boolean)
}

function createNotification(message, mode) {
  const notiId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  if (mode === NOTIFICATION_MODES.PUSH) {
    return { notiId, mode, message }
  }
  return {
    notiId,
    mode,
    ...(message && typeof message === "object" ? normalizeNotification(message) : { message }),
  }
}

function CloseButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-gray-400 hover:text-gray-700 transition ${className}`}
      aria-label="Close notification"
    >
      <X size={18} strokeWidth={1.75} />
    </button>
  )
}

function PushNotificationToast({ notification, onRemove }) {
  return (
    <div className="max-w-md relative border rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 animate-slideDown transition-all hover:shadow-xl pointer-events-auto bg-white border-blue-300">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 mt-[2px]">
          <Image src="/bell.gif" alt="bell" width={50} height={50} />
        </div>
        <div className="flex-1 text-gray-900 text-sm leading-snug break-words whitespace-normal pr-8">
          <div dangerouslySetInnerHTML={{ __html: notification.message || "" }} />
        </div>
      </div>
      <CloseButton onClick={() => onRemove(notification.notiId)} className="mt-[2px]" />
    </div>
  )
}

function NotificationItemToast({ notification, onRemove }) {
  return (
    <div
      style={{ width: 460, height: "auto", flexShrink: 0 }}
      className="relative pointer-events-auto animate-fadeIn border border-gray-200 rounded-xl shadow-lg bg-white"
    >
      <NotificationItem
        onMarkRead={() => onRemove(notification.notiId)}
        n={notification}
        read={false}
        turnOffNotification={onRemove}
      />
      <CloseButton
        onClick={() => onRemove(notification.notiId)}
        className="mt-[2px] absolute top-1 right-1"
      />
    </div>
  )
}

function NotificationToast({ notification, onRemove }) {
  if (notification.mode === NOTIFICATION_MODES.PUSH) {
    return <PushNotificationToast notification={notification} onRemove={onRemove} />
  }
  if (notification.mode === NOTIFICATION_MODES.NOTI) {
    return <NotificationItemToast notification={notification} onRemove={onRemove} />
  }
  return null
}

function NotificationToastList({ notifications, onRemove }) {
  if (!notifications.length) {
    return null
  }
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-[460px] max-sm:w-[90vw] pointer-events-none items-center">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.notiId}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

export const useNotification = () => {
  return useContext(NotificationContext) || {
    addNotification: () => { },
    setNotificationData: () => { },
    notificationData: [],
  }
}

export function NotificationProvider({ children }) {
  const dismissTimersRef = useRef(new Map())
  const [notifications, setNotifications] = useState([])
  const [notificationData, setRawNotificationData] = useState([])

  const clearDismissTimer = useCallback((notiId) => {
    const timer = dismissTimersRef.current.get(notiId)
    if (timer) {
      clearTimeout(timer)
      dismissTimersRef.current.delete(notiId)
    }
  }, [])

  const removeNotification = useCallback((notiId) => {
    clearDismissTimer(notiId)
    setNotifications((prev) => prev.filter((notification) => notification.notiId !== notiId))
  }, [clearDismissTimer])

  const setNotificationData = useCallback(updater => {
    setRawNotificationData(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater
      return normalizeNotificationList(next)
    })
  }, [])

  const addNotification = useCallback((message, mode = NOTIFICATION_MODES.PUSH) => {
    const notification = createNotification(message, mode)
    setNotifications((prev) => {
      const next = [notification, ...prev].slice(0, NOTIFICATION_LIMIT)
      prev.forEach((item) => {
        if (!next.some((nextItem) => nextItem.notiId === item.notiId)) {
          clearDismissTimer(item.notiId)
        }
      })
      return next
    })

    const timer = setTimeout(() => {
      dismissTimersRef.current.delete(notification.notiId)
      setNotifications((prev) => prev.filter((item) => item.notiId !== notification.notiId))
    }, DISMISS_DELAY_MS)

    dismissTimersRef.current.set(notification.notiId, timer)
  }, [clearDismissTimer])

  useEffect(() => {
    return () => {
      dismissTimersRef.current.forEach(clearTimeout)
      dismissTimersRef.current.clear()
    }
  }, [])

  const value = useMemo(() => ({
    addNotification,
    setNotificationData,
    notificationData,
  }), [addNotification, setNotificationData, notificationData])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToastList notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  )
}