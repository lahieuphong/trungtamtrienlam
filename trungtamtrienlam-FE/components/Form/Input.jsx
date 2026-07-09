"use client"

import { forwardRef } from "react"

/**
 * Component Input cơ bản
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của input
 * @param {string} props.name - Tên của input
 * @param {string} props.type - Loại input (text, email, password, etc.)
 * @param {string} props.placeholder - Placeholder của input
 * @param {string} props.value - Giá trị của input
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {boolean} props.disabled - Trạng thái disabled của input
 * @param {boolean} props.readOnly - Trạng thái readonly của input
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.error - Có lỗi hay không
 * @param {string} props.errorMessage - Thông báo lỗi
 */
const Input = forwardRef(
  (
    {
      id,
      name,
      type = "text",
      placeholder = "",
      value,
      onChange,
      disabled = false,
      readOnly = false,
      className = "",
      error = false,
      errorMessage = "",
      classNameInput = "",
      classNameContainer = '',
      ...rest
    },
    ref,
  ) => {
    const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
    const normalClasses = "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    const errorClasses = "border-red-300 focus:ring-red-500 focus:border-red-500"
    const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed"

    const inputClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${
      disabled ? disabledClasses : ""
    } ${className}`

    return (
      <div className={`w-full ${classNameContainer}`}>
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          className={`${inputClasses} ${classNameInput}`}
          ref={ref}
          {...rest}
        />
        {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}
      </div>
    )
  },
)

Input.displayName = "Input"

export default Input
