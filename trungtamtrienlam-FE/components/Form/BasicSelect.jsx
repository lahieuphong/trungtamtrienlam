"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Search } from "lucide-react"

export default function BasicSelectPortal({
  id,
  name,
  options = [],
  value = "",
  onChange,
  disabled = false,
  className = "",
  error = false,
  errorMessage = "",
  placeholder = "Chọn...",
  required = false,
  defaultOptionLabel = "-- Chọn --",
  enableSearch = false,
  renderOption,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)

  // thêm option mặc định nếu không required
  const allOptions = !required
    ? [{ value: "", label: defaultOptionLabel }, ...options]
    : options

  // Hàm chuẩn hóa text: bỏ dấu + lowercase
  const normalizeText = (str) =>
    str
      ? str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      : ""

  // lọc theo searchTerm (bỏ dấu + ignore case)
  const filteredOptions = allOptions.filter((opt) =>
    normalizeText(opt.label).includes(normalizeText(searchTerm))
  )

  // click outside để đóng
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // tính toán vị trí dropdown
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen])

  const handleOptionClick = (optionValue) => {
    if (onChange) {
      onChange({ target: { name, value: optionValue } })
    }
    setIsOpen(false)
    setSearchTerm("")
  }

  const getSelectedLabel = () => {
    const option = allOptions.find(
      (opt) => String(opt.value) === String(value)
    )
    return option ? option.label : ""
  }

  // class
  const baseClasses =
    "w-full px-3 py-2 border focus:outline-none transition-colors rounded-md"
  const normalClasses = "border-gray-300 focus:border-blue-500"
  const errorClasses = "border-red-300 bg-red-50"
  const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed"
  const selectClasses = `${baseClasses} ${
    error ? errorClasses : normalClasses
  } ${disabled ? disabledClasses : "cursor-pointer"} ${className}`

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* hidden input để submit form */}
      <input
        type="hidden"
        id={id}
        name={name}
        value={value ?? ""}
        disabled={disabled}
      />

      {/* hiển thị select */}
      <div
        className={`${selectClasses} flex items-center justify-between min-h-[38px] bg-white`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span
          className={`flex-1 overflow-hidden whitespace-nowrap text-ellipsis ${
            !getSelectedLabel() ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {getSelectedLabel() || placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ml-2 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* dropdown via portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="basic-select-dropdown absolute z-[9999] bg-white border border-gray-300 rounded-md shadow-lg w-64"
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {/* Search bar */}
            {enableSearch && (
              <div className="flex items-center px-2 py-1 border-b border-gray-200">
                <Search className="w-4 h-4 text-gray-400 mr-1" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* Options */}
            <ul role="listbox" className="py-1 max-h-60 overflow-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                  const isSelected =
                    String(option.value) === String(value)

                  return (
                    <li
                      key={`${String(option.value)}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleOptionClick(option.value)}
                    >
                      {renderOption ? (
                        renderOption(option, isSelected)
                      ) : (
                        <span className="block px-3 py-2 truncate">
                          {option.label}
                        </span>
                      )}
                    </li>
                  )
                })  
              ) : (
                <li className="px-3 py-2 text-gray-500 text-center">
                  Không tìm thấy kết quả
                </li>
              )}
            </ul>
          </div>,
          document.body
        )}

      {/* lỗi */}
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}
