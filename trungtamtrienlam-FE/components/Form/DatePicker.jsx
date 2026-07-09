"use client"

import { useState, useRef, forwardRef, useEffect } from "react"
import { Calendar, Clock, X, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parse, isValid, addMonths, subMonths, setHours, setMinutes } from "date-fns"
import { vi } from "date-fns/locale"

/**
 * Component DatePicker với khả năng nhập liệu giống input type="date"
 */
const DatePicker = forwardRef(
  (
    {
      id,
      name,
      placeholder,
      value,
      onChange,
      disabled = false,
      readOnly = false,
      className = "",
      error = false,
      errorMessage = "",
      showTimeSelect = false,
      showDateSelect = true,
      dateFormat = "dd/MM/yyyy",
      timeFormat = "HH:mm",
      fullFormat = "dd/MM/yyyy HH:mm",
      colSpan = "",
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)
    const [inputValue, setInputValue] = useState("")
    const [activeTab, setActiveTab] = useState(showDateSelect ? "date" : "time")
    const [hours, setHourValue] = useState("00")
    const [minutes, setMinuteValue] = useState("00")
    const [isTyping, setIsTyping] = useState(false)
    const [timeError, setTimeError] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
    const wrapperRef = useRef(null)
    const inputRef = useRef(null)

    const updateDropdownPosition = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left
        })
      }
    }

    const openDropdown = () => {
      setIsOpen(true)
      setTimeout(updateDropdownPosition, 0) // Delay để đảm bảo DOM đã update
    }

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target)
        ) {
          // Chỉ cho phép đóng nếu:
          // - Không showTimeSelect
          // - Hoặc đang không ở tab "time"
          if (!showTimeSelect || activeTab !== "time") {
            setIsOpen(false)
          }
        }
      }

      const handleScroll = () => {
        if (isOpen) {
          updateDropdownPosition()
        }
      }

      const handleResize = () => {
        if (isOpen) {
          updateDropdownPosition()
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("scroll", handleScroll, true)
      window.addEventListener("resize", handleResize)
      
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        window.removeEventListener("scroll", handleScroll, true)
        window.removeEventListener("resize", handleResize)
      }
    }, [isOpen])

    // Cập nhật giá trị khi props value thay đổi
    useEffect(() => {
      if (value instanceof Date && isValid(value)) {
        setSelectedDate(value)
        setCurrentMonth(value)
        setInputValue(format(value, getDisplayFormat(), { locale: vi }))
        if (showTimeSelect) {
          setHourValue(format(value, "HH"))
          setMinuteValue(format(value, "mm"))
        }
      } else if (!value) {
        setSelectedDate(null)
        setInputValue("")
      }
    }, [value])

    // Xác định format hiển thị
    const getDisplayFormat = () => {
      if (showDateSelect && showTimeSelect) return fullFormat
      if (showDateSelect) return dateFormat
      if (showTimeSelect) return timeFormat
      return dateFormat
    }

    // Cập nhật phần tính toán placeholder mặc định
    const getDefaultPlaceholder = () => {
      if (showDateSelect && showTimeSelect) return "dd/mm/yyyy hh:mm"
      if (showDateSelect) return "dd/mm/yyyy"
      if (showTimeSelect) return "hh:mm"
      return "dd/mm/yyyy"
    }

    // Sử dụng trong component
    placeholder = placeholder || getDefaultPlaceholder()

    // Auto-format input khi nhập cho cả ngày và giờ
    const formatInputValue = (value, type = "date") => {
      // Loại bỏ tất cả ký tự không phải số
      const numbers = value.replace(/\D/g, "")

      if (type === "date") {
        // Format theo dd/mm/yyyy
        if (numbers.length <= 2) {
          return numbers
        } else if (numbers.length <= 4) {
          return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
        } else if (numbers.length <= 8) {
          return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
        }
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
      } else if (type === "time") {
        // Format theo hh:mm
        if (numbers.length <= 2) {
          return numbers
        } else if (numbers.length <= 4) {
          return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`
        }
        return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`
      } else if (type === "datetime") {
        // Format theo dd/mm/yyyy hh:mm
        if (numbers.length <= 2) {
          return numbers
        } else if (numbers.length <= 4) {
          return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
        } else if (numbers.length <= 8) {
          return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
        } else if (numbers.length <= 10) {
          return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)} ${numbers.slice(8, 10)}`
        } else if (numbers.length <= 12) {
          return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)} ${numbers.slice(8, 10)}:${numbers.slice(10, 12)}`
        }
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)} ${numbers.slice(8, 10)}:${numbers.slice(10, 12)}`
      }

      return value
    }

    // Validate ngày và giờ nhập vào
    const validateDateTime = (inputString) => {
      if (!inputString || inputString.trim() === "") return null

      // Xác định loại input
      const inputType = getInputType()

      if (inputType === "date") {
        if (inputString.length < 8) return null

        // Thử parse với format dd/MM/yyyy
        const parsed = parse(inputString, "dd/MM/yyyy", new Date())
        if (isValid(parsed)) {
          return parsed
        }

        // Thử parse với format dd-MM-yyyy
        const parsed2 = parse(inputString.replace(/\//g, "-"), "dd-MM-yyyy", new Date())
        if (isValid(parsed2)) {
          return parsed2
        }
      } else if (inputType === "time") {
        if (inputString.length < 4) return null

        // Thử parse với format HH:mm
        const today = new Date()
        const parsed = parse(inputString, "HH:mm", today)
        if (isValid(parsed)) {
          return parsed
        }

        // Thử parse với format H:mm (1 chữ số giờ)
        const parsed2 = parse(inputString, "H:mm", today)
        if (isValid(parsed2)) {
          return parsed2
        }
      } else if (inputType === "datetime") {
        if (inputString.length < 14) return null

        // Thử parse với format dd/MM/yyyy HH:mm
        const parsed = parse(inputString, "dd/MM/yyyy HH:mm", new Date())
        if (isValid(parsed)) {
          return parsed
        }

        // Thử parse với format dd/MM/yyyy H:mm
        const parsed2 = parse(inputString, "dd/MM/yyyy H:mm", new Date())
        if (isValid(parsed2)) {
          return parsed2
        }
      }

      return null
    }

    // Xác định loại input dựa trên props
    const getInputType = () => {
      if (showDateSelect && showTimeSelect) return "datetime"
      if (showDateSelect) return "date"
      if (showTimeSelect) return "time"
      return "date"
    }

    // Xử lý khi nhập vào input
    const handleInputChange = (e) => {
      const rawValue = e.target.value
      setIsTyping(true)

      // Xác định loại format cần áp dụng
      const inputType = getInputType()

      // Auto-format dựa trên loại input
      let formattedValue = formatInputValue(rawValue, inputType)

      // Giới hạn độ dài input
      const maxLengths = {
        date: 10, // dd/mm/yyyy
        time: 5, // hh:mm
        datetime: 16, // dd/mm/yyyy hh:mm
      }

      if (formattedValue.length > maxLengths[inputType]) {
        formattedValue = formattedValue.slice(0, maxLengths[inputType])
      }

      setInputValue(formattedValue)

      // Validate và parse
      const validDateTime = validateDateTime(formattedValue)
      if (validDateTime) {
        setSelectedDate(validDateTime)
        setCurrentMonth(validDateTime)

        // Cập nhật giờ và phút nếu có
        if (showTimeSelect) {
          setHourValue(format(validDateTime, "HH"))
          setMinuteValue(format(validDateTime, "mm"))
        }

        if (onChange) {
          onChange({
            target: {
              name,
              value: validDateTime,
            },
          })
        }
      } else if (formattedValue === "") {
        setSelectedDate(null)
        if (onChange) {
          onChange({
            target: {
              name,
              value: null,
            },
          })
        }
      }
    }

    // Xử lý phím tắt cho time input
    const handleTimeKeyDown = (e) => {
      if (!showTimeSelect || showDateSelect) return

      const currentTime = selectedDate || new Date()

      if (e.key === "ArrowUp") {
        e.preventDefault()
        const newTime = new Date(currentTime)
        newTime.setMinutes(newTime.getMinutes() + 15) // Tăng 15 phút
        handleDateSelect(newTime)
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const newTime = new Date(currentTime)
        newTime.setMinutes(newTime.getMinutes() - 15) // Giảm 15 phút
        handleDateSelect(newTime)
      }

      if (e.key === "ArrowRight") {
        e.preventDefault()
        const newTime = new Date(currentTime)
        newTime.setHours(newTime.getHours() + 1) // Tăng 1 giờ
        handleDateSelect(newTime)
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const newTime = new Date(currentTime)
        newTime.setHours(newTime.getHours() - 1) // Giảm 1 giờ
        handleDateSelect(newTime)
      }
    }

    // Cập nhật function handleKeyDown để bao gồm time shortcuts
    const handleKeyDown = (e) => {
      // Enter để mở/đóng dropdown
      if (e.key === "Enter") {
        e.preventDefault()
        setIsOpen(!isOpen)
      }

      // Escape để đóng dropdown
      if (e.key === "Escape") {
        setIsOpen(false)
        inputRef.current?.blur()
      }

      // Arrow keys để điều hướng
      if (selectedDate) {
        if (showDateSelect && !showTimeSelect) {
          // Chỉ có date - điều hướng ngày
          if (e.key === "ArrowUp") {
            e.preventDefault()
            const newDate = new Date(selectedDate)
            newDate.setDate(newDate.getDate() + 7)
            handleDateSelect(newDate)
          }
          if (e.key === "ArrowDown") {
            e.preventDefault()
            const newDate = new Date(selectedDate)
            newDate.setDate(newDate.getDate() - 7)
            handleDateSelect(newDate)
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            const newDate = new Date(selectedDate)
            newDate.setDate(newDate.getDate() - 1)
            handleDateSelect(newDate)
          }
          if (e.key === "ArrowRight") {
            e.preventDefault()
            const newDate = new Date(selectedDate)
            newDate.setDate(newDate.getDate() + 1)
            handleDateSelect(newDate)
          }
        } else if (showTimeSelect && !showDateSelect) {
          // Chỉ có time - điều hướng giờ
          handleTimeKeyDown(e)
        }
        // Với datetime, có thể thêm logic phức tạp hơn nếu cần
      }
    }

    // Xử lý khi blur input
    const handleInputBlur = () => {
      setIsTyping(false)

      // Format lại giá trị cuối cùng nếu có selectedDate
      if (selectedDate) {
        setInputValue(format(selectedDate, getDisplayFormat(), { locale: vi }))
      }
    }

    // Helper function để chọn ngày
    const handleDateSelect = (date) => {
      setSelectedDate(date)
      setCurrentMonth(date)
      setInputValue(format(date, getDisplayFormat(), { locale: vi }))

      if (onChange) {
        onChange({
          target: {
            name,
            value: date,
          },
        })
      }
    }

    // Xử lý khi click vào ngày
    const handleDateClick = (day) => {
      let newDate

      if (selectedDate) {
        newDate = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          selectedDate.getHours(),
          selectedDate.getMinutes(),
          selectedDate.getSeconds(),
        )
      } else {
        newDate = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          Number.parseInt(hours, 10),
          Number.parseInt(minutes, 10),
          0,
        )
      }

      handleDateSelect(newDate)

      if (!showTimeSelect) {
        setIsOpen(false)
      } else {
        setActiveTab("time")
      }
    }

    // Xử lý khi thay đổi giờ
    const handleTimeChange = (type, value) => {

      let newValue = Number.parseInt(value, 10)

      if (type === "hours") {
        newValue = Math.max(0, Math.min(23, newValue))
        setHourValue(newValue.toString().padStart(2, "0"))
      } else {
        newValue = Math.max(0, Math.min(59, newValue))
        setMinuteValue(newValue.toString().padStart(2, "0"))
      }

      if (selectedDate) {
        let newDate
        if (type === "hours") {
          newDate = setHours(selectedDate, newValue)
        } else {
          newDate = setMinutes(selectedDate, newValue)
        }

        handleDateSelect(newDate)
      } else if (showDateSelect) {
        const now = new Date()
        const hoursValue = type === "hours" ? newValue : Number.parseInt(hours, 10)
        const minutesValue = type === "minutes" ? newValue : Number.parseInt(minutes, 10)

        const newDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hoursValue, minutesValue, 0)
        handleDateSelect(newDate)
      }

      // if (!selectedDate && showTimeSelect && !showDateSelect) {
      //   setSelectedDate("10:00")
      // }
    }

    // Xử lý khi thay đổi tháng
    const handleMonthChange = (increment) => {
      if (increment) {
        setCurrentMonth(addMonths(currentMonth, 1))
      } else {
        setCurrentMonth(subMonths(currentMonth, 1))
      }
    }

    // Xử lý khi nhấn nút xóa
    const handleClear = () => {
      setSelectedDate(null)
      setInputValue("")
      setIsTyping(false)
      if (onChange) {
        onChange({
          target: {
            name,
            value: null,
          },
        })
      }
    }

    // Tạo lịch
    const renderCalendar = () => {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const startDate = new Date(monthStart)
      const endDate = new Date(monthEnd)

      const dayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

      const endDayOfWeek = endDate.getDay()
      endDate.setDate(endDate.getDate() + (endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek))

      const dateFormat = "d"
      const rows = []
      let days = []
      const day = new Date(startDate)
      let formattedDate = ""

      const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

      const header = daysOfWeek.map((dayName) => (
        <div key={dayName} className="w-8 h-8 flex items-center justify-center text-xs font-medium">
          {dayName}
        </div>
      ))

      while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
          formattedDate = format(day, dateFormat)
          const cloneDay = new Date(day)
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()

          days.push(
            <div
              key={day.toString()}
              className={`w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors
                ${isCurrentMonth ? "" : "text-gray-300"}
                ${isToday && !isSelected ? "bg-blue-100 text-blue-600" : ""}
                ${isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-100"}
                ${!isCurrentMonth ? "hover:bg-transparent" : ""}
              `}
              onClick={() => isCurrentMonth && handleDateClick(cloneDay)}
            >
              {formattedDate}
            </div>,
          )
          day.setDate(day.getDate() + 1)
        }
        rows.push(
          <div key={day.toString()} className="grid grid-cols-7 gap-0">
            {days}
          </div>,
        )
        days = []
      }

      return (
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => handleMonthChange(false)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium">{format(currentMonth, "MMMM yyyy", { locale: vi })}</div>
            <button
              type="button"
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => handleMonthChange(true)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0 mb-1">{header}</div>
          {rows}
        </div>
      )
    }

    // Tạo bộ chọn giờ
    const renderTimePicker = () => {
      // Validate logic
      const hourNum = Number(hours)
      const minuteNum = Number(minutes)
      const isConfirmDisabled =
        hours === "" || minutes === "" ||
        isNaN(hourNum) || isNaN(minuteNum) ||
        hourNum < 0 || hourNum > 23 ||
        minuteNum < 0 || minuteNum > 59

      return (
        <div className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex flex-col items-center">
              <label className="text-xs text-gray-500 mb-1">Giờ</label>
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHourValue(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xl font-bold">:</div>
            <div className="flex flex-col items-center">
              <label className="text-xs text-gray-500 mb-1">Phút</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinuteValue(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {["07:00", "12:00", "17:30"].map((time) => (
              <button
                key={time}
                type="button"
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                onClick={() => {
                  const [h, m] = time.split(":")
                  setHourValue(h)
                  setMinuteValue(m)
                }}
              >
                {time}
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className={`px-3 py-1 text-sm text-white rounded transition-colors
            ${isConfirmDisabled ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}
          `}
              disabled={isConfirmDisabled}
              onClick={() => {
                // Đảm bảo selectedDate có giá trị nếu chỉ chọn giờ/phút
                let newDate = selectedDate
                if (!selectedDate) {
                  const now = new Date()
                  newDate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    hourNum,
                    minuteNum,
                    0
                  )
                  handleDateSelect(newDate)
                } else {
                  // Nếu đã có selectedDate, cập nhật giờ/phút vào đó
                  newDate = new Date(selectedDate)
                  newDate.setHours(hourNum)
                  newDate.setMinutes(minuteNum)
                  handleDateSelect(newDate)
                }
                setIsOpen(false);

                if (onChange) {
                  onChange({
                    target: {
                      name,
                      value: newDate,
                    },
                  })
                }
              }}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )
    }



    const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
    const normalClasses = "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    const errorClasses = "border-red-300 focus:ring-red-500 focus:border-red-500"
    const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed"

    const inputClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${disabled ? disabledClasses : ""} ${className}`

    return (
      <div className={`relative w-full ${colSpan}`} ref={wrapperRef}>
        <div className="relative">
          <input
            id={id}
            name={name}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            onClick={() => !disabled && !readOnly && openDropdown()}
            disabled={disabled}
            readOnly={readOnly}
            className={inputClasses}
            ref={(el) => {
              inputRef.current = el
              if (ref) {
                if (typeof ref === "function") {
                  ref(el)
                } else {
                  ref.current = el
                }
              }
            }}
            autoComplete="off"
            {...rest}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {inputValue && !disabled && !readOnly && (
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 mr-1 transition-colors"
                onClick={handleClear}
                tabIndex={-1}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 transition-colors"
              onClick={() => !disabled && !readOnly && (isOpen ? setIsOpen(false) : openDropdown())}
              tabIndex={-1}
            >
              {showDateSelect ? <Calendar className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}

        {isOpen && (
          <>
            <div
              className="fixed inset-0 bg-transparent z-[52]"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
            />
            <div className="fixed z-[53] w-64 bg-white border border-gray-200 rounded-md shadow-lg"
              style={{
                top: dropdownPosition.top + 'px',
                left: dropdownPosition.left + 'px',
                minWidth: '256px'
              }}
            >
              {showDateSelect && showTimeSelect && (
                <div className="flex border-b">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === "date"
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                    onClick={() => setActiveTab("date")}
                  >
                    Ngày
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === "time"
                      ? "text-blue-500 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                    onClick={() => setActiveTab("time")}
                  >
                    Giờ
                  </button>
                </div>
              )}

              {showDateSelect && (!showTimeSelect || activeTab === "date") && renderCalendar()}
              {showTimeSelect && (!showDateSelect || activeTab === "time") && renderTimePicker()}
            </div>
          </>
        )}
      </div>
    )
  },
)

DatePicker.displayName = "DatePicker"

export default DatePicker
