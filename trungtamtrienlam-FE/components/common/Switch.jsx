'use client'

export function Switch({ id, name, checked, onChange, onText = 'Bật', offText = 'Tắt' }) {
    return (
        <label className="inline-flex items-center gap-3 cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    id={id}
                    name={name}
                    checked={checked}
                    onChange={onChange}
                    className="sr-only"
                />
                <div
                    onClick={onChange}
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer
                        ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
                />
                <div
                    onClick={onChange}
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform cursor-pointer
                        ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </div>
            <span className={`text-sm font-medium ${checked ? 'text-green-600' : 'text-gray-500'}`}>
                {checked ? onText : offText}
            </span>
        </label>
    )
}
