'use client'

export function Button({ children, variant = 'primary', size = 'md', loading = false, disabled = false, onClick, type = 'button', className = '' }) {
    const variantMap = {
        primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    }
    const sizeMap = {
        sm: 'text-xs px-3 py-1.5 rounded-lg',
        md: 'text-sm px-4 py-2 rounded-lg',
        lg: 'text-base px-6 py-3 rounded-xl',
    }
    const stateClass = disabled || loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 focus:outline-none ${variantMap[variant]} ${sizeMap[size]} ${stateClass} ${className}`}
        >
            {loading && <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />}
            {children}
        </button>
    )
}