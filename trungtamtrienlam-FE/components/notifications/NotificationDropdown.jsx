'use client'
import { ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useMemo } from 'react'
import { MessageConstants, convertTabName } from '@/constants/notificationConstants'
import NotificationItem from './NotificationItem'

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
        .filter(k => k !== 'CalendarVersion2' && k !== 'Chat')
        .map(k => ({
            value: String(MessageConstants.types[k]),
            label: convertTabName(k),
        }))
        // remove duplicate values
        .filter((opt, i, arr) => arr.findIndex(o => o.value === opt.value) === i)

    const byType = useMemo(() => {
        if (selectedType === '0') return notifications
        return notifications.filter(n => String(n?.type) === String(selectedType))
    }, [notifications, selectedType])

    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target
            if (ref.current && !ref.current.contains(target)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const handleSelectChange = (e) => {
        setIsTabChanging(true)
        setSelectedType(e.target.value)
        const idx = options.findIndex(o => o.value === e.target.value)
        if (onChangeTab) onChangeTab(idx)
        setTimeout(() => setIsTabChanging(false), 300)
    }

    const onReadNotification = (id, isRead) => {
        if (onRead && !isRead) onRead(id)
    }

    const onReadAllNotification = () => {
        if (onReadAll && notifications.some(n => !n.isRead)) onReadAll()
    }

    return (
        <div
            ref={ref}
            className='px-4 gap-2 absolute right-0 mt-2 w-full sm:w-96 bg-white border rounded-lg shadow-lg z-50 md:min-w-[55vw] lg:min-w-[25vw] min-w-[80vw] max-h-[50vh] flex flex-col animate-fadeIn'
        >
            <div className='sticky top-0 z-10 bg-white p-4 border-b font-semibold'>
                Thông báo
            </div>

            {/* Type filter */}
            <select
                value={selectedType}
                onChange={handleSelectChange}
                className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            <ul
                className={`flex-1 overflow-y-auto divide-y text-sm p-1 transition-all duration-300 ease-in-out ${
                    isTabChanging ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'
                }`}
            >
                {byType.length === 0 ? (
                    <li className='py-4 text-gray-500'>Không có thông báo</li>
                ) : (
                    <div className='animate-fadeIn'>
                        {byType.map((n, idx) => (
                            <NotificationItem
                                key={n.id ?? idx}
                                n={n}
                                delay={idx * 30}
                                onClick={() => {}}
                                onMarkRead={(id) => onReadNotification(id, n.isRead)}
                            />
                        ))}
                    </div>
                )}
            </ul>

            <div className='bg-white p-4 border-t flex justify-between items-center'>
                <div
                    className='flex items-center gap-2 text-blue-700 font-semibold cursor-pointer hover:text-blue-700 w-max transition-all duration-200 ease-in-out transform hover:scale-105'
                    onClick={onReadAllNotification}
                >
                    <Check className='w-4 h-4' />
                    Đánh dấu tất cả đã đọc
                </div>
                <div
                    className='flex items-center gap-2 text-blue-700 font-semibold cursor-pointer hover:text-blue-700 w-max transition-all duration-200 ease-in-out transform hover:scale-105'
                    onClick={() => { router.push('/notifications'); onClose() }}
                >
                    Xem tất cả
                    <ArrowRight className='w-5 h-4' />
                </div>
            </div>
        </div>
    )
}
