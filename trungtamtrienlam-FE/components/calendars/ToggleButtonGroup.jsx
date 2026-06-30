'use client'

import { Fragment } from 'react'

export default function ToggleButtonGroup({
  options = [],
  value,
  onChange = () => {},
  className = '',
  size = 'md',
  buttonStyle = {},
  activeButtonStyle = {},
  groupStyle = {},
}) {
  const sizeStyle = {
    sm: 'h-8 text-xs sm:text-sm min-w-[60px] sm:min-w-[78px] px-2 sm:px-3',
    md: 'h-9 text-sm sm:text-[15px] min-w-[70px] sm:min-w-[94px] px-3 sm:px-4',
    lg: 'h-11 text-sm sm:text-base min-w-[80px] sm:min-w-[112px] px-3 sm:px-5',
  }[size] || 'h-9 text-sm sm:text-[15px] min-w-[70px] sm:min-w-[94px] px-3 sm:px-4'

  return (
    <div className={`inline-flex flex-wrap sm:flex-nowrap rounded-lg border border-blue-300 p-1 gap-1 sm:gap-0 ${className}`} style={groupStyle}>
      {options.map((option, idx) => {
        const active = value === option.value
        return (
          <Fragment key={option.value}>
            <button
              type="button"
              className={`${sizeStyle} font-medium rounded-[10px] transition-all duration-100 flex items-center justify-center ${active ? 'bg-[#E6F0FF] text-[#1976D2] font-semibold shadow-none' : 'bg-transparent text-[#222] font-medium hover:bg-[#F1F6FF]'}`}
              style={{ fontWeight: active ? 600 : 500, ...buttonStyle, ...(active ? activeButtonStyle : {}) }}
              onClick={() => !active && onChange(option.value)}
            >
              {option.label}
            </button>
            {idx < options.length - 1 && <span className="self-stretch w-px bg-[#e0ecff] mx-1" />}
          </Fragment>
        )
      })}
    </div>
  )
}
