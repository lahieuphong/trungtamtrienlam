"use client"

import { forwardRef } from "react"

/**
 * Component Switch (toggle)
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của switch
 * @param {string} props.name - Tên của switch
 * @param {boolean} props.checked - Trạng thái checked của switch
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {string} props.label - Nhãn của switch
 * @param {string} props.onText - Văn bản khi bật
 * @param {string} props.offText - Văn bản khi tắt
 * @param {boolean} props.disabled - Trạng thái disabled của switch
 * @param {string} props.className - Class CSS bổ sung
 */
const Switch = forwardRef(
  (
    {
      id,
      name,
      checked = false,
      onChange,
      label = "",
      onText = "",
      offText = "",
      disabled = false,
      className = "",
      ...rest
    },
    ref,
  ) => {
    return (
      <div className={`flex items-center ${className}`}>
        <label className="inline-flex items-center cursor-pointer">
          <input
            id={id}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
            onFocus={(e) => e.target.blur()}
            ref={ref}
            {...rest}
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"></div>
          {label && (
            <span className="ms-3 text-sm font-medium text-gray-700">
              {label} {checked ? onText : offText}
            </span>
          )}
        </label>
      </div>
    )
  },
)

Switch.displayName = "Switch"

export default Switch
