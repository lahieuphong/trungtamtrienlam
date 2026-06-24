'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumb({ items = [] }) {
    const isSingleHomePage = items.length === 1 && items[0].isHome && !items[0].href

    if (isSingleHomePage) {
        return (
            <h2 className="font-semibold text-gray-800 mb-6">{items[0].label}</h2>
        )
    }

    return (
        <nav className="flex items-center gap-1.5 text-sm mb-6">
            {items.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    {item.isHome && <Home className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    {item.href ? (
                        <Link href={item.href} className="text-blue-500 hover:underline">
                            {item.label}
                        </Link>
                    ) : (
                        <span className={idx === items.length - 1 ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                            {item.label}
                        </span>
                    )}
                </span>
            ))}
        </nav>
    )
}
