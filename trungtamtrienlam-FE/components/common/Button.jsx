'use client'

export function Button({ children, variant = 'primary', size = 'md', loading = false, disabled = false, onClick, type = 'button', className = '' }) {
    const variantMap = {
        primary: 'bg-gray-900 text-white hover:bg-gray-700',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        ghost: 'text-gray-600 hover:bg-gray-100',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    }
    const sizeMap = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantMap[variant]} ${sizeMap[size]} ${className}`}
        >
            {loading && <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />}
            {children}
        </button>
    )
}
