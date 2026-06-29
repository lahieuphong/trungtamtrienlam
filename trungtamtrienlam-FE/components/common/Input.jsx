'use client'

export function Input({
    id, name, type = 'text', value, onChange, placeholder, disabled = false,
    error = false, errorMessage = '', className = '', rightElement = null, ...props
}) {
    return (
        <div>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors
                        ${rightElement ? 'pr-10' : ''}
                        ${error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}
                        ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}
                        ${className}`}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && errorMessage && (
                <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    )
}