'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import MonumentCreateModal from '@/components/monuments/MonumentCreateModal'
import { MonumentProfileConstants } from '@/constants/monumentConstants'

export default function MonumentCreateEntry({ alias = 'public' }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const profileType = alias === 'private'
        ? MonumentProfileConstants.types.private
        : MonumentProfileConstants.types.public

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center bg-[#f7f8fa] p-6">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-md bg-[#597EF7] px-4 py-2 text-lg font-medium text-white transition hover:bg-[#486BE0] focus:outline-none focus:ring-2 focus:ring-[#597EF7] focus:ring-offset-2"
                aria-label="Tạo hồ sơ di tích"
            >
                <Plus size={24} className="mr-2" />
                Tạo hồ sơ
            </button>
            <MonumentCreateModal
                open={open}
                profileType={profileType}
                onClose={() => setOpen(false)}
                onSaved={() => router.push('/monument-profile/verify')}
            />
        </div>
    )
}