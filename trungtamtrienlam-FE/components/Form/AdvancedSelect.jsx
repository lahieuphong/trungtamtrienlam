"use client"

import { useState, useRef, useEffect, forwardRef } from "react"
import { ChevronDown, X, Check, Search } from "lucide-react"

/**
 * Hàm loại bỏ dấu tiếng Việt
 * @param {string} str - Chuỗi cần loại bỏ dấu
 * @returns {string} Chuỗi đã loại bỏ dấu
 */
const removeVietnameseAccents = (str) => {
  if (!str) return ""
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
}

/**
 * Component Select nâng cao với khả năng tìm kiếm và chọn nhiều
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của select
 * @param {string} props.name - Tên của select
 * @param {Array} props.options - Mảng các option
 * @param {string|Array} props.value - Giá trị đã chọn (string hoặc array nếu isMulti=true)
 * @param {Function} props.onChange - Hàm xử lý khi giá trị thay đổi
 * @param {boolean} props.disabled - Trạng thái disabled của select
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.error - Có lỗi hay không
 * @param {string} props.errorMessage - Thông báo lỗi
 * @param {boolean} props.isSearchable - Cho phép tìm kiếm
 * @param {boolean} props.isMulti - Cho phép chọn nhiều
 * @param {string} props.placeholder - Placeholder khi không có giá trị
 * @param {string} props.noOptionsMessage - Thông báo khi không có options
 * @param {string} props.searchPlaceholder - Placeholder cho ô tìm kiếm
 * @param {boolean} props.required - Trường có bắt buộc hay không
 * @param {string} props.defaultOptionLabel - Label cho option mặc định khi không required
 * @param {number} props.maxLabelLength - Độ dài tối đa của label hiển thị (mặc định: 30)
 */
const AdvancedSelect = forwardRef(
  (
    {
      id,
      name,
      options = [],
      value,
      onChange,
      disabled = false,
      className = "",
      error = false,
      errorMessage = "",
      isSearchable = false,
      isMulti = false,
      placeholder = "Chọn...",
      noOptionsMessage = "Không có tùy chọn",
      searchPlaceholder = "Tìm kiếm...",
      required = false,
      defaultOptionLabel = "-- Chọn --",
      maxLabelLength = 30,
      renderItem = null,
      isSelectAll = false,
      onSelectAll = null,
      renderDisplayLabel = null,
      positionPopup = 'dock',
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const containerRef = useRef(null)
    const searchInputRef = useRef(null)

    // Thêm option mặc định nếu không required
    const allOptions = !required && !isMulti ? [{ value: null, label: defaultOptionLabel }, ...options] : options    

    // Xử lý click bên ngoài để đóng dropdown
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          if (positionPopup == 'dock') {
            setIsOpen(false)
          }
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }, [])

    // Focus vào ô tìm kiếm khi mở dropdown
    useEffect(() => {
      if (isOpen && isSearchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, [isOpen, isSearchable])

    // Lọc options theo từ khóa tìm kiếm, không phân biệt dấu tiếng Việt
    const filteredOptions =
      isSearchable && searchValue
        ? allOptions.filter((option) => {
          const normalizedOptionLabel = removeVietnameseAccents(option.label.toLowerCase())
          const normalizedSearchValue = removeVietnameseAccents(searchValue.toLowerCase())
          return normalizedOptionLabel.includes(normalizedSearchValue)
        })
        : allOptions

    // Xử lý khi click vào option
    const handleOptionClick = (optionValue) => {

      if (isMulti) {
        const newValue = Array.isArray(value) ? [...value] : []
        const valueIndex = newValue.indexOf(optionValue)

        if (valueIndex >= 0) {
          // Nếu đã chọn thì bỏ chọn
          newValue.splice(valueIndex, 1)
        } else {
          // Nếu chưa chọn thì thêm vào
          newValue.push(optionValue)
        }

        onChange({ target: { name, value: newValue } })
      } else {
        // Nếu không phải multi thì chọn giá trị và đóng dropdown
        onChange({ target: { name, value: optionValue } })
        setIsOpen(false)
      }
    }

    // Xử lý khi xóa một giá trị đã chọn (chỉ cho multi select)
    const handleRemoveValue = (optionValue, e) => {
      e.stopPropagation() // Ngăn không cho sự kiện lan đến container và mở dropdown

      if (isMulti && Array.isArray(value)) {
        const newValue = value.filter((val) => val !== optionValue)
        onChange({ target: { name, value: newValue } })
      }
    }

    // Hàm rút gọn label nếu quá dài
    const truncateLabel = (label) => {
      if (!label) return ""
      return label.length > maxLabelLength ? `${label.substring(0, maxLabelLength)}...` : label
    }

    // Lấy label từ value
    const getSelectedLabels = () => {
      if (isMulti && Array.isArray(value) && value.length > 0) {
        return value.map((val) => {
          const option = options.find((opt) => opt.value == val)
          return option ? option.label : val
        })
      } else if (!isMulti && value !== null && value !== undefined) {
        const option = options.find((opt) => opt.value == value)
        return option ? option.label : value
      }
      return null
    }

    // Lấy label đã được rút gọn để hiển thị
    const getDisplayLabel = () => {
      const selectedLabel = getSelectedLabels()
      if (!selectedLabel) return null
      return truncateLabel(selectedLabel)
    }

    // Kiểm tra xem một option có được chọn không
    const isOptionSelected = (optionValue) => {
      if (isMulti && Array.isArray(value)) {
        return value.includes(optionValue)
      }
      return value == optionValue
    }

    const onHandleSelectAll = (e) => {
      e.preventDefault();

      if (onSelectAll) {
        const event = { ...e, target: { ...e.target, name, value: (value || []).length == filteredOptions.length ? [] : filteredOptions.map(p => p.value) } }

        onSelectAll(event);
      }
    }

    // Các class CSS
    const baseClasses = `w-full px-3 py-2 border focus:outline-none transition-colors ${positionPopup == 'dock' ? 'rounded-md' : 'rounded-tl-md rounded-tr-md'}`;
    const normalClasses = "border-gray-300 focus:border-blue-500"
    const errorClasses = "border-red-300 bg-red-50"
    const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed"

    const selectClasses =  `${baseClasses} ${error ? errorClasses : normalClasses} ${disabled ? disabledClasses : "cursor-pointer"
      } ${className}`;

    return (
      <div className="w-full relative" ref={containerRef}>
        {/* Hidden input for form submission */}
        <input
          type="hidden"
          name={name}
          value={isMulti ? (Array.isArray(value) ? value.join(",") : "") : value || ""}
          ref={ref}
          {...rest}
        />

        {/* Select display */}
        <div
          className={`${selectClasses} flex items-center justify-between min-h-[38px] bg-white`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          tabIndex={0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          id={id}
          title={getSelectedLabels()} // Thêm title để hiển thị đầy đủ khi hover
        >
          <div className="flex-1 flex flex-wrap gap-1 overflow-hidden">
            {isMulti && Array.isArray(value) && value.length > 0 ? renderDisplayLabel ? renderDisplayLabel({ value, options }) : (
              // Multi select với các tags
              value.map((val) => {
                const option = options.find((opt) => opt.value == val)
                const label = option ? option.label : val
                return (
                  <div key={val} className="bg-blue-100 text-blue-800 text-sm px-2 py-0.5 rounded flex items-center">
                    <span className="mr-1 truncate max-w-[150px]" title={label}>
                      {truncateLabel(label)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveValue(val, e)}
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                      aria-label={`Remove ${option ? option.label : val}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })
            ) : (
              // Single select hoặc không có giá trị
              <span className={`truncate ${!getSelectedLabels() ? "text-gray-400" : ""}`}>
                {getDisplayLabel() || placeholder}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-1 ${isOpen ? "transform rotate-180" : ""
              }`}
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className={`${positionPopup == 'dock' ? 'absolute' : ''} z-10 w-full bg-white border border-gray-300 ${positionPopup == 'dock' ? 'rounded-md mt-1' : 'rounded-bl-md rounded-br-md'} shadow-lg max-h-60 overflow-auto`}>
            {/* Search input */}
            {isSearchable && (
              <div className="sticky top-0 p-2 bg-white border-b border-gray-200">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>
            )}
            {isSelectAll && <div className="mt-2 px-2">
              <a href="#" className="text-[#1F1F1F] text-sm font-normal" onClick={onHandleSelectAll}>
                {(value || []).length == filteredOptions.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </a>
            </div>}
            {/* Options list */}
            <ul role="listbox" className="py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => renderItem ? renderItem({ option, isSelected: isOptionSelected(option.value), onClick: () => handleOptionClick(option.value) }) : (
                  <li
                    key={option.value == null ? "null-option" : option.value}
                    role="option"
                    aria-selected={isOptionSelected(option?.value)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between ${isOptionSelected(option.value) ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
                      } ${option.value == null ? "border-b border-gray-200" : ""}`}
                    onClick={() => handleOptionClick(option.value)}
                    title={option.label} // Thêm title để hiển thị đầy đủ khi hover
                  >
                    <span className="truncate">{option.label}</span>
                    {isOptionSelected(option.value) && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-gray-500 text-center">{noOptionsMessage}</li>
              )}
            </ul>
          </div>
        )}

        {/* Error message */}
        {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}
      </div>
    )
  },
)

AdvancedSelect.displayName = "AdvancedSelect"

export default AdvancedSelect
