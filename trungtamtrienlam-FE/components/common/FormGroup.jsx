'use client'

export function FormGroup({ label, required = false, htmlFor, children, className = '' }) {
    if (!label && !children) return <div className={className} />

    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            {children}
        </div>
    )
}
