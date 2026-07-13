"use client"

import { forwardRef } from "react"
import { Check } from "lucide-react"

/**
 * Component Checkbox cơ bản
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của checkbox
 * @param {string} props.name - Tên của checkbox
 * @param {boolean} props.checked - Trạng thái checked của checkbox
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {string} props.label - Nhãn của checkbox
 * @param {boolean} props.disabled - Trạng thái disabled của checkbox
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.error - Có lỗi hay không
 * @param {string} props.errorMessage - Thông báo lỗi
 */
const Checkbox = forwardRef(
  (
    {
      id,
      name,
      checked = false,
      onChange,
      label = "",
      disabled = false,
      className = "",
      error = false,
      errorMessage = "",
      ...rest
    },
    ref,
  ) => {
    // Sử dụng một ID nội bộ để đảm bảo label luôn được kết nối với input
    const internalId = id || `checkbox-${name}-${Math.random().toString(36).substring(7)}`;

    return (
      <div className={`inline-flex flex-col ${className}`}>
        <label
          htmlFor={internalId}
          className={`flex items-center group ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          {/* Input gốc được giấu đi nhưng vẫn hoạt động để đảm bảo accessibility */}
          <input
            id={internalId}
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            ref={ref}
            className="sr-only" // Lớp "sr-only" để giấu input một cách an toàn
            {...rest}
          />

          {/* Box checkbox tùy chỉnh */}
          <div
            className={`w-5 h-5 flex flex-shrink-0 items-center justify-center border-2 rounded transition-colors
              ${
                checked
                  ? 'bg-[#597EF7] border-[#597EF7]'
                  : 'bg-white border-gray-300 group-hover:border-[#597EF7]'
              }
              ${error ? '!border-red-600' : ''}
            `}
          >
            {/* Icon check, mỏng hơn */}
            <Check
              size={16}
              strokeWidth={1.5} // <-- Chỉnh độ dày của icon ở đây
              className={`transition-opacity ${checked ? 'opacity-100 text-white' : 'opacity-0'}`}
            />
          </div>

          {/* Nhãn (label) */}
          {label && (
            <span className="ml-2 text-sm font-medium text-gray-700 select-none">
              {label}
            </span>
          )}
        </label>

        {/* Thông báo lỗi */}
        {error && errorMessage && (
          <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox"

export default Checkbox