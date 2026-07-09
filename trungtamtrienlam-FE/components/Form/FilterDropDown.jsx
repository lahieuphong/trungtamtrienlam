"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

// Default options (có thể sử dụng nếu không truyền options từ bên ngoài)
export const defaultStatusOptions = [
    {
        id: "meeting",
        label: "Cuộc họp",
        color: "green",
        dotColor: "bg-green-500",
    },
    {
        id: "work",
        label: "Công tác",
        color: "blue",
        dotColor: "bg-blue-500",
    },
    {
        id: "other",
        label: "Khác",
        color: "gray",
        dotColor: "bg-gray-500",
    },
]

/**
 * FilterDropdown Component
 * @param {Object} props
 * @param {string} props.value - Giá trị được chọn
 * @param {function} props.onChange - Callback khi thay đổi giá trị
 * @param {Array} props.options - Danh sách options để chọn
 * @param {string} props.placeholder - Text hiển thị khi chưa chọn
 * @param {boolean} props.disabled - Vô hiệu hóa component
 * @param {string} props.className - CSS class tùy chỉnh
 * @param {string} props.height - CSS class tùy chỉnh
 */
export default function FilterDropdown({
    value,
    onChange,
    options = defaultStatusOptions,
    placeholder = "Chọn bộ lọc",
    disabled = false,
    className = "",
    height = "px-4 py-3"
}) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedOption = options.find((option) => option.id === value)

    const getColorClasses = (color, isSelected = false) => {
        // Hỗ trợ các màu cơ bản
        const colorMap = {
            green: isSelected ? "text-green-600 border-green-500 bg-green-50" : "text-green-600 border-green-300",
            blue: isSelected ? "text-blue-600 border-blue-500 bg-blue-50" : "text-blue-600 border-blue-300",
            gray: isSelected ? "text-gray-600 border-gray-500 bg-gray-50" : "text-gray-600 border-gray-300",
            red: isSelected ? "text-red-600 border-red-500 bg-red-50" : "text-red-600 border-red-300",
            yellow: isSelected ? "text-yellow-600 border-yellow-500 bg-yellow-50" : "text-yellow-600 border-yellow-300",
            purple: isSelected ? "text-purple-600 border-purple-500 bg-purple-50" : "text-purple-600 border-purple-300",
            indigo: isSelected ? "text-indigo-600 border-indigo-500 bg-indigo-50" : "text-indigo-600 border-indigo-300",
            pink: isSelected ? "text-pink-600 border-pink-500 bg-pink-50" : "text-pink-600 border-pink-300",
            black: isSelected ? "text-gray-800 border-gray-900 bg-gray-100" : "text-gray-700 border-gray-400",
        }

        return colorMap[color] || "text-gray-600 border-gray-300"
    }

    const getDotColor = (option) => {
        // Ưu tiên dotColor custom, nếu không có thì dùng color mapping
        if (option.dotColor) {
            return option.dotColor
        }

        const dotColorMap = {
            green: "bg-green-500",
            blue: "bg-blue-500",
            gray: "bg-gray-500",
            red: "bg-red-500",
            yellow: "bg-yellow-500",
            purple: "bg-purple-500",
            indigo: "bg-indigo-500",
            pink: "bg-pink-500",
            black: "bg-black"
        }

        return dotColorMap[option.color] || "bg-gray-500"
    }

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen)
        }
    }

    const handleSelect = (option) => {
        onChange(option.id)
        setIsOpen(false)
    }

    const buttonColorClass = selectedOption
        ? getColorClasses(selectedOption.color, isOpen)
        : "text-gray-500 border-gray-300 hover:border-gray-400"

    return (
        <div className={`relative w-full max-w-xs ${className}`}>
            <button
                onClick={handleToggle}
                disabled={disabled}
                className={`w-full ${height} border rounded-lg flex items-center justify-between transition-all duration-200 ${buttonColorClass} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"
                    }`}
            >
                <span className="font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {isOpen && !disabled && (
                <>
                    {/* Overlay để đóng dropdown khi click bên ngoài */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option)}
                                className={`w-full ${height} text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-150 ${option.id === value ? "bg-gray-100" : ""
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${getDotColor(option)}`} />
                                <span className={`font-medium ${getColorClasses(option.color).split(" ")[0]}`}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
