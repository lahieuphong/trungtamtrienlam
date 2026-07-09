"use client"

import { forwardRef } from "react"
import { Loader2 } from "lucide-react"
// Thêm import Link từ next/link
import Link from "next/link"

/**
 * Component Button có thể tái sử dụng
 * @param {Object} props - Props của component
 * @param {React.ReactNode} props.children - Nội dung bên trong button
 * @param {string} props.variant - Biến thể của button (primary, secondary, outline, ghost, destructive)
 * @param {string} props.size - Kích thước của button (sm, md, lg)
 * @param {React.ReactNode} props.leftIcon - Icon bên trái
 * @param {React.ReactNode} props.rightIcon - Icon bên phải
 * @param {boolean} props.isLoading - Trạng thái loading
 * @param {boolean} props.disabled - Trạng thái disabled
 * @param {boolean} props.fullWidth - Button chiếm toàn bộ chiều rộng
 * @param {string} props.className - Class CSS bổ sung
 * @param {Function} props.onClick - Hàm xử lý khi click
 * @param {string} props.type - Loại button (button, submit, reset)
 * @param {string} props.href - Đường dẫn nếu button là một link
 */
const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled = false,
      fullWidth = false,
      className = "",
      onClick,
      type = "button",
      href,
      ...rest
    },
    ref,
  ) => {
    // Xác định các class dựa trên variant
    const variantClasses = {
      primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500",
      outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
      ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
      destructive: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
      warning: "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500",
      success: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-500",
      disabled: 'bg-[#D9D9D9] text-white'
    }

    // Xác định các class dựa trên size
    const sizeClasses = {
      sm: "text-xs px-3 py-1.5 rounded-lg",
      md: "text-sm px-4 py-2 rounded-lg",
      lg: "text-base px-6 py-3 rounded-xl",
    }

    // Xác định class cho trạng thái disabled và loading
    const stateClasses = disabled || isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"

    // Xác định class cho chiều rộng
    const widthClass = fullWidth ? "w-full" : ""

    // Kết hợp tất cả các class
    const buttonClasses = `
      inline-flex items-center justify-center font-medium transition-colors duration-200
      focus:outline-none 
      ${variantClasses[variant] || variantClasses.primary}
      ${sizeClasses[size] || sizeClasses.md}
      ${stateClasses}
      ${widthClass}
      ${className}
    `

    // focus: ring - 2 focus: ring - offset - 2

    // Nội dung của button
    const buttonContent = (
      <>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </>
    )

    // Nếu có href, render Link thay vì button
    if (href) {
      return (
        <Link href={href} className={buttonClasses} ref={ref} {...rest}>
          {buttonContent}
        </Link>
      )
    }

    // Nếu không có href, render button bình thường
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled || isLoading}
        onClick={onClick}
        {...rest}
      >
        {buttonContent}
      </button>
    )
  },
)

Button.displayName = "Button"

export default Button
