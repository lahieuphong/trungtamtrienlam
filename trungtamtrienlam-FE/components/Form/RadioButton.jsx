"use client"

import { forwardRef } from "react"

/**
 * Component RadioButton tùy chỉnh
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của radio button
 * @param {string} props.name - Tên của radio button
 * @param {string} props.value - Giá trị của radio button
 * @param {boolean} props.checked - Trạng thái checked của radio button
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {string} props.label - Nhãn của radio button
 * @param {boolean} props.disabled - Trạng thái disabled của radio button
 * @param {string} props.className - Class CSS bổ sung
 */
const RadioButton = forwardRef(
  ({ id, name, value, checked = false, onChange, label = "", disabled = false, className = "", classNameLabel = '', ...rest }, ref) => {
    const internalId = id || `radio-${name}-${value}`;

    return (
      <label
        htmlFor={internalId}
        className={`flex items-center group ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
      >
        {/* Input gốc được giấu đi nhưng vẫn hoạt động, thêm class 'peer' */}
        <input
          id={internalId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          ref={ref}
          className="sr-only peer" // Giấu input và đánh dấu nó là một 'peer'
          {...rest}
        />

        {/* Vòng tròn bên ngoài của radio button tùy chỉnh */}
        <div
          className={`
            w-5 h-5 flex items-center justify-center rounded-full border-2 transition-colors
            ${checked ? 'border-[#597EF7]' : 'border-gray-300'}
            group-hover:border-[#597EF7]
            peer-focus:ring-2 peer-focus:ring-[#597EF7]/50
          `}
        >
          {/* Dấu chấm bên trong, chỉ hiện khi được chọn */}
          <div
            className={`
              w-3 h-3 rounded-full bg-[#597EF7] transition-transform
              ${checked ? 'scale-100' : 'scale-0'}
            `}
          ></div>
        </div>

        {/* Nhãn */}
        {label && (
          <span className={`ml-2 text-sm font-medium text-gray-700 select-none ${classNameLabel}`}>
            {label}
          </span>
        )}
      </label>
    )
  },
)

RadioButton.displayName = "RadioButton"

export default RadioButton