'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, TriangleAlert } from 'lucide-react'

import MonumentCreateModal from '@/components/monuments/MonumentCreateModal'
import { MonumentProfileConstants } from '@/constants/monumentConstants'
import { useAuth } from '@/contexts/AuthContext'

function normalizeRoleText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
}

function canCreateMonument3D(user) {
    if (!user) return false

    const roleText = normalizeRoleText([
        user.position,
        user.roleName,
        user.role,
        user.title,
        user.userType,
        user.accountType,
    ].filter(Boolean).join(' '))

    const hasAdminFlag = Boolean(
        user.isAdmin
        || user.is_admin
        || user.isSuperuser
        || user.is_superuser
        || user.isStaffAdmin
        || user.role?.isAdmin
        || user.role?.is_admin
    )

    const isAdmin = hasAdminFlag || roleText.includes('admin') || roleText.includes('quan tri')
    const isEmployee = roleText.includes('nhan vien')

    return isAdmin || isEmployee
}

export default function MonumentCreateEntry({ alias = 'public' }) {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [open, setOpen] = useState(false)
    const profileType = alias === 'private'
        ? MonumentProfileConstants.types.private
        : MonumentProfileConstants.types.public
    const canCreate = useMemo(() => canCreateMonument3D(user), [user])

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center bg-[#f7f8fa] p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#597EF7] border-t-transparent" />
            </div>
        )
    }

    if (!canCreate) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center bg-[#f7f8fa] p-6">
                <div className="w-full max-w-md rounded-lg border border-[#FFD591] bg-white px-6 py-7 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7E6] text-[#D46B08]">
                        <TriangleAlert size={24} />
                    </div>
                    <h1 className="mt-4 text-lg font-semibold text-[#1F1F1F]">Chưa thể thêm Di tích 3D</h1>
                    <p className="mt-2 text-sm leading-6 text-[#595959]">
                        Hồ sơ Di tích 3D cần được tạo từ tài khoản Nhân viên. Vui lòng đăng nhập đúng tài khoản để tải di tích lên.
                    </p>
                </div>
            </div>
        )
    }

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