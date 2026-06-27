'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function Breadcrumb({ items = [], className = '', onClick }) {
    if (!items || items.length === 0) return null

    const handleClick = (item) => () => {
        onClick?.(item)
    }

    return (
        <div className={`flex items-center mb-4 ${className}`}>
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center">
                    {idx > 0 && (
                        <span className="mx-2 text-gray-400">
                            <ChevronRight className="w-5 h-5 mr-1" />
                        </span>
                    )}
                    {item.href && idx < items.length - 1 ? (
                        <Link href={item.href} className="flex items-center text-blue-500 hover:text-blue-700">
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    ) : (
                        <span
                            onClick={handleClick(item)}
                            className={`${idx === items.length - 1 ? 'text-gray-900 font-medium' : 'text-blue-500 hover:text-blue-700 cursor-pointer'} text-sm`}
                        >
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </div>
    )
}