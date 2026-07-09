"use client"

import { forwardRef } from "react"

/**
 * Component TextArea cơ bản
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của textarea
 * @param {string} props.name - Tên của textarea
 * @param {string} props.placeholder - Placeholder của textarea
 * @param {string} props.value - Giá trị của textarea
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {number} props.rows - Số dòng của textarea
 * @param {boolean} props.disabled - Trạng thái disabled của textarea
 * @param {boolean} props.readOnly - Trạng thái readonly của textarea
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.error - Có lỗi hay không
 * @param {string} props.errorMessage - Thông báo lỗi
 */
const TextArea = forwardRef(
  (
    {
      id,
      name,
      placeholder = "",
      value,
      onChange,
      rows = 3,
      disabled = false,
      readOnly = false,
      className = "",
      error = false,
      errorMessage = "",
      ...rest
    },
    ref,
  ) => {
    const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
    const normalClasses = "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    const errorClasses = "border-red-300 focus:ring-red-500 focus:border-red-500"
    const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed"

    const textareaClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${
      disabled ? disabledClasses : ""
    } ${className}`

    return (
      <div className="w-full">
        <textarea
          id={id}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={rows}
          disabled={disabled}
          readOnly={readOnly}
          className={textareaClasses}
          ref={ref}
          {...rest}
        />
        {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}
      </div>
    )
  },
)

TextArea.displayName = "TextArea"

export default TextArea
