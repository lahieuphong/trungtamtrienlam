'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function FilterDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn bộ lọc',
  disabled = false,
  className = '',
  height = 'px-4 py-3',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((option) => option.id === value)

  const getColorClasses = (color, isSelected = false) => {
    const colorMap = {
      green: isSelected ? 'text-green-600 border-green-500 bg-green-50' : 'text-green-600 border-green-300',
      blue: isSelected ? 'text-blue-600 border-blue-500 bg-blue-50' : 'text-blue-600 border-blue-300',
      gray: isSelected ? 'text-gray-600 border-gray-500 bg-gray-50' : 'text-gray-600 border-gray-300',
      red: isSelected ? 'text-red-600 border-red-500 bg-red-50' : 'text-red-600 border-red-300',
      black: isSelected ? 'text-gray-800 border-gray-900 bg-gray-100' : 'text-gray-700 border-gray-400',
    }
    return colorMap[color] || 'text-gray-600 border-gray-300'
  }

  const getDotColor = (option) => {
    if (option.dotColor) return option.dotColor
    const dotColorMap = { green: 'bg-green-500', blue: 'bg-blue-500', gray: 'bg-gray-500', red: 'bg-red-500', black: 'bg-black' }
    return dotColorMap[option.color] || 'bg-gray-500'
  }

  const buttonColorClass = selectedOption
    ? getColorClasses(selectedOption.color, isOpen)
    : 'text-gray-500 border-gray-300 hover:border-gray-400'

  return (
    <div className={`relative w-full max-w-xs ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((current) => !current)}
        disabled={disabled}
        className={`w-full ${height} border rounded-lg flex items-center justify-between transition-all duration-200 ${buttonColorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
      >
        <span className="font-medium truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { onChange(option.id); setIsOpen(false) }}
                className={`w-full ${height} text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-150 ${option.id === value ? 'bg-gray-100' : ''}`}
              >
                <div className={`w-3 h-3 rounded-full ${getDotColor(option)}`} />
                <span className={`font-medium truncate ${getColorClasses(option.color).split(' ')[0]}`}>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
