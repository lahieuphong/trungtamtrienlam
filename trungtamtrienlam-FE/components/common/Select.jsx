'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { sortBySearchScore } from '@/lib/search'

function getOptionSearchText(option) {
    const searchableValues = [
        option?.label,
        option?.name,
        option?.code,
        option?.unitType,
        option?.oldDistrictName,
        option?.searchText,
    ]
    return searchableValues.filter(Boolean).join(' ')
}

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
    showPlaceholderOption = true,
    portal = false,
}) {
    const wrapperRef = useRef(null)
    const dropdownRef = useRef(null)
    const searchRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [dropdownStyle, setDropdownStyle] = useState(null)

    const selectedOption = useMemo(
        () => options.find((option) => String(option.value) === String(value)),
        [options, value]
    )

    const filteredOptions = useMemo(() => {
        if (!query.trim()) return options
        return sortBySearchScore(options, query, getOptionSearchText)
    }, [options, query])

    const updateDropdownPosition = useCallback(() => {
        if (!portal || !wrapperRef.current) return

        const rect = wrapperRef.current.getBoundingClientRect()
        const viewportGap = 12
        const belowSpace = window.innerHeight - rect.bottom - viewportGap
        const aboveSpace = rect.top - viewportGap
        const openUp = belowSpace < 280 && aboveSpace > belowSpace
        const availableHeight = openUp ? aboveSpace - 8 : belowSpace - 8
        const maxHeight = Math.max(180, Math.min(340, availableHeight))

        setDropdownStyle({
            left: rect.left,
            top: openUp ? undefined : rect.bottom + 6,
            bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
            width: rect.width,
            maxHeight,
        })
    }, [portal])

    useEffect(() => {
        const handleOutsideClick = (event) => {
            const target = event.target
            if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return

            setOpen(false)
            setQuery('')
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [])

    useEffect(() => {
        if (open && searchable) {
            setTimeout(() => searchRef.current?.focus(), 0)
        }
    }, [open, searchable])

    useEffect(() => {
        if (!open || !portal) return undefined

        updateDropdownPosition()
        window.addEventListener('resize', updateDropdownPosition)
        window.addEventListener('scroll', updateDropdownPosition, true)

        return () => {
            window.removeEventListener('resize', updateDropdownPosition)
            window.removeEventListener('scroll', updateDropdownPosition, true)
        }
    }, [open, portal, updateDropdownPosition])

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
        error ? '!border-red-400 focus:!border-red-500' : 'border-gray-300 focus:border-blue-500',
        disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'cursor-pointer text-gray-900',
        className,
    ].join(' ')

    const listMaxHeight = Math.max(120, (dropdownStyle?.maxHeight ?? 320) - (searchable ? 58 : 0))
    const dropdown = open ? (
        <div
            ref={dropdownRef}
            className={`${portal ? 'fixed z-[100]' : 'absolute left-0 right-0 top-full z-50 mt-1'} overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg`}
            style={portal ? { ...dropdownStyle, visibility: dropdownStyle ? 'visible' : 'hidden' } : undefined}
        >
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

            <div className="overflow-y-auto py-1" role="listbox" style={{ maxHeight: listMaxHeight }}>
                {showPlaceholderOption && placeholder && !query && (
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
    ) : null

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
                onClick={() => {
                    if (disabled) return
                    setOpen((current) => !current)
                }}
            >
                <span className={selectedOption ? 'truncate' : 'truncate text-gray-500'}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {portal && typeof document !== 'undefined' ? createPortal(dropdown, document.body) : dropdown}

            {error && errorMessage && (
                <p className="mt-1 text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    )
}