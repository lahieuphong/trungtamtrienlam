'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, CheckCircle, ChevronDown, ChevronRight, Eye, Files, Globe2, Landmark, ListFilter, Map, PenLine, RotateCcw, Search, Trash2, X } from 'lucide-react'

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
import { sortBySearchScore } from '@/lib/search'
import {
    MONUMENT_PROFILE_REFRESH_INTERVAL_MS,
    MONUMENT_PROFILE_UPDATE_CHANNEL,
    MONUMENT_PROFILE_UPDATE_EVENT,
    MONUMENT_PROFILE_UPDATE_KEY,
    notifyMonumentProfileUpdated,
} from '@/lib/monumentRealtime'
import * as monumentApi from '@/lib/api/monumentsApi'

const PAGE_SIZE = 10

const SORT_OPTIONS = [
    { value: 2, label: 'Từ A-Z' },
    { value: 3, label: 'Từ Z-A' },
    { value: 0, label: 'Thời gian thêm vào mới nhất' },
    { value: 1, label: 'Thời gian thêm vào cũ nhất' },
]

const LEVEL_FILTER_ALL = 'allRecords'
const LEVEL_FILTER_CURRENT = 'currentRecords'


function getAllViewFromTab(tab) {
    const normalized = String(tab || '').trim().toLowerCase()
    return normalized === 'private' || normalized === '2' ? 2 : 0
}
const LEVEL_FILTERS = [
    { id: 'all', label: 'Tất cả hồ sơ', value: LEVEL_FILTER_ALL, type: null, hideTemporary: false, Icon: Files },
    { id: 'current', label: 'Hồ sơ hiện hành', value: LEVEL_FILTER_CURRENT, type: null, hideTemporary: true, publicOnly: true, Icon: CheckCircle },
    { id: 'specialNation', label: 'Cấp quốc gia đặc biệt', value: MonumentProfileConstants.levelObjects.specialNation, type: MonumentProfileConstants.levelObjects.specialNation, hideTemporary: true, Icon: Landmark },
    { id: 'nation', label: 'Cấp quốc gia', value: MonumentProfileConstants.levelObjects.nation, type: MonumentProfileConstants.levelObjects.nation, hideTemporary: true, Icon: Landmark },
    { id: 'city', label: 'Cấp thành phố', value: MonumentProfileConstants.levelObjects.city, type: MonumentProfileConstants.levelObjects.city, hideTemporary: true, Icon: Landmark },
]

function StatusBadge({ status, muted = false }) {
    const config = {
        [MonumentProfileConstants.statuses.draft]: 'bg-[#F0F0F0] text-[#434343]',
        [MonumentProfileConstants.statuses.pendingApproval]: 'bg-[#2F54EB] text-white',
        [MonumentProfileConstants.statuses.approved]: 'bg-[#52C41A] text-white',
        [MonumentProfileConstants.statuses.notApproved]: 'bg-[#F5222D] text-white',
        [MonumentProfileConstants.statuses.redo]: 'bg-[#D46B08] text-white',
        [MonumentProfileConstants.statuses.published]: 'bg-[#D46B08] text-white',
    }

    if (muted) {
        return (
            <span className="inline-flex min-w-[100px] justify-center rounded-md bg-[#F0F0F0] px-3 py-1 text-xs font-medium text-[#8C8C8C]">
                {MonumentProfileConstants.statusNames[status] || 'Không rõ'}
            </span>
        )
    }

    return (
        <span className={`inline-flex min-w-[100px] justify-center rounded-md px-3 py-1 text-xs font-medium ${config[status] || 'bg-gray-100 text-gray-700'}`}>
            {MonumentProfileConstants.statusNames[status] || 'Không rõ'}
        </span>
    )
}

function LevelFilterDropdown({ options, selectedValue, selectedSteps, open, onToggle, onSelect, dropdownRef }) {
    const primaryOptions = options.filter((filter) => filter.type === null)
    const levelOptions = options.filter((filter) => filter.type !== null)

    const renderSelectedPath = () => (
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {selectedSteps.map((step, index) => (
                <span key={`${step}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
                    {index > 0 && <ChevronRight size={13} className="flex-shrink-0 text-[#8C8C8C]" />}
                    <span className={`max-w-[140px] truncate rounded sm:max-w-[180px] px-2 py-0.5 text-xs font-semibold ${index === selectedSteps.length - 1 ? 'bg-[#F0F5FF] text-[#2F54EB]' : 'bg-[#F5F5F5] text-[#595959]'}`}>
                        {step}
                    </span>
                </span>
            ))}
        </span>
    )

    const renderOptionContent = (filter, isLevelFilter = false) => {
        const FilterIcon = filter.Icon

        return (
            <span className={`flex min-w-0 flex-1 items-center gap-2 ${isLevelFilter ? 'pl-5' : ''}`}>
                {FilterIcon && <FilterIcon size={16} className="flex-shrink-0 text-current" />}
                <span className="truncate font-medium">{filter.label}</span>
            </span>
        )
    }

    const renderOptionButton = (filter, isLevelFilter = false) => {
        const checked = selectedValue === filter.value

        return (
            <button
                key={filter.id}
                type="button"
                onClick={() => onSelect(filter.value)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition duration-150 ease-in-out ${checked ? 'bg-[#F0F5FF] text-[#2F54EB]' : 'text-[#434343] hover:bg-[#F5F7FF] hover:text-[#2F54EB]'}`}
            >
                {renderOptionContent(filter, isLevelFilter)}
                {checked && <Check size={16} className="flex-shrink-0" />}
            </button>
        )
    }

    return (
        <div ref={dropdownRef} className="relative w-full">
            <button
                type="button"
                aria-expanded={open}
                onClick={onToggle}
                className={`flex min-h-[40px] w-full items-center gap-3 rounded-md border bg-white px-3 py-1.5 text-left transition duration-150 ease-in-out ${open ? 'border-[#597EF7] shadow-sm' : 'border-[#D9D9D9] hover:border-[#85A5FF]'}`}
            >
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#F0F5FF] text-[#2F54EB]">
                    <ListFilter size={16} />
                </span>
                <span className="flex min-w-0 flex-1 items-center">
                    {renderSelectedPath()}
                </span>
                <ChevronDown size={16} className={`flex-shrink-0 text-[#595959] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-md border border-[#E5E7EB] bg-white py-1 shadow-lg">
                    {primaryOptions.map((filter) => {
                        const hasLevelChildren = filter.value === LEVEL_FILTER_CURRENT && levelOptions.length > 0

                        if (!hasLevelChildren) return renderOptionButton(filter)

                        return (
                            <div key={filter.id} className="group">
                                {renderOptionButton(filter)}
                                <div className="hidden pb-1 group-hover:block group-focus-within:block">
                                    {levelOptions.map((levelFilter) => renderOptionButton(levelFilter, true))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
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

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u0111\u0110]/g, 'd')
        .toLowerCase()
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

function PublishConfirmModal({ open, onClose, onConfirm, loading }) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
                <div className="border-b px-6 py-4">
                    <h2 className="text-xl font-semibold text-[#1F1F1F]">Đẩy lên website</h2>
                </div>
                <div className="px-6 py-8 text-sm leading-6 text-[#1F1F1F]">
                    Khi đẩy lên website, thông tin công khai sẽ được hiển thị cho người dùng thấy, bạn có chắc chắn muốn đẩy lên website
                </div>
                <div className="flex justify-end gap-3 border-t bg-[#FAFAFA] px-6 py-4">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="!rounded-lg">
                        <X className="h-4 w-4" />
                        Hủy
                    </Button>
                    <Button onClick={onConfirm} loading={loading} className="!rounded-lg !bg-[#597EF7] hover:!bg-[#2F54EB]">
                        <Check className="h-4 w-4" />
                        Xác nhận
                    </Button>
                </div>
            </div>
        </div>
    )
}
export default function MonumentProfileList({ mode = 'review', initialTab }) {
    const router = useRouter()
    const toast = useToast()
    const { user } = useAuth()
    const filterDropdownRef = useRef(null)
    const [items, setItems] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [sort, setSort] = useState('')
    const [levelType, setLevelType] = useState(LEVEL_FILTER_ALL)
    const [filterOpen, setFilterOpen] = useState(false)
    const [allView, setAllView] = useState(() => getAllViewFromTab(initialTab))
    const [reasonAction, setReasonAction] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [deleteItem, setDeleteItem] = useState(null)
    const [publishItem, setPublishItem] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const isAllMode = mode === 'all'
    const view = isAllMode ? allView : mode === 'private' ? 2 : 1
    const title = mode === 'review' ? 'Hồ sơ xét duyệt' : mode === 'private' ? 'Hồ sơ không công khai' : 'Toàn bộ hồ sơ'

    useEffect(() => {
        if (isAllMode) setAllView(getAllViewFromTab(initialTab))
    }, [initialTab, isAllMode])

    const currentUserId = useMemo(() => user?.id || user?.userID || user?.userId || user?.ID || null, [user])
    const currentApprovalLevel = useMemo(() => {
        const roleText = normalizeText([
            user?.position,
            user?.roleName,
            user?.role,
            user?.title,
        ].filter(Boolean).join(' '))

        if (roleText.includes('truong phong')) return 3
        if (roleText.includes('pho giam doc')) return 2
        if (roleText.includes('giam doc')) return 1
        return null
    }, [user])

    const selectedLevelFilter = useMemo(() => (
        LEVEL_FILTERS.find((filter) => filter.value === levelType) || LEVEL_FILTERS[0]
    ), [levelType])
    const selectedLevelType = selectedLevelFilter.type ?? null
    const selectedLevelSteps = selectedLevelFilter.type !== null
        ? ['Hồ sơ hiện hành', selectedLevelFilter.label]
        : [selectedLevelFilter.label]

    const loadData = useCallback(async (nextPage = 1, options = {}) => {
        const silent = options.silent === true
        if (!silent) setLoading(true)
        try {
            const params = {
                page: nextPage,
                pageSize: PAGE_SIZE,
                view,
            }

            if (sort !== '') {
                params.sort = sort
            }

            if (selectedLevelType !== null) {
                params.type = selectedLevelType
            }

            const response = await monumentApi.fetchMonument(params)
            const data = response?.data || {}
            setItems(data.monuments || [])
            setTotal(data.total || 0)
        } catch (error) {
            if (!silent) {
                toast.error(error?.response?.data?.message || 'Không tải được danh sách hồ sơ di tích')
            }
        } finally {
            if (!silent) setLoading(false)
        }
    }, [selectedLevelType, sort, toast, view])

    useEffect(() => {
        setPage(1)
        loadData(1)
    }, [loadData])

    useEffect(() => {
        if (!filterOpen) return undefined

        const closeWhenOutside = (event) => {
            if (!filterDropdownRef.current?.contains(event.target)) {
                setFilterOpen(false)
            }
        }

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setFilterOpen(false)
        }

        document.addEventListener('mousedown', closeWhenOutside)
        document.addEventListener('keydown', closeOnEscape)

        return () => {
            document.removeEventListener('mousedown', closeWhenOutside)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [filterOpen])

    useEffect(() => {
        const refreshCurrentPage = () => {
            loadData(page, { silent: true })
        }

        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshCurrentPage()
            }
        }

        const onStorage = (event) => {
            if (event.key === MONUMENT_PROFILE_UPDATE_KEY) {
                refreshCurrentPage()
            }
        }

        let channel = null
        if ('BroadcastChannel' in window) {
            channel = new BroadcastChannel(MONUMENT_PROFILE_UPDATE_CHANNEL)
            channel.onmessage = (event) => {
                if (event.data?.type === MONUMENT_PROFILE_UPDATE_EVENT) {
                    refreshCurrentPage()
                }
            }
        }

        const intervalId = window.setInterval(refreshWhenVisible, MONUMENT_PROFILE_REFRESH_INTERVAL_MS)
        window.addEventListener('focus', refreshCurrentPage)
        window.addEventListener('storage', onStorage)
        document.addEventListener('visibilitychange', refreshWhenVisible)

        return () => {
            window.clearInterval(intervalId)
            window.removeEventListener('focus', refreshCurrentPage)
            window.removeEventListener('storage', onStorage)
            document.removeEventListener('visibilitychange', refreshWhenVisible)
            channel?.close()
        }
    }, [loadData, page])
    const handleKeywordChange = useCallback((event) => {
        setKeyword(event.target.value)
        setPage(1)
    }, [])

    const filteredItems = useMemo(() => {
        const query = keyword.trim()
        if (!query) return items

        return sortBySearchScore(
            items,
            query,
            (item) => [
                item.name,
                item.address,
                item.decisionNumber,
                item.content,
            ].filter(Boolean).join(' ')
        )
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
            notifyMonumentProfileUpdated()
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

    const confirmPublish = async () => {
        if (!publishItem) return

        await runAction('publish', publishItem)
        setPublishItem(null)
    }
    const confirmDelete = async () => {
        if (!deleteItem) return

        setDeleteLoading(true)
        try {
            const response = await monumentApi.deleteMonument({ id: deleteItem.id })
            toast.success(response?.message || 'Xóa hồ sơ di tích thành công')
            notifyMonumentProfileUpdated()
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

    const isWaitingOtherLevel = (item) => {
        if (Number(item.status) !== MonumentProfileConstants.statuses.pendingApproval || isOwnMonument(item)) {
            return false
        }

        const pendingLevel = Number(item.pendingLevel)
        const blockedByPermission = item.permission?.isView === false
        const blockedByRoleLevel = Boolean(currentApprovalLevel && pendingLevel && pendingLevel !== currentApprovalLevel)
        return blockedByPermission || blockedByRoleLevel
    }
    const isPrivateManagedListView = (isAllMode && view === 2) || mode === 'private'
    const isOwnerEditableDraftInPrivateList = (item) => (
        isPrivateManagedListView
        && isOwnMonument(item)
        && [
            MonumentProfileConstants.statuses.draft,
            MonumentProfileConstants.statuses.redo,
        ].includes(Number(item.status))
    )

    const isCurrentReviewerPendingItem = (item) => (
        Number(item.status) === MonumentProfileConstants.statuses.pendingApproval
        && currentApprovalLevel
        && Number(item.pendingLevel) === Number(currentApprovalLevel)
        && item.permission?.isView !== false
    )

    const isWorkflowItemInManagedListView = (item) => (
        ((isAllMode && (view === 0 || view === 2)) || mode === 'private')
        && [
            MonumentProfileConstants.statuses.draft,
            MonumentProfileConstants.statuses.pendingApproval,
        ].includes(Number(item.status))
        && !isOwnerEditableDraftInPrivateList(item)
        && !isCurrentReviewerPendingItem(item)
    )

    const isLockedItem = (item) => isWorkflowItemInManagedListView(item) || isLockedDraft(item) || isWaitingOtherLevel(item)
    const isMutedItem = (item) => isLockedItem(item)

    const getPendingReviewerName = (item) => {
        if (Number(item.status) === MonumentProfileConstants.statuses.draft) return 'Nhân viên'
        if (item.pendingLevelName) return item.pendingLevelName
        const pendingLevel = Number(item.pendingLevel)
        if (pendingLevel === 3) return 'Trưởng phòng'
        if (pendingLevel === 2) return 'Phó giám đốc'
        if (pendingLevel === 1) return 'Giám đốc'
        return '-'
    }
    const getLockedMessage = (item) => {
        if (Number(item.status) === MonumentProfileConstants.statuses.draft) return 'Bản nháp chưa gửi'
        return item.pendingLevelName ? `Đang chờ ${item.pendingLevelName}` : 'Chưa tới lượt duyệt'
    }

    const getLockedActionText = (item) => {
        if (Number(item.status) === MonumentProfileConstants.statuses.draft) return 'Chưa trình duyệt'
        return item.pendingLevelName ? `Chờ ${item.pendingLevelName}` : 'Chưa tới lượt'
    }

    const shouldHideTemporaryRows = ((isAllMode && (view === 0 || view === 2)) || mode === 'private') && selectedLevelFilter.hideTemporary === true
    const visibleItems = useMemo(() => (
        shouldHideTemporaryRows
            ? filteredItems.filter((item) => !isMutedItem(item))
            : filteredItems
    ), [currentApprovalLevel, currentUserId, filteredItems, isAllMode, mode, selectedLevelFilter.hideTemporary, shouldHideTemporaryRows, view])

    const displayItems = useMemo(() => (
        visibleItems.map((item) => isLockedItem(item) ? { ...item, isDisabled: true } : item)
    ), [currentApprovalLevel, currentUserId, isAllMode, mode, view, visibleItems])

    const totalItemsForTable = useMemo(() => {
        if (shouldHideTemporaryRows) return visibleItems.length
        return totalItemsDisplay
    }, [shouldHideTemporaryRows, totalItemsDisplay, visibleItems.length])
    const tableLoading = loading && items.length === 0

    const renderMonumentRowNumber = useCallback((item, rowIndex, rows) => {
        if (isMutedItem(item)) {
            return null
        }

        return rows.slice(0, rowIndex).filter((row) => !isMutedItem(row)).length + 1
    }, [currentApprovalLevel, currentUserId, isAllMode, mode, view])
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
                const muted = isMutedItem(item)

                return (
                    <div className={`flex min-w-[360px] gap-3 transition ${muted ? 'opacity-45 grayscale' : ''}`}>
                        <MonumentAvatar src={avatarUrl} name={item.name} />
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-[#434547]">{item.name}</p>
                                {muted && <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-xs font-medium text-[#8C8C8C]">{getLockedMessage(item)}</span>}
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
            render: (_, item) => <StatusBadge status={item.status} muted={isMutedItem(item)} />,
        },
        {
            key: 'actions',
            title: 'Thao tác',
            headerContentClassName: 'justify-center',
            cellClassName: 'text-center',
            render: (_, item) => {
                if (isLockedItem(item)) {
                    return (
                        <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#8C8C8C]" title={getLockedMessage(item)}>
                            <Eye size={16} className="text-[#BFBFBF]" />
                            <span>{getLockedActionText(item)}</span>
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

    const reviewActionColumn = {
        key: 'actions',
        title: 'Thao tác',
        headerContentClassName: 'justify-center',
        cellClassName: 'text-center',
        render: (_, item) => {
            if (isLockedItem(item)) {
                return (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#8C8C8C]" title={getLockedMessage(item)}>
                        <Eye size={16} className="text-[#BFBFBF]" />
                        <span>{getLockedActionText(item)}</span>
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
    }

    const reviewListColumns = [
        allColumns[0],
        allColumns[1],
        reviewActionColumn,
    ]

    const listColumns = mode === 'review' ? reviewListColumns : allColumns
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
            render: (_, item) => <StatusBadge status={item.status} muted={isMutedItem(item)} />,
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
                            <Button size="sm" onClick={() => setPublishItem(item)} disabled={actionLoading} className="!bg-[#08979C] hover:!bg-[#08737A]">
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
        if (isAllMode) {
            router.replace(`/monument-profile/all?tab=${nextView === 2 ? 'private' : 'public'}`, { scroll: false })
        }
        if (levelType === LEVEL_FILTER_CURRENT) {
            setLevelType(LEVEL_FILTER_ALL)
        }
        setFilterOpen(false)
        setPage(1)
    }

    const onChangeSort = (event) => {
        const value = event.target.value
        setSort(value === '' ? '' : Number(value))
        setPage(1)
    }

    const onChangeLevelType = (value) => {
        setLevelType(value)
        setFilterOpen(false)
        setPage(1)
    }

    const levelFilterOptions = useMemo(() => {
        if ((isAllMode && (view === 0 || view === 2)) || mode === 'review' || mode === 'private') return LEVEL_FILTERS
        return LEVEL_FILTERS.filter((filter) => !filter.publicOnly)
    }, [isAllMode, mode, view])
    if (isAllMode || mode === 'review' || mode === 'private') {
        return (
            <div className="p-6">
                <h1 className="text-lg font-medium text-[#1F1F1F]">{mode === 'private' ? title : 'Toàn bộ hồ sơ'}</h1>

                <div className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#ADC6FF] p-1">
                    {mode === 'review' ? (
                        <button
                            type="button"
                            className="w-[150px] rounded-lg bg-[rgba(240,245,255,1)] p-2 text-sm font-medium text-[rgba(89,126,247,1)] transition duration-150 ease-in-out"
                        >
                            Hồ sơ xét duyệt
                        </button>
                    ) : mode === 'private' ? (
                        <button
                            type="button"
                            className="w-[200px] rounded-lg bg-[rgba(240,245,255,1)] p-2 text-sm font-medium text-[rgba(89,126,247,1)] transition duration-150 ease-in-out"
                        >
                            Hồ sơ không công khai
                        </button>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>

                <div className="mt-3 grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm font-semibold text-[#393B3D]">Sắp xếp theo</label>
                        <div className="w-full">
                            <Select value={sort} options={SORT_OPTIONS} onChange={onChangeSort} placeholder="Chọn..." />
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm font-semibold text-[#393B3D]">Tìm kiếm</label>
                        <div className="relative w-full">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={handleKeywordChange}
                                placeholder="Nhập tên hoặc địa chỉ di tích..."
                                className="h-[40px] w-full rounded-md border border-[#d9d9d9] pl-9 pr-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[#597EF7]"
                            />
                        </div>
                    </div>

                    <div className="hidden xl:block" aria-hidden="true" />

                    <div className="flex min-w-0 flex-col gap-1 md:col-span-2 xl:col-span-1">
                        <label className="text-sm font-semibold text-[#393B3D]">Bộ lọc</label>
                        <LevelFilterDropdown
                            options={levelFilterOptions}
                            selectedValue={levelType}
                            selectedSteps={selectedLevelSteps}
                            open={filterOpen}
                            onToggle={() => setFilterOpen((current) => !current)}
                            onSelect={onChangeLevelType}
                            dropdownRef={filterDropdownRef}
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <Table
                        columns={listColumns}
                        data={displayItems}
                        currentPage={page}
                        itemsPerPage={PAGE_SIZE}
                        totalItems={totalItemsForTable}
                        onPageChange={(nextPage) => {
                            setPage(nextPage)
                            loadData(nextPage)
                        }}
                        emptyMessage="Không tìm thấy hồ sơ di tích nào"
                        loading={tableLoading}
                        showRowNumbers
                        rowNumberRender={renderMonumentRowNumber}
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
                <PublishConfirmModal
                    open={!!publishItem}
                    onClose={() => setPublishItem(null)}
                    onConfirm={confirmPublish}
                    loading={actionLoading}
                />            </div>
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
                        onChange={handleKeywordChange}
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
                    totalItems={totalItemsForTable}
                    onPageChange={(nextPage) => {
                        setPage(nextPage)
                        loadData(nextPage)
                    }}
                    emptyMessage="Không tìm thấy hồ sơ di tích nào"
                    loading={tableLoading}
                    showRowNumbers
                    rowNumberRender={renderMonumentRowNumber}
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
