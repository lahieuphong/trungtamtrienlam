"use client"

import { useState, useEffect, forwardRef } from "react"
import { Checkbox } from "./index"

/**
 * Component CheckboxGroup hiển thị một nhóm checkbox
 * @param {Object} props - Props của component
 * @param {string} props.name - Tên của nhóm checkbox
 * @param {Array} props.options - Mảng các option
 * @param {Array} props.value - Mảng các giá trị đã chọn
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {boolean} props.disabled - Trạng thái disabled của nhóm checkbox
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.error - Có lỗi hay không
 * @param {string} props.errorMessage - Thông báo lỗi
 * @param {string} props.layout - Layout của nhóm checkbox (vertical, horizontal)
 */
const CheckboxGroup = forwardRef(
  (
    {
      name,
      options = [],
      value = [],
      onChange,
      disabled = false,
      className = "",
      error = false,
      errorMessage = "",
      layout = "vertical",
      ...rest
    },
    ref,
  ) => {
    const [selectedValues, setSelectedValues] = useState(Array.isArray(value) ? value : [])

    // Cập nhật selectedValues khi value thay đổi
    useEffect(() => {
      setSelectedValues(Array.isArray(value) ? value : [])
    }, [value])

    // Xử lý khi checkbox thay đổi
    const handleCheckboxChange = (e) => {
      const { checked, value: checkboxValue } = e.target
      let newSelectedValues

      if (checked) {
        newSelectedValues = [...selectedValues, checkboxValue]
      } else {
        newSelectedValues = selectedValues.filter((val) => val !== checkboxValue)
      }

      setSelectedValues(newSelectedValues)

      if (onChange) {
        onChange({
          target: {
            name,
            value: newSelectedValues,
          },
        })
      }
    }

    // Xác định layout class
    const layoutClass = layout === "horizontal" ? "flex flex-wrap gap-4" : layout === "vertical" ? "flex flex-col gap-2" : layout === "grid-col-2" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-2"

    return (
      <div className={`${className}`} ref={ref} {...rest}>
        <div className={layoutClass}>
          {options.map((option) => (
            <Checkbox
              key={option.value}
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={selectedValues.includes(option.value)}
              onChange={handleCheckboxChange}
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

CheckboxGroup.displayName = "CheckboxGroup"

export default CheckboxGroup
