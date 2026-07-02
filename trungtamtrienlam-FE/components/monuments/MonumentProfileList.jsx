'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, Globe2, Map, PenLine, RotateCcw, Search, Trash2, X } from 'lucide-react'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Button } from '@/components/common/Button'
import { ConfirmModal } from '@/components/common/Modal'
import { Select } from '@/components/common/Select'
import { Table } from '@/components/common/Table'
import MonumentCreateModal from '@/components/monuments/MonumentCreateModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { MonumentProfileConstants } from '@/constants/monumentConstants'
import { buildMediaUrl } from '@/lib/mediaUrl'
import * as monumentApi from '@/lib/api/monumentsApi'

const PAGE_SIZE = 10

const SORT_OPTIONS = [
    { value: 2, label: 'Từ A-Z' },
    { value: 3, label: 'Từ Z-A' },
    { value: 0, label: 'Thời gian thêm vào mới nhất' },
    { value: 1, label: 'Thời gian thêm vào cũ nhất' },
]

const LEVEL_FILTERS = [
    { id: 'all', label: 'Tất cả', value: null },
    { id: 'specialNation', label: 'Cấp quốc gia đặc biệt', value: MonumentProfileConstants.levelObjects.specialNation },
    { id: 'nation', label: 'Cấp quốc gia', value: MonumentProfileConstants.levelObjects.nation },
    { id: 'city', label: 'Cấp thành phố', value: MonumentProfileConstants.levelObjects.city },
]

function StatusBadge({ status }) {
    const config = {
        [MonumentProfileConstants.statuses.draft]: 'bg-[#F0F0F0] text-[#434343]',
        [MonumentProfileConstants.statuses.pendingApproval]: 'bg-[#2F54EB] text-white',
        [MonumentProfileConstants.statuses.approved]: 'bg-[#52C41A] text-white',
        [MonumentProfileConstants.statuses.notApproved]: 'bg-[#F5222D] text-white',
        [MonumentProfileConstants.statuses.redo]: 'bg-[#D46B08] text-white',
        [MonumentProfileConstants.statuses.published]: 'bg-[#D46B08] text-white',
    }

    return (
        <span className={`inline-flex min-w-[100px] justify-center rounded-md px-3 py-1 text-xs font-medium ${config[status] || 'bg-gray-100 text-gray-700'}`}>
            {MonumentProfileConstants.statusNames[status] || 'Không rõ'}
        </span>
    )
}

function CheckboxFilter({ id, label, checked, onChange }) {
    return (
        <label htmlFor={id} className="flex cursor-pointer items-center group">
            <input id={id} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${checked ? 'border-[#597EF7] bg-[#597EF7]' : 'border-gray-300 bg-white group-hover:border-[#597EF7]'}`}>
                <Check className={`h-3.5 w-3.5 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
            <span className="ml-2 select-none text-sm font-medium text-gray-700">{label}</span>
        </label>
    )
}

function MonumentAvatar({ src, name }) {
    if (!src) {
        return (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-[#F0F5FF] text-xs font-semibold text-[#597EF7]">
                3D
            </div>
        )
    }

    return (
        <img
            className="h-20 w-20 flex-shrink-0 rounded-md object-cover"
            src={src}
            alt={name || 'Di tích'}
            onError={(event) => {
                event.currentTarget.style.display = 'none'
            }}
        />
    )
}

function formatDate(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('vi-VN')
}

function ReasonModal({ open, title, confirmText, onClose, onConfirm, loading }) {
    const [reason, setReason] = useState('')

    useEffect(() => {
        if (open) setReason('')
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <h2 className="text-base font-semibold text-[#1F1F1F]">{title}</h2>
                    <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Đóng">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-5 py-4">
                    <label className="mb-2 block text-sm font-semibold text-[#434547]">Nhận xét <span className="text-red-500">*</span></label>
                    <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="min-h-[150px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20"
                    />
                </div>
                <div className="flex justify-end gap-3 border-t px-5 py-4">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
                    <Button variant="primary" onClick={() => onConfirm(reason)} loading={loading}>{confirmText}</Button>
                </div>
            </div>
        </div>
    )
}

export default function MonumentProfileList({ mode = 'review' }) {
    const router = useRouter()
    const toast = useToast()
    const { user } = useAuth()
    const [items, setItems] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [sort, setSort] = useState('')
    const [levelType, setLevelType] = useState(null)
    const [allView, setAllView] = useState(0)
    const [reasonAction, setReasonAction] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [deleteItem, setDeleteItem] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const isAllMode = mode === 'all'
    const view = isAllMode ? allView : mode === 'private' ? 2 : 1
    const title = mode === 'review' ? 'Hồ sơ xét duyệt' : mode === 'private' ? 'Hồ sơ không công khai' : 'Toàn bộ hồ sơ'
    const currentUserId = useMemo(() => user?.id || user?.userID || user?.userId || user?.ID || null, [user])

    const loadData = useCallback(async (nextPage = 1) => {
        setLoading(true)
        try {
            const params = {
                page: nextPage,
                pageSize: PAGE_SIZE,
                view,
            }

            if (sort !== '') {
                params.sort = sort
            }

            if (levelType !== null) {
                params.type = levelType
            }

            const response = await monumentApi.fetchMonument(params)
            const data = response?.data || {}
            setItems(data.monuments || [])
            setTotal(data.total || 0)
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không tải được danh sách hồ sơ di tích')
        } finally {
            setLoading(false)
        }
    }, [levelType, sort, toast, view])

    useEffect(() => {
        setPage(1)
        loadData(1)
    }, [loadData])

    const filteredItems = useMemo(() => {
        const query = keyword.trim().toLowerCase()
        if (!query) return items
        return items.filter((item) => `${item.name || ''} ${item.address || ''}`.toLowerCase().includes(query))
    }, [items, keyword])

    const totalItemsDisplay = useMemo(() => {
        if (keyword.trim()) return filteredItems.length
        if (isAllMode && view === 2 && page === 1 && filteredItems.length <= PAGE_SIZE && total > filteredItems.length) {
            return filteredItems.length
        }
        return total
    }, [filteredItems.length, isAllMode, keyword, page, total, view])

    const runAction = async (type, item, reason = '') => {
        setActionLoading(true)
        try {
            let response
            if (type === 'request') response = await monumentApi.requestApprovalMonument({ id: item.id })
            if (type === 'verify') response = await monumentApi.verifyMonument({ id: item.id })
            if (type === 'publish') response = await monumentApi.publishMonument({ id: item.id })
            if (type === 'redo') response = await monumentApi.redoMonument({ id: item.id, reason })
            if (type === 'refuse') response = await monumentApi.notVerifyMonument({ id: item.id, reason })
            toast.success(response?.message || 'Xử lý hồ sơ thành công')
            setReasonAction(null)
            await loadData(page)
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không xử lý được hồ sơ')
        } finally {
            setActionLoading(false)
        }
    }

    const confirmReasonAction = (reason) => {
        if (!reason.trim()) {
            toast.warning('Vui lòng nhập nhận xét')
            return
        }
        runAction(reasonAction.type, reasonAction.item, reason.trim())
    }

    const confirmDelete = async () => {
        if (!deleteItem) return

        setDeleteLoading(true)
        try {
            const response = await monumentApi.deleteMonument({ id: deleteItem.id })
            toast.success(response?.message || 'Xóa hồ sơ di tích thành công')
            setDeleteItem(null)
            await loadData(page)
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không xóa được hồ sơ di tích')
        } finally {
            setDeleteLoading(false)
        }
    }

    const isOwnMonument = (item) => currentUserId && String(item.userID) === String(currentUserId)

    const isLockedDraft = (item) => Number(item.status) === MonumentProfileConstants.statuses.draft && !isOwnMonument(item)

    const displayItems = useMemo(() => (
        filteredItems.map((item) => isLockedDraft(item) ? { ...item, isDisabled: true } : item)
    ), [currentUserId, filteredItems])
    const canEditDraft = (item) => {
        const isOwner = currentUserId && String(item.userID) === String(currentUserId)
        return isOwner && [
            MonumentProfileConstants.statuses.draft,
            MonumentProfileConstants.statuses.redo,
        ].includes(Number(item.status))
    }

    const canDeleteDraft = (item) => {
        const isOwner = currentUserId && String(item.userID) === String(currentUserId)
        return isOwner && [
            MonumentProfileConstants.statuses.draft,
            MonumentProfileConstants.statuses.notApproved,
        ].includes(Number(item.status))
    }

    const allColumns = [
        {
            key: 'name',
            title: 'Tên hồ sơ',
            render: (_, item) => {
                const avatarUrl = buildMediaUrl(item.avatar)
                const locked = isLockedDraft(item)

                return (
                    <div className={`flex min-w-[360px] gap-3 transition ${locked ? 'opacity-45 grayscale' : ''}`}>
                        <MonumentAvatar src={avatarUrl} name={item.name} />
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-[#434547]">{item.name}</p>
                                {locked && <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-xs font-medium text-[#8C8C8C]">Bản nháp chưa gửi</span>}
                            </div>
                            <div className="mt-1 inline-flex items-start gap-2 text-xs font-normal text-[#434547]">
                                <Map size={12} className="mt-[2px] flex-shrink-0 text-[#2F54EB]" />
                                <span>{item.address}</span>
                            </div>
                        </div>
                    </div>
                )
            },
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (status) => <StatusBadge status={status} />,
        },
        {
            key: 'actions',
            title: 'Thao tác',
            headerContentClassName: 'justify-center',
            cellClassName: 'text-center',
            render: (_, item) => {
                if (isLockedDraft(item)) {
                    return (
                        <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#8C8C8C]" title="Nhân viên chưa trình duyệt hồ sơ này">
                            <Eye size={16} className="text-[#BFBFBF]" />
                            <span>Chưa trình duyệt</span>
                        </div>
                    )
                }

                return (
                    <div className="flex items-center justify-center gap-3">
                        <button type="button" onClick={() => router.push(`/monument-profile/view/${item.id}`)} aria-label="Xem hồ sơ">
                            <Eye size={16} className="text-[#2F54EB]" />
                        </button>
                        {canEditDraft(item) && (
                            <button type="button" onClick={() => setEditItem(item)} aria-label="Sửa hồ sơ">
                                <PenLine size={16} className="text-[#2F54EB]" />
                            </button>
                        )}
                        {canDeleteDraft(item) && (
                            <button type="button" onClick={() => setDeleteItem(item)} aria-label="Xóa hồ sơ">
                                <Trash2 size={16} className="text-[#F5222D]" />
                            </button>
                        )}
                    </div>
                )
            },
        },
    ]

    const reviewColumns = [
        {
            key: 'name',
            title: 'Tên hồ sơ',
            render: (_, item) => (
                <div className="min-w-[260px]">
                    <p className="font-semibold text-[#1F1F1F]">{item.name}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">{item.address}</p>
                </div>
            ),
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (status) => <StatusBadge status={status} />,
        },
        {
            key: 'pendingLevel',
            title: 'Đang chờ',
            render: (_, item) => item.pendingLevelName || '-',
        },
        {
            key: 'createdDate',
            title: 'Ngày tạo',
            render: (value) => formatDate(value),
        },
        {
            key: 'actions',
            title: 'Thao tác',
            cellClassName: 'min-w-[300px]',
            render: (_, item) => {
                const canRequest = [0, 3, 4].includes(Number(item.status)) || (Number(item.status) === 1 && [3, 2].includes(Number(item.pendingLevel)))
                const canVerify = Number(item.status) === 1 && Number(item.pendingLevel) === 1
                const canReview = Number(item.status) === 1
                const canPublish = Number(item.status) === 2

                return (
                    <div className="flex flex-wrap gap-2">
                        {canRequest && (
                            <Button size="sm" onClick={() => runAction('request', item)} disabled={actionLoading} className="!bg-[#597EF7] hover:!bg-[#486BE0]">
                                <ArrowRight className="h-4 w-4" />
                                Trình duyệt
                            </Button>
                        )}
                        {canVerify && (
                            <Button size="sm" onClick={() => runAction('verify', item)} disabled={actionLoading} className="!bg-[#597EF7] hover:!bg-[#486BE0]">
                                <Check className="h-4 w-4" />
                                Duyệt
                            </Button>
                        )}
                        {canReview && (
                            <>
                                <Button size="sm" variant="outline" onClick={() => setReasonAction({ type: 'redo', item })} disabled={actionLoading} className="!border-[#D46B08] !text-[#D46B08]">
                                    <RotateCcw className="h-4 w-4" />
                                    Trả lại
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => setReasonAction({ type: 'refuse', item })} disabled={actionLoading}>
                                    <X className="h-4 w-4" />
                                    Không duyệt
                                </Button>
                            </>
                        )}
                        {canPublish && (
                            <Button size="sm" onClick={() => runAction('publish', item)} disabled={actionLoading} className="!bg-[#08979C] hover:!bg-[#08737A]">
                                <Globe2 className="h-4 w-4" />
                                Đẩy lên website
                            </Button>
                        )}
                    </div>
                )
            },
        },
    ]

    const onChangeAllView = (nextView) => {
        setAllView(nextView)
        setPage(1)
    }

    const onChangeSort = (event) => {
        const value = event.target.value
        setSort(value === '' ? '' : Number(value))
        setPage(1)
    }

    const onChangeLevelType = (value) => () => {
        setLevelType(value)
        setPage(1)
    }

    if (isAllMode) {
        return (
            <div className="p-6">
                <h1 className="text-lg font-medium text-[#1F1F1F]">Toàn bộ hồ sơ</h1>

                <div className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#ADC6FF] p-1">
                    <button
                        type="button"
                        onClick={() => onChangeAllView(0)}
                        className={`w-[150px] rounded-lg p-2 text-sm font-medium transition duration-150 ease-in-out ${view === 0 ? 'bg-[rgba(240,245,255,1)] text-[rgba(89,126,247,1)]' : 'text-[#434343]'}`}
                    >
                        Hồ sơ công khai
                    </button>
                    <button
                        type="button"
                        onClick={() => onChangeAllView(2)}
                        className={`w-[200px] rounded-lg p-2 text-sm font-medium transition duration-150 ease-in-out ${view === 2 ? 'bg-[rgba(240,245,255,1)] text-[rgba(89,126,247,1)]' : 'text-[#434343]'}`}
                    >
                        Hồ sơ không công khai
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
                    <div className="flex flex-wrap items-start gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-[#393B3D]">Sắp xếp theo</label>
                            <div className="w-full md:w-[340px]">
                                <Select value={sort} options={SORT_OPTIONS} onChange={onChangeSort} placeholder="Chọn..." />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-[#393B3D]">Tìm kiếm</label>
                            <div className="relative w-full md:w-[340px]">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    placeholder="Nhập tên hoặc địa chỉ di tích..."
                                    className="h-[40px] w-full rounded-md border border-[#d9d9d9] pl-9 pr-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[#597EF7]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex min-w-[430px] flex-col gap-1">
                        <label className="invisible text-sm font-semibold">Phân loại</label>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {LEVEL_FILTERS.map((filter) => (
                                <CheckboxFilter
                                    key={filter.id}
                                    id={filter.id}
                                    label={filter.label}
                                    checked={levelType === filter.value}
                                    onChange={onChangeLevelType(filter.value)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <Table
                        columns={allColumns}
                        data={displayItems}
                        currentPage={page}
                        itemsPerPage={PAGE_SIZE}
                        totalItems={totalItemsDisplay}
                        onPageChange={(nextPage) => {
                            setPage(nextPage)
                            loadData(nextPage)
                        }}
                        emptyMessage="Không tìm thấy hồ sơ di tích nào"
                        loading={loading}
                        showRowNumbers
                        startRowNumberFrom={1}
                        classNameColumn="bg-[#D9D9D9]"
                    />
                </div>

                <MonumentCreateModal
                    open={!!editItem}
                    itemId={editItem?.id}
                    profileType={editItem?.type ?? MonumentProfileConstants.types.public}
                    onClose={() => setEditItem(null)}
                    onSaved={() => loadData(page)}
                />
                <ConfirmModal
                    open={!!deleteItem}
                    title="Xóa hồ sơ di tích"
                    message={`Bạn có chắc chắn muốn xóa hồ sơ ${deleteItem?.name || ''}?`}
                    loading={deleteLoading}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={confirmDelete}
                />
            </div>
        )
    }

    return (
        <div className="p-6">
            <Breadcrumb items={[{ label: title, isHome: true }]} />
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-[#1F1F1F]">{title}</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">Luồng duyệt: Nhân viên &gt; Trưởng phòng &gt; Phó giám đốc &gt; Giám đốc.</p>
                </div>
                <div className="relative w-full md:w-[360px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Tìm tên hoặc địa chỉ di tích..."
                        className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20"
                    />
                </div>
            </div>

            <div className="mt-4">
                <Table
                    columns={reviewColumns}
                    data={displayItems}
                    currentPage={page}
                    itemsPerPage={PAGE_SIZE}
                    totalItems={totalItemsDisplay}
                    onPageChange={(nextPage) => {
                        setPage(nextPage)
                        loadData(nextPage)
                    }}
                    emptyMessage="Không tìm thấy hồ sơ di tích nào"
                    loading={loading}
                    showRowNumbers
                    startRowNumberFrom={1}
                    classNameColumn="bg-[#D9D9D9]"
                />
            </div>

            <ReasonModal
                open={!!reasonAction}
                title={reasonAction?.type === 'redo' ? 'Xác nhận trả lại' : 'Không duyệt tài liệu'}
                confirmText={reasonAction?.type === 'redo' ? 'Xác nhận trả lại' : 'Xác nhận không duyệt'}
                onClose={() => setReasonAction(null)}
                onConfirm={confirmReasonAction}
                loading={actionLoading}
            />
        </div>
    )
}
