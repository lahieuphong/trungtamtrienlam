'use client'

export function Select({
    id, name, value, onChange, options = [], disabled = false,
    placeholder = '-- Chọn --', className = ''
}) {
    return (
        <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors
                ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                ${className}`}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    )
}
