'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export function Select({
    id,
    name,
    value,
    onChange,
    options = [],
    disabled = false,
    placeholder = '-- Chọn --',
    className = '',
    error = false,
    errorMessage = '',
    searchable = true,
}) {
    const wrapperRef = useRef(null)
    const searchRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')

    const selectedOption = useMemo(
        () => options.find((option) => String(option.value) === String(value)),
        [options, value]
    )

    const filteredOptions = useMemo(() => {
        const keyword = query.trim().toLowerCase()
        if (!keyword) return options
        return options.filter((option) =>
            String(option.label || '').toLowerCase().includes(keyword)
        )
    }, [options, query])

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false)
                setQuery('')
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [])

    useEffect(() => {
        if (open && searchable) {
            setTimeout(() => searchRef.current?.focus(), 0)
        }
    }, [open, searchable])

    const emitChange = (nextValue) => {
        onChange?.({
            target: {
                id,
                name,
                value: nextValue,
            },
        })
    }

    const handleSelect = (nextValue) => {
        emitChange(nextValue)
        setOpen(false)
        setQuery('')
    }

    const triggerClasses = [
        'flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
        error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-500',
        disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'cursor-pointer text-gray-900',
        className,
    ].join(' ')

    return (
        <div ref={wrapperRef} className="relative">
            <button
                id={id}
                name={name}
                type="button"
                disabled={disabled}
                className={triggerClasses}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => !disabled && setOpen((current) => !current)}
            >
                <span className={selectedOption ? 'truncate' : 'truncate text-gray-500'}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    {searchable && (
                        <div className="p-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchRef}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
                                    placeholder="Tìm kiếm..."
                                    className="h-10 w-full rounded-md border border-blue-500 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-64 overflow-y-auto py-1" role="listbox">
                        {placeholder && !query && (
                            <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                                onClick={() => handleSelect('')}
                            >
                                <span>{placeholder}</span>
                            </button>
                        )}

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = String(option.value) === String(value)
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900 hover:bg-gray-50'}`}
                                        onClick={() => handleSelect(option.value)}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />}
                                    </button>
                                )
                            })
                        ) : (
                            <div className="px-3 py-3 text-sm text-gray-500">Không có dữ liệu</div>
                        )}
                    </div>
                </div>
            )}

            {error && errorMessage && (
                <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    )
}
