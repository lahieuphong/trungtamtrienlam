'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function CalendarButton({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  href,
  ...rest
}) {
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    disabled: 'bg-[#D9D9D9] text-white',
  }

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-lg',
    md: 'text-sm px-4 py-2 rounded-lg',
    lg: 'text-base px-6 py-3 rounded-xl',
  }

  const buttonClasses = `inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${fullWidth ? 'w-full' : ''} ${className}`

  const content = (
    <>
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  )

  if (href) {
    return <Link href={href} className={buttonClasses} {...rest}>{content}</Link>
  }

  return (
    <button type={type} className={buttonClasses} disabled={disabled || isLoading} onClick={onClick} {...rest}>
      {content}
    </button>
  )
}
