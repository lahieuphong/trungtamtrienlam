'use client'

import { useEffect } from 'react'

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    const sizeMap = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-7xl',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col animate-fadeIn`}>
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {children}
                </div>
                {footer && (
                    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title = 'Xác nhận',
    message,
    loading = false,
    cancelIcon = null,
    confirmIcon = null,
}) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="sm"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        {cancelIcon}
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                        {!loading && confirmIcon}
                        {loading ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                </>
            }
        >
            <p className="text-sm text-gray-600">{message}</p>
        </Modal>
    )
}
