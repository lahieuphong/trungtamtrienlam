"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

export const Modal = ({
    isHeader = true,
    isScrollContent = true,
    position,
    isOpen,
    onClose,
    title,
    footer,
    children, size = "md",
    showCloseButton = true,
    header, styleChildren = {},
    id = "",
    classNameFooter = ''
}) => {
    // Handle escape key press
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }

        // const scrollContainer = document.querySelector("html");

        window.addEventListener("keydown", handleEscape)

        // Prevent body scroll when modal is open
        // if (isOpen) {
        //     document.body.style.overflow = "hidden"
        //     scrollContainer.style.overflow = "hidden";
        // } else {
        //     document.body.style.overflow = "auto"
        //     scrollContainer.style.overflow = "auto";
        // }

        return () => {
            window.removeEventListener("keydown", handleEscape)
            // document.body.style.overflow = "auto"
            // scrollContainer.style.overflow = "auto";
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    // Determine modal size
    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        full: "max-w-full mx-4",
    }

    const modalSize = sizeClasses[size] || sizeClasses.md;

    let classNamePosition = 'items-center';

    if (position == "top") {
        classNamePosition = 'items-start';
    }

    return (
        <div className={`fixed inset-0 z-[10000] flex ${classNamePosition} justify-center p-4 bg-black bg-opacity-50`}>
            <div
                id={id}
                className={`bg-white rounded-lg shadow-xl w-full ${modalSize} max-h-[95vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Wrapper có scroll */}
                <div className="flex flex-col overflow-hidden max-h-[95vh]">
                    {/* Header: không scroll */}
                    {isHeader && <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10 rounded-tl-xl rounded-tr-xl">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>}
                    {header &&
                        <div className="">
                            {header}
                        </div>}
                    {/* Content: có scroll */}
                    <div className={`p-4 content-scroll ${isScrollContent ? 'overflow-y-auto' : ''}`} style={{ maxHeight: "calc(95vh - 64px)", ...(styleChildren || {}) }}>
                        {children}
                    </div>
                    {footer &&
                        <div className={`p-4 border-t ${classNameFooter}`}>
                            {footer}
                        </div>}
                </div>
            </div>
        </div>
    )
}
