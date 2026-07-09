"use client"

import { forwardRef } from "react"
import RadioButton from "./RadioButton"

/**
 * Component RadioGroup để nhóm các RadioButton
 * @param {Object} props - Props của component
 * @param {string} props.name - Tên của radio group
 * @param {Array} props.options - Mảng các option
 * @param {string} props.value - Giá trị đã chọn
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {boolean} props.disabled - Trạng thái disabled của radio group
 * @param {string} props.className - Class CSS bổ sung
 * @param {string} props.orientation - Hướng hiển thị (horizontal/vertical)
 * @param {boolean} props.error - Có lỗi hay không
 * @param {string} props.errorMessage - Thông báo lỗi
 */
const RadioGroup = forwardRef(
  (
    {
      name,
      options = [],
      value,
      onChange,
      disabled = false,
      className = "",
      orientation = "horizontal",
      error = false,
      errorMessage = "",
      ...rest
    },
    ref,
  ) => {
    const isHorizontal = orientation === "horizontal"

    return (
      <div className="w-full">
        <div
          className={`flex ${isHorizontal ? "flex-row space-x-4" : "flex-col space-y-2"} ${className}`}
          ref={ref}
          {...rest}
        >
          {options.map((option) => (
            <RadioButton
              key={option.value}
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value == option.value}
              onChange={onChange}
              label={option.label}
              disabled={disabled || option.disabled}
            />
          ))}
        </div>
        {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}
      </div>
    )
  },
)

RadioGroup.displayName = "RadioGroup"

export default RadioGroup
