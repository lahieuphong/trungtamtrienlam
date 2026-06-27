'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Edit, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { ConfirmModal } from '@/components/common/Modal'
import { fetchUserById, deleteUser } from '@/lib/api/usersApi'
import { UserFileConstants } from '@/constants/userConstants'
import { getStaffFileUrl } from '@/lib/mediaUrl'
import { ConfigConstants } from '@/constants/configConstants'

function getFileUrl(staffFilesJson, typeFile) {
    return getStaffFileUrl(staffFilesJson, typeFile)
}

function InfoField({ label, value }) {
    return (
        <div>
            <label className="block text-sm text-gray-500 mb-1">{label}</label>
            <div className="font-medium text-gray-800">{value || '—'}</div>
        </div>
    )
}

export default function AccountDetailPage() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const router = useRouter()

    const [accountData, setAccountData] = useState(null)
    const [userConcurrentlies, setUserConcurrentlies] = useState([])
    const [isDireactor, setIsDireactor] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [toast, setToast] = useState(null)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        if (!id) { setError('Không tìm thấy ID tài khoản'); return }
        const load = async () => {
            try {
                setLoading(true)
                const res = await fetchUserById({ id, isInfo: false })
                if (res?.status === 200) {
                    setAccountData(res.data?.staff)
                    setUserConcurrentlies(res.data?.userConcurrentlies || [])
                    setIsDireactor(res.data?.roleInfo?.IsDirector === true)
                } else {
                    setError('Không thể tải dữ liệu tài khoản')
                }
            } catch {
                setError('Không thể tải dữ liệu tài khoản')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    const handleDelete = async () => {
        try {
            setDeleteLoading(true)
            const res = await deleteUser(id)
            if (res?.status === 200) {
                const userInfo = JSON.parse(localStorage.getItem(ConfigConstants.localstorageUserInfoKey) || '{}')
                if (id === userInfo?.id) {
                    localStorage.clear()
                    router.push('/login')
                } else {
                    router.push('/accounts')
                }
            } else {
                showToast('Xóa tài khoản thất bại!', 'error')
            }
        } catch {
            showToast('Xóa tài khoản thất bại!', 'error')
        } finally {
            setDeleteLoading(false)
            setShowDeleteModal(false)
        }
    }

    if (!accountData && !loading) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
                    {error || 'Không tìm thấy tài khoản'}
                </div>
                <Link href="/accounts" className="mt-4 inline-block text-sm text-blue-500 hover:underline">
                    Quay lại danh sách
                </Link>
            </div>
        )
    }

    const avatarUrl = getFileUrl(accountData?.staffFiles, UserFileConstants.typeFile.Avatar)
    const signUrl = getFileUrl(accountData?.staffFiles, UserFileConstants.typeFile.Sign)
    const stampUrl = getFileUrl(accountData?.staffFiles, UserFileConstants.typeFile.Stamp)

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <Breadcrumb items={[
                    { label: 'Quản lý tài khoản', href: '/accounts', isHome: true },
                    { label: 'Thông tin tài khoản' },
                ]} />

                <h1 className="text-xl font-semibold mb-8">Thông tin tài khoản</h1>

                {toast && (
                    <div className={`mb-4 px-4 py-3 rounded-md text-sm ${toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {toast.msg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Avatar */}
                    <div className="col-span-1">
                        <h2 className="text-sm font-medium mb-4">Hình đại diện</h2>
                        <div className="w-full max-w-[300px] bg-gray-100 rounded-md overflow-hidden aspect-square flex items-center justify-center">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={accountData?.fullName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-semibold text-gray-400">
                                    {(accountData?.fullName || '?')[0]?.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-span-2">
                        {/* Thông tin cá nhân */}
                        <div className="mb-8">
                            <h2 className="text-sm font-medium mb-4 text-blue-500 border-l-4 border-blue-500 pl-2">
                                Thông tin cá nhân
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                                <InfoField label="Mã số tài khoản" value={accountData?.userName} />
                                <InfoField label="Họ" value={accountData?.firstName} />
                                <InfoField label="Tên" value={accountData?.lastName} />
                                <InfoField label="Email" value={accountData?.email} />
                                <InfoField label="Số điện thoại" value={accountData?.phoneNumber} />
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Mật khẩu</label>
                                    <span className="font-medium text-gray-800 mr-2">••••••••</span>
                                </div>
                                <InfoField label='Tỉnh/Thành phố trực thuộc TW' value={accountData?.provinceName} />
                                <InfoField label='Phường/Xã/Đặc khu' value={accountData?.wardName} />
                                <div />
                                <div className="md:col-span-3">
                                    <InfoField label="Địa chỉ" value={accountData?.address} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm text-gray-500 mb-1">Trạng thái hoạt động</label>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${accountData?.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${accountData?.status ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        {accountData?.status ? 'Đang hoạt động' : 'Không hoạt động'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-200 my-8" />

                        {/* Thông tin làm việc */}
                        <div>
                            <h2 className="text-sm font-medium mb-4 text-blue-500 border-l-4 border-blue-500 pl-2">
                                Thông tin làm việc
                            </h2>
                            {userConcurrentlies.map((uc) => (
                                <div key={uc.id} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4">
                                    <InfoField label="Bộ phận" value={uc.departmentName} />
                                    <InfoField label="Chức vụ" value={uc.roleName} />
                                </div>
                            ))}

                            {isDireactor && (signUrl || stampUrl) && (
                                <>
                                    <div className="h-px bg-gray-200 my-8" />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                                        {signUrl && (
                                            <div>
                                                <label className="block text-sm text-gray-500 mb-2">Chữ ký</label>
                                                <div className="border border-gray-200 rounded-md p-4 h-[120px] flex items-center justify-center bg-gray-50">
                                                    <img src={signUrl} alt="Chữ ký" className="max-h-full max-w-full object-contain" />
                                                </div>
                                            </div>
                                        )}
                                        {stampUrl && (
                                            <div>
                                                <label className="block text-sm text-gray-500 mb-2">Chữ ký có con dấu</label>
                                                <div className="border border-gray-200 rounded-md p-4 h-[120px] flex items-center justify-center bg-gray-50">
                                                    <img src={stampUrl} alt="Chữ ký con dấu" className="max-h-full max-w-full object-contain" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between mt-10">
                    <button onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                        Xóa tài khoản
                    </button>
                    <div className="flex gap-3">
                        <Link href="/accounts"
                            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            <X className="w-4 h-4" />
                            Đóng
                        </Link>
                        <Link href={`/accounts/edit?id=${accountData?.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">
                            <Edit className="w-4 h-4" />
                            Chỉnh sửa thông tin tài khoản
                        </Link>
                    </div>
                </div>
            </div>

            <ConfirmModal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Xoá tài khoản"
                message="Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn."
                loading={deleteLoading}
            />
        </div>
    )
}
