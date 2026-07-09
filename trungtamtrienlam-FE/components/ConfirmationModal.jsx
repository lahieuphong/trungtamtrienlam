"use client"

import { Trash2, X } from "lucide-react"
import { useEffect } from "react"

/**
 * Component modal xác nhận có thể tái sử dụng
 * @param {Object} props
 * @param {string} props.title - Tiêu đề của modal
 * @param {string} props.message - Nội dung thông báo
 * @param {boolean} props.isOpen - Trạng thái hiển thị của modal
 * @param {Function} props.onClose - Hàm xử lý khi đóng modal
 * @param {Function} props.onConfirm - Hàm xử lý khi xác nhận
 * @param {string} props.confirmText - Nội dung nút xác nhận
 * @param {string} props.cancelText - Nội dung nút hủy
 * @param {string} props.confirmButtonClass - Class CSS cho nút xác nhận
 * @param {string} props.confirmIcon - Component icon cho nút xác nhận
 * @param {string} props.fontBold - Component icon cho nút xác nhận
 */
export default function ConfirmationModal({
    title = "Xác nhận",
    message = "Bạn có chắc chắn muốn thực hiện hành động này?",
    isOpen = false,
    onClose = () => { },
    onConfirm = () => { },
    confirmText = "Xác nhận",
    cancelText = "Đóng",
    confirmButtonClass = "bg-red-500 hover:bg-red-600 text-white",
    confirmIcon = <Trash2 className="w-5 h-5 mr-2" />,
    fontBold = false,
    isSubmitForm = false,
    formId = null,
    content = null,
    cancelButtonClass = ''
}) {
    // Ngăn cuộn trang khi modal mở
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "auto"
        }
        return () => {
            document.body.style.overflow = "auto"
        }
    }, [isOpen])

    // Xử lý đóng modal khi nhấn ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handleEsc)
        return () => window.removeEventListener("keydown", handleEsc)
    }, [onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex justify-center items-center">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

            {/* Modal */}
            <div className="bg-white rounded-lg shadow-lg max-w-md z-10 overflow-hidden w-full h-max">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">{title}</h2>
                </div>

                {/* Body */}
                <div className="px-6 py-8">
                    {/* <p className={`text-gray-700 ${fontBold ? "font-bold" : ""} whitespace-pre-line`}>{message}</p> */}
                    {content || <div className={`text-gray-700 ${fontBold ? "font-bold" : ""} whitespace-pre-line`} dangerouslySetInnerHTML={{ __html: message }}></div>}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 ${cancelButtonClass}`}
                    >
                        <X className="w-5 h-5 mr-2" />
                        {cancelText}
                    </button>
                    <button
                        type={isSubmitForm ? "submit" : "button"}
                        form={formId}
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-md flex items-center justify-center ${confirmButtonClass}`}
                    >
                        {confirmIcon}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
