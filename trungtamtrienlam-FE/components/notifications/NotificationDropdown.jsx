'use client'

import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageConstants, convertTabName } from '@/constants/notificationConstants'
import NotificationItem from './NotificationItem'

function BasicSelectLike185({ name, options = [], value, onChange, placeholder = 'Chọn...' }) {
    const [open, setOpen] = useState(false)
    const selectRef = useRef(null)

    const selectedOption = useMemo(
        () => options.find((option) => String(option.value) === String(value)),
        [options, value]
    )

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (nextValue) => {
        onChange?.({ target: { name, value: nextValue } })
        setOpen(false)
    }

    return (
        <div className='w-full relative' ref={selectRef}>
            <input type='hidden' value={value ?? ''} name={name} />
            <div
                className='w-full px-3 py-2 border focus:outline-none transition-colors rounded-md border-gray-300 focus:border-blue-500 cursor-pointer flex items-center justify-between min-h-[38px] bg-white'
                role='combobox'
                aria-expanded={open}
                aria-haspopup='listbox'
                aria-disabled='false'
                onClick={() => setOpen((current) => !current)}
            >
                <span className={`flex-1 overflow-hidden whitespace-nowrap text-ellipsis ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ml-2 shrink-0 ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <div className='basic-select-dropdown absolute left-0 right-0 top-full z-[9999] mt-1 overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg'>
                    <ul role='listbox' className='py-1 max-h-60 overflow-auto'>
                        {options.map((option, index) => {
                            const selected = String(option.value) === String(value)
                            return (
                                <li
                                    key={`${option.value}-${index}`}
                                    role='option'
                                    aria-selected={selected}
                                    className={`cursor-pointer ${selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className='block px-3 py-2 truncate'>{option.label}</span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default function NotificationDropdown({
    notifications = [],
    onClose,
    onRead,
    onReadAll,
    onChangeTab,
}) {
    const ref = useRef(null)
    const router = useRouter()
    const [selectedType, setSelectedType] = useState('0')
    const [isTabChanging, setIsTabChanging] = useState(false)

    const options = Object.keys(MessageConstants.types)
        .filter((key) => key !== 'CalendarVersion2' && key !== 'Chat')
        .map((key) => ({
            value: String(MessageConstants.types[key]),
            label: convertTabName(key),
        }))
        .filter((option, index, arr) => arr.findIndex((item) => item.value === option.value) === index)

    const filteredNotifications = useMemo(() => {
        if (selectedType === '0') return notifications
        return notifications.filter((notification) => String(notification?.type) === String(selectedType))
    }, [notifications, selectedType])

    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target
            if (ref.current && !ref.current.contains(target) && !target.closest('.basic-select-dropdown')) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const handleSelectChange = (event) => {
        setIsTabChanging(true)
        setSelectedType(event.target.value)
        const index = options.findIndex((option) => option.value === event.target.value)
        onChangeTab?.(index)
        setTimeout(() => setIsTabChanging(false), 300)
    }

    const onReadNotification = (id, isRead) => {
        if (onRead && !isRead) onRead(id)
    }

    const onReadAllNotification = () => {
        if (onReadAll && notifications.some((notification) => !notification.isRead)) onReadAll()
    }

    return (
        <div
            ref={ref}
            className='px-4 gap-2 absolute top-full right-0 mt-2 w-full sm:w-96 bg-white border rounded-lg shadow-lg z-50 md:min-w-[55vw] lg:min-w-[25vw] min-w-[80vw] max-h-[50vh] flex flex-col animate-fadeIn'
        >
            <div className='sticky top-0 z-10 bg-white p-4 border-b font-semibold'>
                Thông báo
            </div>

            <BasicSelectLike185
                name='notificationType'
                options={options}
                value={selectedType}
                onChange={handleSelectChange}
                placeholder='Chọn loại thông báo'
            />

            <ul
                className={`flex-1 overflow-y-auto divide-y text-sm p-1 transition-all duration-300 ease-in-out ${
                    isTabChanging ? 'opacity-50 transform scale-98' : 'opacity-100 transform scale-100'
                }`}
            >
                {filteredNotifications.length === 0 ? (
                    <li className='py-4 text-gray-500'>Không có thông báo</li>
                ) : (
                    <div className='animate-fadeIn'>
                        {filteredNotifications.map((notification, index) => (
                            <NotificationItem
                                key={notification.id ?? index}
                                n={notification}
                                delay={index * 30}
                                onClick={() => {}}
                                onMarkRead={(id) => onReadNotification(id, notification.isRead)}
                            />
                        ))}
                    </div>
                )}
            </ul>

            <div className='bg-white p-4 border-t flex justify-between items-center'>
                <button
                    type='button'
                    className='flex items-center gap-2 text-blue-700 font-semibold cursor-pointer hover:text-blue-700 w-max transition-all duration-200 ease-in-out transform hover:scale-105'
                    onClick={onReadAllNotification}
                >
                    <Check className='w-4 h-4' />
                    Đánh dấu tất cả đã đọc
                </button>
                <button
                    type='button'
                    className='flex items-center gap-2 text-blue-700 font-semibold cursor-pointer hover:text-blue-700 w-max transition-all duration-200 ease-in-out transform hover:scale-105'
                    onClick={() => { router.push('/notifications'); onClose() }}
                >
                    Xem tất cả
                    <ArrowRight className='w-5 h-4' />
                </button>
            </div>
        </div>
    )
}
