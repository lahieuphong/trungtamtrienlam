'use client'
import moment from 'moment'
import {
    AlertTriangle, Bell, Calendar, ClipboardList,
    FileText, Inbox, LibraryBig, SquarePen, Check, Landmark
} from 'lucide-react'
import { useRouter } from 'next/navigation'

function getIconByType(rawType) {
    const t = Number(rawType)
    switch (t) {
        case 1: return <ClipboardList className='w-4 h-4' />
        case 2: return <FileText className='w-4 h-4' />
        case 3: return <Calendar className='w-4 h-4' />
        case 4: return <LibraryBig className='w-4 h-4' />
        case 5: return <Inbox className='w-4 h-4' />
        case 6: return <SquarePen className='w-4 h-4' />
        case 7: return <Bell className='w-4 h-4' />
        case 8: return <Landmark className='w-4 h-4' />
        case 9: return <Calendar className='w-4 h-4' />
        case 11: return <FileText className='w-4 h-4' />
        default: return <AlertTriangle className='w-4 h-4' />
    }
}

export default function NotificationItem({ n, onMarkRead, delay = 0, read = true }) {
    const router = useRouter()

    const getDetail = (item) => {
        const t = Number(item.type)
        switch (t) {
            case 1: router.push('/tasks/tasks'); break
            case 3: router.push('/calendar'); break
            case 4: router.push('/tasks/pendingIssuance'); break
            case 5: router.push('/media/share-folder'); break
            case 6: router.push('/ratings/rankings'); break
            case 8: router.push('/monument-profile'); break
            case 9: router.push('/calendar'); break
            case 11: router.push('/templates/wordprocessing'); break
            default: break
        }
    }

    const formattedTime = moment(n.time).isValid()
        ? moment(n.time).format('HH:mm - DD/MM/YYYY')
        : (n.time || '')

    return (
        <div
            onClick={() => { getDetail(n); onMarkRead?.(n.id) }}
            style={{ animationDelay: `${delay}ms` }}
            className={`relative flex flex-col transition-all duration-200 ease-in-out cursor-pointer hover:shadow-sm hover:-translate-y-0.5 rounded-xl ${
                !n.isRead ? 'bg-blue-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-100'
            }`}
        >
            {/* unread dot */}
            {read && !n.isRead && (
                <span className='absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500' />
            )}

            {/* main content */}
            <div className='py-2 px-3 flex flex-col gap-1 w-full'>
                <div className='flex items-center gap-2 text-base font-semibold'>
                    {getIconByType(n?.type)}
                    <span className='line-clamp-2'>{n.title}</span>
                </div>
                <div
                    className='text-sm text-gray-600 line-clamp-3'
                    dangerouslySetInnerHTML={{
                        __html: n.content
                            ?.replace(/<div>/g, '<span>')
                            .replace(/<\/div>/g, '</span>'),
                    }}
                />
            </div>

            {/* footer */}
            <div className='flex justify-between items-center px-3 pb-2'>
                <div className='flex items-center gap-3'>
                    <button
                        type='button'
                        className='text-sm text-blue-600 font-semibold'
                        onClick={e => { e.stopPropagation(); getDetail(n) }}
                    >
                        Xem chi tiết
                    </button>
                    {read && !n.isRead && (
                        <button
                            type='button'
                            className='text-sm text-green-600 font-semibold inline-flex items-center gap-1'
                            onClick={e => { e.stopPropagation(); onMarkRead?.(n.id) }}
                        >
                            <Check className='w-4 h-4' />
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>
                <div className='text-xs text-gray-500'>{formattedTime}</div>
            </div>
        </div>
    )
}
