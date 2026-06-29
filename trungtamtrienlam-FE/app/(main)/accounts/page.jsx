'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Eye, Pencil, Trash2, Plus, KeyRound } from 'lucide-react'
import { useDebouncedValue } from '@/lib/search'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Table } from '@/components/common/Table'
import { Button } from '@/components/common/Button'
import { ConfirmModal } from '@/components/common/Modal'
import { fetchUsers, deleteUser, resetUser } from '@/lib/api/usersApi'
import { getStaffFileUrl } from '@/lib/mediaUrl'
import { UserFileConstants } from '@/constants/userConstants'
import { useToast } from '@/contexts/ToastContext'

function getAvatarUrl(staffFilesJson) {
    return getStaffFileUrl(staffFilesJson, UserFileConstants.typeFile.Avatar)
}

export default function AccountsPage() {
    const router = useRouter()
    const toast = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(15)
    const [accounts, setAccounts] = useState([])
    const [totalItems, setTotalItems] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [accountToDelete, setAccountToDelete] = useState(null)
    const [accountToResetPassword, setAccountToResetPassword] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)


    const loadAccounts = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetchUsers({
                page: currentPage,
                pageSize,
                keyword: debouncedSearchQuery,
            })

            if (response?.status === 200) {
                setAccounts(response.data?.staffs || [])
                setTotalItems(response.data?.total || 0)
            } else {
                setError('Không thể tải danh sách tài khoản. Vui lòng thử lại sau.')
            }
        } catch (err) {
            console.error('Error fetching accounts:', err)
            setError('Không thể tải danh sách tài khoản. Vui lòng thử lại sau.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAccounts()
    }, [currentPage, pageSize, debouncedSearchQuery])

    const handleSearch = (event) => {
        event.preventDefault()
        setCurrentPage(1)
    }

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value)
        setCurrentPage(1)
    }

    const handleDeleteConfirm = async () => {
        if (!accountToDelete) return
        try {
            setActionLoading(true)
            const response = await deleteUser(accountToDelete.id)
            if (response?.status === 200) {
                toast.success('Xóa tài khoản thành công!')
                await loadAccounts()
            } else {
                toast.error('Xóa tài khoản thất bại!')
            }
        } catch (err) {
            console.error('Error deleting account:', err)
            toast.error('Xóa tài khoản thất bại!')
        } finally {
            setActionLoading(false)
            setAccountToDelete(null)
        }
    }

    const handleResetPasswordConfirm = async () => {
        if (!accountToResetPassword) return
        try {
            setActionLoading(true)
            const response = await resetUser(accountToResetPassword.id)
            if (response?.status === 200) {
                toast.success('Đặt lại mật khẩu thành công. Hệ thống đã gửi đường dẫn đặt lại mật khẩu đến email của người dùng!')
                await loadAccounts()
            } else {
                toast.error('Đặt lại mật khẩu thất bại!')
            }
        } catch (err) {
            console.error('Error resetting password:', err)
            toast.error('Đặt lại mật khẩu thất bại!')
        } finally {
            setActionLoading(false)
            setAccountToResetPassword(null)
        }
    }

    const columns = [
        {
            key: 'avatar',
            title: '',
            sortable: false,
            render: (_, account) => {
                const avatarUrl = getAvatarUrl(account.staffFiles)
                return (
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 overflow-hidden">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={account.fullName}
                                    title={account.fullName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                                    {(account.fullName || '?')[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                )
            },
        },
        { key: 'userName', title: 'Mã số', sortable: true },
        { key: 'fullName', title: 'Họ và tên', sortable: true },
        { key: 'email', title: 'Email', sortable: true },
        { key: 'phoneNumber', title: 'Số điện thoại', sortable: true },
        { key: 'roleName', title: 'Chức vụ', sortable: true },
        {
            key: 'status',
            title: 'Trạng thái',
            sortable: true,
            render: (_, account) => (
                <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${account.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                >
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${account.status ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {account.status ? 'Đang hoạt động' : 'Không hoạt động'}
                </div>
            ),
        },
        {
            key: 'actions',
            title: 'Thao tác',
            sortable: false,
            render: (_, account) => (
                <div className="flex justify-start space-x-2 items-center">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 text-sm px-4 py-2 rounded-lg cursor-pointer text-gray-500 hover:text-blue-500 hover:bg-transparent !p-0"
                        title="Xem chi tiết"
                        onClick={() => router.push(`/accounts/detail?id=${account.id}`)}
                    >
                        <Eye className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 text-sm px-4 py-2 rounded-lg cursor-pointer text-gray-500 hover:text-blue-500 hover:bg-transparent !p-0"
                        title="Chỉnh sửa"
                        onClick={() => router.push(`/accounts/edit?id=${account.id}`)}
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 text-sm px-4 py-2 rounded-lg cursor-pointer text-gray-500 hover:text-red-500 hover:bg-transparent !p-0"
                        title="Xóa"
                        onClick={() => setAccountToDelete(account)}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 text-sm px-4 py-2 rounded-lg cursor-pointer text-gray-500 hover:text-red-500 hover:bg-transparent !p-0"
                        title="Đặt lại mật khẩu"
                        onClick={() => setAccountToResetPassword(account)}
                    >
                        <KeyRound className="w-5 h-5" />
                    </button>
                </div>
            ),
        },
    ]

    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: 'Quản lý tài khoản', isHome: true }]} />

            <div className="flex justify-between items-center mb-6">
                <form onSubmit={handleSearch} className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        id="search"
                        name="search"
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tìm kiếm tài khoản"
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    <button type="submit" className="hidden">
                        Tìm kiếm
                    </button>
                </form>

                <Button onClick={() => router.push('/accounts/new')}>
                    <Plus className="w-5 h-5" />
                    Thêm tài khoản mới
                </Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">{error}</div>}

            <Table
                columns={columns}
                data={accounts}
                defaultSortColumn="fullName"
                defaultSortDirection="asc"
                currentPage={currentPage}
                itemsPerPage={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                emptyMessage="Không tìm thấy tài khoản nào"
                loading={loading}
                showRowNumbers={true}
                startRowNumberFrom={1}
            />

            <ConfirmModal
                open={!!accountToDelete}
                onClose={() => setAccountToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Xoá tài khoản"
                message="Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn."
                loading={actionLoading}
            />
            <ConfirmModal
                open={!!accountToResetPassword}
                onClose={() => setAccountToResetPassword(null)}
                onConfirm={handleResetPasswordConfirm}
                title="Đặt lại mật khẩu"
                message="Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản này?"
                loading={actionLoading}
            />
        </div>
    )
}