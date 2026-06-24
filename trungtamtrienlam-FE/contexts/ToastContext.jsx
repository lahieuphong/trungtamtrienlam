'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback(({ type = 'info', message, duration = 3000 }) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, type, message }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }, [])

    const success = useCallback((message) => addToast({ type: 'success', message }), [addToast])
    const error = useCallback((message) => addToast({ type: 'error', message }), [addToast])
    const warning = useCallback((message) => addToast({ type: 'warning', message }), [addToast])
    const info = useCallback((message) => addToast({ type: 'info', message }), [addToast])

    return (
        <ToastContext.Provider value={{ toasts, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    )
}

function ToastContainer({ toasts }) {
    if (!toasts.length) return null
    const colorMap = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    }
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
                <div key={t.id} className={`${colorMap[t.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm`}>
                    {t.message}
                </div>
            ))}
        </div>
    )
}

export const useToast = () => {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}
