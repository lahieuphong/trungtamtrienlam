'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Eye, Pencil, Trash2, Plus, KeyRound } from 'lucide-react'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Table, TablePagination } from '@/components/common/Table'
import { Button } from '@/components/common/Button'
import { ConfirmModal } from '@/components/common/Modal'
import { fetchUsers, deleteUser, resetUser } from '@/lib/api/usersApi'
import { ApiConstants } from '@/constants/apiConstants'
import { UserFileConstants } from '@/constants/userConstants'

function getAvatarUrl(staffFilesJson) {
    try {
        const files = JSON.parse(staffFilesJson || '[]')
        const avatar = files.find(f => f.TypeFile === UserFileConstants.typeFile.Avatar)
        if (!avatar?.File) return null
        if (avatar.File.startsWith('http')) return avatar.File
        return `${ApiConstants.cdnUrl}/${avatar.File}`
    } catch {
        return null
    }
}

export default function AccountsPage() {
    const router = useRouter()
    const [accounts, setAccounts] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const pageSize = 15
    const [keyword, setKeyword] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [toast, setToast] = useState(null)

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [resetTarget, setResetTarget] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const loadData = async (p = page, kw = keyword) => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetchUsers({ page: p, pageSize, keyword: kw })
            if (res?.status === 200) {
                setAccounts(res.data?.staffs || [])
                setTotal(res.data?.total || 0)
            } else {
                setError('Không thể tải danh sách tài khoản')
            }
        } catch {
            setError('Không thể tải danh sách tài khoản')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData(page, keyword)
    }, [page, keyword])

    const handleSearch = (e) => {
        e.preventDefault()
        setPage(1)
        setKeyword(searchInput)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setActionLoading(true)
        try {
            const res = await deleteUser(deleteTarget.id)
            if (res?.status === 200) {
                showToast('Xóa tài khoản thành công!')
                loadData()
            } else {
                showToast('Xóa tài khoản thất bại!', 'error')
            }
        } catch {
            showToast('Xóa tài khoản thất bại!', 'error')
        } finally {
            setActionLoading(false)
            setDeleteTarget(null)
        }
    }

    const handleResetPassword = async () => {
        if (!resetTarget) return
        setActionLoading(true)
        try {
            const res = await resetUser(resetTarget.id)
            if (res?.status === 200) {
                showToast('Đã gửi đường dẫn đặt lại mật khẩu đến email người dùng!')
            } else {
                showToast('Đặt lại mật khẩu thất bại!', 'error')
            }
        } catch {
            showToast('Đặt lại mật khẩu thất bại!', 'error')
        } finally {
            setActionLoading(false)
            setResetTarget(null)
        }
    }

    const columns = [
        {
            key: 'avatar',
            title: '',
            width: 56,
            render: (_, row) => {
                const src = getAvatarUrl(row.staffFiles)
                return (
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {src ? (
                            <img src={src} alt={row.fullName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                                {(row.fullName || '?')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                )
            },
        },
        { key: 'userName', title: 'Mã số', width: 120, sortable: true },
        { key: 'fullName', title: 'Họ và tên', sortable: true },
        { key: 'email', title: 'Email', sortable: true },
        { key: 'phoneNumber', title: 'Số điện thoại', width: 140, sortable: true },
        { key: 'roleName', title: 'Chức vụ', sortable: true },
        {
            key: 'status',
            title: 'Trạng thái',
            width: 140,
            sortable: true,
            render: (_, row) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${row.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.status ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {row.status ? 'Đang hoạt động' : 'Không hoạt động'}
                </span>
            ),
        },
        {
            key: 'actions',
            title: 'Thao tác',
            width: 120,
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => router.push(`/accounts/detail?id=${row.id}`)}
                        className="text-gray-400 hover:text-blue-500 transition-colors" title="Xem chi tiết">
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => router.push(`/accounts/edit?id=${row.id}`)}
                        className="text-gray-400 hover:text-blue-500 transition-colors" title="Chỉnh sửa">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(row)}
                        className="text-gray-400 hover:text-red-500 transition-colors" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setResetTarget(row)}
                        className="text-gray-400 hover:text-orange-500 transition-colors" title="Đặt lại mật khẩu">
                        <KeyRound className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ]

    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Quản lý tài khoản', isHome: true }]} />

            {toast && (
                <div className={`mb-4 px-4 py-3 rounded-md text-sm ${toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex justify-between items-center mb-6 gap-4">
                <form onSubmit={handleSearch} className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Tìm kiếm tài khoản..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    />
                </form>

                <Button onClick={() => router.push('/accounts/new')} className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                    Thêm tài khoản mới
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 text-sm">{error}</div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <Table
                    columns={columns}
                    data={accounts}
                    loading={loading}
                    emptyText="Không tìm thấy tài khoản nào"
                    showRowNumbers={true}
                    startRowNumber={(page - 1) * pageSize + 1}
                />
                <TablePagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
            </div>

            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Xoá tài khoản"
                message={`Bạn có chắc muốn xóa tài khoản "${deleteTarget?.fullName || deleteTarget?.userName}"? Hành động này không thể hoàn tác.`}
                loading={actionLoading}
            />
            <ConfirmModal
                open={!!resetTarget}
                onClose={() => setResetTarget(null)}
                onConfirm={handleResetPassword}
                title="Đặt lại mật khẩu"
                message={`Hệ thống sẽ gửi đường dẫn đặt lại mật khẩu đến email của "${resetTarget?.fullName || resetTarget?.userName}". Tiếp tục?`}
                loading={actionLoading}
            />
        </div>
    )
}
