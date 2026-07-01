'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Globe2, RotateCcw, Search, X } from 'lucide-react'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { Button } from '@/components/common/Button'
import { Table } from '@/components/common/Table'
import { useToast } from '@/contexts/ToastContext'
import { MonumentProfileConstants } from '@/constants/monumentConstants'
import * as monumentApi from '@/lib/api/monumentsApi'

const PAGE_SIZE = 10

function StatusBadge({ status }) {
    const config = {
        [MonumentProfileConstants.statuses.draft]: 'bg-[#F0F0F0] text-[#434343]',
        [MonumentProfileConstants.statuses.pendingApproval]: 'bg-[#2F54EB] text-white',
        [MonumentProfileConstants.statuses.approved]: 'bg-[#52C41A] text-white',
        [MonumentProfileConstants.statuses.notApproved]: 'bg-[#F5222D] text-white',
        [MonumentProfileConstants.statuses.redo]: 'bg-[#D46B08] text-white',
        [MonumentProfileConstants.statuses.published]: 'bg-[#08979C] text-white',
    }
    return (
        <span className={`inline-flex min-w-[104px] justify-center rounded-md px-3 py-1 text-xs font-medium ${config[status] || 'bg-gray-100 text-gray-700'}`}>
            {MonumentProfileConstants.statusNames[status] || 'Không rõ'}
        </span>
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
    const toast = useToast()
    const [items, setItems] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [reasonAction, setReasonAction] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const view = mode === 'review' ? 1 : mode === 'private' ? 2 : 0
    const title = mode === 'review' ? 'Hồ sơ xét duyệt' : mode === 'private' ? 'Hồ sơ không công khai' : 'Toàn bộ hồ sơ'

    const loadData = async (nextPage = page) => {
        setLoading(true)
        try {
            const response = await monumentApi.fetchMonument({ page: nextPage, pageSize: PAGE_SIZE, view })
            const data = response?.data || {}
            setItems(data.monuments || [])
            setTotal(data.total || 0)
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không tải được danh sách hồ sơ di tích')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData(1)
        setPage(1)
    }, [view])

    const filteredItems = useMemo(() => {
        const query = keyword.trim().toLowerCase()
        if (!query) return items
        return items.filter((item) => `${item.name || ''} ${item.address || ''}`.toLowerCase().includes(query))
    }, [items, keyword])

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

    const columns = [
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
                    columns={columns}
                    data={filteredItems}
                    currentPage={page}
                    itemsPerPage={PAGE_SIZE}
                    totalItems={keyword.trim() ? filteredItems.length : total}
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