'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, FileText, PenLine, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/common/Button'
import MonumentCreateModal from '@/components/monuments/MonumentCreateModal'
import { useToast } from '@/contexts/ToastContext'
import { MonumentFileConstants, MonumentProfileConstants, MonumentSectionConstants } from '@/constants/monumentConstants'
import { buildMediaUrl } from '@/lib/mediaUrl'
import { notifyMonumentProfileUpdated } from '@/lib/monumentRealtime'
import * as monumentApi from '@/lib/api/monumentsApi'

const LEVEL_NAMES = {
    [MonumentProfileConstants.levelObjects.specialNation]: 'Cấp quốc gia đặc biệt',
    [MonumentProfileConstants.levelObjects.nation]: 'Cấp quốc gia',
    [MonumentProfileConstants.levelObjects.city]: 'Cấp thành phố',
}

const FILE_GROUPS_PUBLIC = [
    { title: 'Hình đại diện', mode: MonumentFileConstants.modes.imageAvatar },
    { title: 'Hình ảnh hiện vật', mode: MonumentFileConstants.modes.imageObject },
    { title: 'Định dạng 3D', mode: MonumentFileConstants.modes.fileModel3D },
    { title: 'Hình ảnh chi tiết', mode: MonumentFileConstants.modes.imageDetail },
    { title: 'Video', mode: MonumentFileConstants.modes.fileVideo },
]

const FILE_GROUPS_PRIVATE = [
    { title: 'Hình đại diện', mode: MonumentFileConstants.modes.imageAvatar2 },
    { title: 'Kiến trúc', mode: MonumentFileConstants.modes.fileStructure },
    { title: 'Hình ảnh bản vẽ kỹ thuật', mode: MonumentFileConstants.modes.imageTech },
    { title: 'Bản đồ khoanh vùng', mode: MonumentFileConstants.modes.fileMap },
    { title: 'Định dạng 3D', mode: MonumentFileConstants.modes.fileModel3D },
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

function FieldValue({ label, value }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#434547]">{label}</label>
            <p className="text-sm font-normal text-[#2F54EB]">{value || '-'}</p>
        </div>
    )
}

function FileItem({ file }) {
    const href = buildMediaUrl(file.link || file.path)

    return (
        <a
            href={href || undefined}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#434547] hover:border-[#597EF7] hover:text-[#2F54EB]"
        >
            <FileText className="h-4 w-4 flex-shrink-0 text-[#597EF7]" />
            <span className="truncate">{file.fileName || file.name || 'Tệp đính kèm'}</span>
        </a>
    )
}

function FileGroup({ title, files }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#434547]">{title}</label>
            {files.length ? (
                <div className="flex flex-col gap-2">
                    {files.map((file, index) => <FileItem key={`${file.id || file.fileName}-${index}`} file={file} />)}
                </div>
            ) : (
                <p className="text-sm text-[#8C8C8C]">Chưa có dữ liệu</p>
            )}
        </div>
    )
}

function ReasonModal({ open, title, confirmText, confirmClassName, onClose, onConfirm, loading }) {
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
                    <Button onClick={() => onConfirm(reason)} loading={loading} className={`!rounded-lg ${confirmClassName}`}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    )
}
function SectionView({ section }) {
    const imageUrl = buildMediaUrl(section.fileLink)
    const hasImage = [
        MonumentSectionConstants.types.image,
        MonumentSectionConstants.types.imageContent,
        MonumentSectionConstants.types.contentImage,
    ].includes(Number(section.type))
    const hasContent = [
        MonumentSectionConstants.types.content,
        MonumentSectionConstants.types.imageContent,
        MonumentSectionConstants.types.contentImage,
    ].includes(Number(section.type))

    return (
        <div className="rounded-md border border-[#E5E7EB] p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {hasImage && imageUrl && <img src={imageUrl} alt={section.fileName || 'Section'} className="w-full rounded-md object-cover" />}
                {hasContent && <div className="text-sm leading-6 text-[#434547]" dangerouslySetInnerHTML={{ __html: section.content || '' }} />}
            </div>
        </div>
    )
}

export default function MonumentProfileView() {
    const params = useParams()
    const router = useRouter()
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [monument, setMonument] = useState(null)
    const [sections, setSections] = useState([])
    const [files, setFiles] = useState([])
    const [permission, setPermission] = useState({})
    const [editOpen, setEditOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [reasonAction, setReasonAction] = useState(null)

    const loadDetail = useCallback(async () => {
        if (!params?.id) return

        setLoading(true)
        try {
            const response = await monumentApi.getMonument({ id: params.id })
            const data = response?.data || {}
            if (!data.monument) {
                toast.error('Không tìm thấy hồ sơ di tích')
                router.replace('/monument-profile/all')
                return
            }

            setMonument(data.monument)
            setSections(data.monumentSections || [])
            setFiles(data.monumentFiles || [])
            setPermission(data.permission || {})
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không tải được hồ sơ di tích')
            router.replace('/monument-profile/all')
        } finally {
            setLoading(false)
        }
    }, [params?.id, router, toast])

    useEffect(() => {
        loadDetail()
    }, [loadDetail])

    const requestApproval = async () => {
        if (!monument?.id) return

        setActionLoading(true)
        try {
            const response = await monumentApi.requestApprovalMonument({ id: monument.id })
            const data = response?.data || {}
            toast.success(response?.message || 'Đã trình duyệt hồ sơ')
            notifyMonumentProfileUpdated()
            if (data.permission?.isView === false) {
                router.replace('/monument-profile/all')
                return
            }
            await loadDetail()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không trình duyệt được hồ sơ')
        } finally {
            setActionLoading(false)
        }
    }

    const runReasonAction = async (type, reason = '') => {
        if (!monument?.id) return
        if (!reason.trim()) {
            toast.warning('Vui lòng nhập nhận xét')
            return
        }

        setActionLoading(true)
        try {
            const response = type === 'redo'
                ? await monumentApi.redoMonument({ id: monument.id, reason: reason.trim() })
                : await monumentApi.notVerifyMonument({ id: monument.id, reason: reason.trim() })
            toast.success(response?.message || (type === 'redo' ? 'Yêu cầu trả về làm lại hồ sơ di tích thành công' : 'Không duyệt hồ sơ di tích thành công'))
            notifyMonumentProfileUpdated()
            setReasonAction(null)
            if ((response?.data || {}).permission?.isView === false) {
                router.replace('/monument-profile/all')
                return
            }
            await loadDetail()
        } catch (error) {
            toast.error(error?.response?.data?.message || (type === 'redo' ? 'Yêu cầu trả về làm lại hồ sơ di tích không thành công' : 'Không duyệt hồ sơ di tích không thành công'))
        } finally {
            setActionLoading(false)
        }
    }

    const confirmReasonAction = (reason) => {
        if (!reasonAction?.type) return
        runReasonAction(reasonAction.type, reason)
    }

    const fileGroups = useMemo(() => {
        const groups = Number(monument?.type) === MonumentProfileConstants.types.private ? FILE_GROUPS_PRIVATE : FILE_GROUPS_PUBLIC
        return groups.map((group) => ({
            ...group,
            files: files.filter((file) => Number(file.mode) === Number(group.mode)),
        }))
    }, [files, monument?.type])

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597EF7]" />
            </div>
        )
    }

    if (!monument) return null

    const isPrivate = Number(monument.type) === MonumentProfileConstants.types.private

    return (
        <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-[#1F1F1F]">Tải di tích lên</h1>
                    <StatusBadge status={monument.status} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {permission.isUpdate && (
                        <Button variant="outline" onClick={() => setEditOpen(true)} disabled={actionLoading} className="!rounded-lg !border-[#434343] !text-[#1F1F1F] hover:!bg-[#F5F5F5]">
                            <PenLine className="h-4 w-4" />
                            Chỉnh sửa
                        </Button>
                    )}
                    {permission.isRedo && (
                        <Button onClick={() => setReasonAction({ type: 'redo' })} disabled={actionLoading} className="!rounded-lg !bg-[#D46B08] hover:!bg-[#AD4E00]">
                            <RotateCcw className="h-4 w-4" />
                            Trả làm lại
                        </Button>
                    )}
                    {permission.isNotApprove && (
                        <Button onClick={() => setReasonAction({ type: 'refuse' })} disabled={actionLoading} className="!rounded-lg !bg-[#CF1322] hover:!bg-[#A8071A]">
                            <X className="h-4 w-4" />
                            Không duyệt
                        </Button>
                    )}
                    {permission.isRequestApproval && (
                        <Button onClick={requestApproval} loading={actionLoading} className="!rounded-lg !bg-[#2F54EB] hover:!bg-[#1D39C4]">
                            <ArrowRight className="h-4 w-4" />
                            Trình duyệt
                        </Button>
                    )}
                </div>
            </div>

            {monument.reason && (
                <div className="mt-6 rounded-lg bg-[rgba(255,241,240,1)] p-3 text-sm text-[#E62614]">
                    <p className="mb-2 font-semibold">Lý do:</p>
                    <div>{monument.reason}</div>
                </div>
            )}

            <div className="mt-6 inline-flex items-center gap-1 rounded-lg border border-[#ADC6FF] p-1">
                <button type="button" className="rounded-lg bg-[rgba(240,245,255,1)] px-3 py-2 text-sm font-medium text-[rgba(89,126,247,1)]">
                    {isPrivate ? 'Bí mật' : 'Công khai'}
                </button>
            </div>

            <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldValue label="Tên di tích *" value={monument.name} />
                    <FieldValue label="Quyết định công nhận *" value={monument.recognitionDecision} />
                </div>
                <div className="h-px bg-[#F0F0F0]" />
                <FieldValue label="Địa chỉ *" value={monument.address} />
                <div className="h-px bg-[#F0F0F0]" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldValue label="Năm xây dựng *" value={monument.yearOfConstruction} />
                    <FieldValue label="Vị trí *" value={monument.location} />
                </div>
                <div className="h-px bg-[#F0F0F0]" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldValue label="Xếp hạng *" value={LEVEL_NAMES[monument.rating]} />
                    <FieldValue label="Loại di tích *" value={LEVEL_NAMES[monument.typeOfMonument]} />
                </div>

                {isPrivate ? (
                    <>
                        <div className="h-px bg-[#F0F0F0]" />
                        <FieldValue label="Nội dung *" value={monument.description} />
                    </>
                ) : (
                    <>
                        <div className="h-px bg-[#F0F0F0]" />
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-semibold text-[#434547]">Nội dung *</label>
                            {sections.length ? sections.map((section, index) => <SectionView key={`${section.id || index}`} section={section} />) : <p className="text-sm text-[#8C8C8C]">Chưa có dữ liệu</p>}
                        </div>
                    </>
                )}

                <div className="h-px bg-[#F0F0F0]" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {fileGroups.map((group) => <FileGroup key={group.title} title={group.title} files={group.files} />)}
                </div>
            </div>

            <ReasonModal
                open={!!reasonAction}
                title={reasonAction?.type === 'redo' ? 'Xác nhận trả lại' : 'Không duyệt tài liệu'}
                confirmText={reasonAction?.type === 'redo' ? 'Xác nhận trả lại' : 'Xác nhận không duyệt'}
                confirmClassName={reasonAction?.type === 'redo' ? '!bg-[#D46B08] hover:!bg-[#AD4E00]' : '!bg-[#CF1322] hover:!bg-[#A8071A]'}
                onClose={() => setReasonAction(null)}
                onConfirm={confirmReasonAction}
                loading={actionLoading}
            />
            <MonumentCreateModal
                open={editOpen}
                itemId={monument.id}
                profileType={monument.type}
                onClose={() => setEditOpen(false)}
                onSaved={loadDetail}
            />
        </div>
    )
}