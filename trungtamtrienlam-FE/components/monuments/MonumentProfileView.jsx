'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Boxes, Check, Download, FileText, Image as ImageIcon, Info, PenLine, RotateCcw, Video, X, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/common/Button'
import MonumentCreateModal from '@/components/monuments/MonumentCreateModal'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
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
    { title: 'Định dạng 3D', mode: MonumentFileConstants.modes.fileModel3D, className: 'md:col-span-2' },
    { title: 'Hình ảnh chi tiết', mode: MonumentFileConstants.modes.imageDetail },
    { title: 'Video', mode: MonumentFileConstants.modes.fileVideo },
]

const FILE_GROUPS_PRIVATE = [
    { title: 'Hình đại diện', mode: MonumentFileConstants.modes.imageAvatar2 },
    { title: 'Kiến trúc', mode: MonumentFileConstants.modes.fileStructure },
    { title: 'Định dạng 3D', mode: MonumentFileConstants.modes.fileModel3D, className: 'md:col-span-2' },
    { title: 'Hình ảnh bản vẽ kỹ thuật', mode: MonumentFileConstants.modes.imageTech },
    { title: 'Bản đồ khoanh vùng', mode: MonumentFileConstants.modes.fileMap },
]

function normalizeRoleText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u0111\u0110]/g, 'd')
        .toLowerCase()
}

function isAdminAccount(user) {
    if (!user) return false

    const roleText = normalizeRoleText([
        user.position,
        user.roleName,
        user.role,
        user.title,
        user.userType,
        user.accountType,
    ].filter(Boolean).join(' '))

    return Boolean(
        user.isAdmin
        || user.is_admin
        || user.isSuperuser
        || user.is_superuser
        || user.isStaffAdmin
        || user.role?.isAdmin
        || user.role?.is_admin
        || roleText.includes('admin')
        || roleText.includes('quan tri')
    )
}
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

function RequiredLabel({ label }) {
    const labelText = String(label || '')
    const isRequired = labelText.trim().endsWith('*')
    const displayLabel = isRequired ? labelText.replace(/\s*\*$/, '') : labelText

    return (
        <>
            {displayLabel}
            {isRequired && <span className="ml-1 text-[#F5222D]">*</span>}
        </>
    )
}

function FieldValue({ label, value }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#434547]"><RequiredLabel label={label} /></label>
            <p className="text-sm font-normal text-[#2F54EB]">{value || '-'}</p>
        </div>
    )
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'webm', 'mkv'])
const MODEL_3D_EXTENSIONS = new Set(['glb', 'gltf', 'obj', 'fbx', 'stl'])

function getFileExtension(file) {
    const extension = String(file?.extension || '').replace(/^\./, '').toLowerCase()
    if (extension) return extension

    const fileName = String(file?.fileName || file?.name || '')
    return fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
}

function getFileIcon(file) {
    const extension = getFileExtension(file)
    const fileType = Number(file?.type)

    if (fileType === 4 || MODEL_3D_EXTENSIONS.has(extension)) return Boxes
    if (fileType === 2 || VIDEO_EXTENSIONS.has(extension)) return Video
    if (fileType === 0 || IMAGE_EXTENSIONS.has(extension)) return ImageIcon
    return FileText
}

function formatFileSize(size) {
    const numericSize = Number(size)
    if (!Number.isFinite(numericSize) || numericSize <= 0) return ''

    const units = ['KB', 'MB', 'GB', 'TB']
    let value = numericSize < 1024 ? numericSize : numericSize / 1024
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2
    const displayValue = value.toFixed(precision).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
    return `${displayValue}${units[unitIndex]}`
}

function FileItem({ file, onPreview }) {
    const Icon = getFileIcon(file)
    const fileName = file.fileName || file.name || 'Tệp đính kèm'
    const fileSize = formatFileSize(file.size)

    return (
        <button
            type="button"
            onClick={() => onPreview?.(file)}
            className="inline-flex w-full cursor-pointer justify-between gap-2 rounded-md border border-[#D9D9D9] bg-white p-2 text-left text-sm transition-colors hover:bg-[#E6E6E6]"
        >
            <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-[30px] w-[30px] flex-shrink-0 text-[#1F1F1F]" />
                <div className="min-w-0">
                    <p className="w-full break-words text-sm text-[#1F1F1F]">{fileName}</p>
                    {fileSize && (
                        <div className="mt-1 flex items-center gap-2">
                            <p className="break-words text-sm text-[#8C8C8C]">{fileSize}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1" />
        </button>
    )
}

function FileGroup({ title, files, onPreview, className = '' }) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label className="text-sm font-semibold text-[#434547]">{title}</label>
            {files.length ? (
                <div className="flex flex-col gap-2">
                    {files.map((file, index) => <FileItem key={`${file.id || file.fileName}-${index}`} file={file} onPreview={onPreview} />)}
                </div>
            ) : (
                <p className="text-sm text-[#8C8C8C]">Chưa có dữ liệu</p>
            )}
        </div>
    )
}

function FilePreviewModal({ file, onClose }) {
    const [scale, setScale] = useState(1)
    const [showInfo, setShowInfo] = useState(false)

    useEffect(() => {
        if (file) {
            setScale(1)
            setShowInfo(false)
        }
    }, [file])

    if (!file) return null

    const previewUrl = buildMediaUrl(file.link || file.path || file.file || file.File)
    const fileName = file.fileName || file.name || 'Tệp đính kèm'
    const fileSize = formatFileSize(file.size)
    const extension = getFileExtension(file)
    const fileType = Number(file?.type)
    const isImage = fileType === 0 || IMAGE_EXTENSIONS.has(extension)
    const isVideo = fileType === 2 || VIDEO_EXTENSIONS.has(extension)
    const isModel3D = fileType === 4 || MODEL_3D_EXTENSIONS.has(extension)
    const isPdf = extension === 'pdf'
    const Icon = getFileIcon(file)

    const handleDownload = () => {
        if (!previewUrl) return

        const link = document.createElement('a')
        link.href = previewUrl
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    const renderPreview = () => {
        if (!previewUrl) {
            return (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-md bg-[#F5F5F5] text-center text-sm text-[#595959]">
                    <Icon className="h-12 w-12 text-[#8C8C8C]" />
                    <p>Không tìm thấy đường dẫn tệp tin</p>
                </div>
            )
        }

        if (isImage) {
            return (
                <div className="flex max-h-[58vh] min-h-[360px] select-none items-center justify-center overflow-hidden rounded-md bg-white">
                    <img
                        src={previewUrl}
                        alt={fileName}
                        className="max-h-[58vh] max-w-full select-none object-contain transition-transform"
                        style={{ transform: `scale(${scale})` }}
                    />
                </div>
            )
        }

        if (isVideo) {
            return (
                <div className="rounded-md bg-[#F5F5F5] p-2">
                    <video src={previewUrl} controls className="max-h-[58vh] w-full rounded-md bg-black" />
                </div>
            )
        }

        if (isPdf) {
            return (
                <iframe
                    title={fileName}
                    src={`${previewUrl}#toolbar=0&navpanes=0`}
                    className="h-[58vh] w-full rounded-md border border-[#D9D9D9]"
                />
            )
        }

        return (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-md bg-[#F5F5F5] text-center text-sm text-[#595959]">
                <Icon className="h-12 w-12 text-[#8C8C8C]" />
                <p>{isModel3D ? 'Tệp 3D chưa hỗ trợ xem trực tiếp tại đây' : 'Tệp này chưa hỗ trợ xem trực tiếp tại đây'}</p>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="rounded-md bg-[#597EF7] px-3 py-2 text-sm font-medium text-white hover:bg-[#2F54EB]">
                    Mở tệp
                </a>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45" onClick={onClose} />
            <div className="relative w-full max-w-[768px] rounded-md bg-white p-4 shadow-xl">
                {renderPreview()}
                <div className="mt-4">
                    <p className="break-words text-sm text-[#1F1F1F]">{fileName}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="relative flex flex-1 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowInfo((current) => !current)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D9D9] text-[#1F1F1F] hover:bg-[#F5F5F5]"
                                aria-label="Thông tin file"
                            >
                                <Info className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={!previewUrl}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D9D9] text-[#1F1F1F] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Tải xuống"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            {isImage && (
                                <div className="flex h-8 items-center gap-2 rounded-full border border-[#D9D9D9] px-2 text-[#1F1F1F]">
                                    <button type="button" onClick={() => setScale((current) => Math.max(current - 0.2, 1))} aria-label="Thu nhỏ">
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <p className="min-w-10 text-center text-sm text-[#434343]">{Math.round(scale * 100)}%</p>
                                    <button type="button" onClick={() => setScale((current) => Math.min(current + 0.2, 5))} aria-label="Phóng to">
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            {showInfo && (
                                <div className="absolute bottom-11 left-0 z-10 max-h-[45vh] w-[320px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-md border border-[#D9D9D9] bg-white p-3 shadow-lg sm:w-[360px]">
                                    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 text-sm">
                                        <span className="text-[#595959]">Tên file</span>
                                        <span className="min-w-0 break-all font-semibold text-[#1F1F1F]">{fileName}</span>
                                        <span className="text-[#595959]">Dung lượng</span>
                                        <span className="min-w-0 font-semibold text-[#1F1F1F]">{fileSize || '-'}</span>
                                        <span className="text-[#595959]">Định dạng</span>
                                        <span className="min-w-0 break-all font-semibold uppercase text-[#1F1F1F]">{extension || '-'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button variant="danger" onClick={onClose} className="!rounded-lg !bg-[#EF4444] hover:!bg-[#DC2626]">
                            <X className="h-4 w-4" />
                            Đóng
                        </Button>
                    </div>
                </div>
            </div>
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

function ApprovalConfirmModal({ open, onClose, onConfirm, loading }) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45" onClick={loading ? undefined : onClose} />
            <div className="relative w-full max-w-[448px] overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="border-b border-[#F0F0F0] px-6 py-5">
                    <h2 className="text-xl font-semibold text-[#1F1F1F]">Duyệt tài liệu</h2>
                </div>
                <div className="px-6 py-8">
                    <p className="text-sm leading-6 text-[#1F1F1F]">
                        Khi duyệt, nếu thông tin hồ sơ là không công khai thì dữ liệu tệp tin sẽ được lưu vào kho lưu trữ, bạn có chắc chắn sẽ duyệt vào hiển thị nội dung
                    </p>
                </div>
                <div className="flex items-center justify-end gap-3 bg-[#FAFAFA] px-6 py-4">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="!rounded-lg !border-[#D9D9D9] !text-[#434343] hover:!bg-[#F5F5F5]">
                        <X className="h-4 w-4" />
                        Hủy
                    </Button>
                    <Button onClick={onConfirm} loading={loading} className="!rounded-lg !bg-[#597EF7] hover:!bg-[#2F54EB]">
                        <Check className="h-4 w-4" />
                        Xác nhận duyệt
                    </Button>
                </div>
            </div>
        </div>
    )
}

function PublishConfirmModal({ open, onClose, onConfirm, loading }) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45" onClick={loading ? undefined : onClose} />
            <div className="relative w-full max-w-[448px] overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="border-b border-[#F0F0F0] px-6 py-5">
                    <h2 className="text-xl font-semibold text-[#1F1F1F]">Đẩy lên website</h2>
                </div>
                <div className="px-6 py-8">
                    <p className="text-sm leading-6 text-[#1F1F1F]">
                        Khi đẩy lên website, thông tin công khai sẽ được hiển thị cho người dùng thấy, bạn có chắc chắn muốn đẩy lên website
                    </p>
                </div>
                <div className="flex items-center justify-end gap-3 bg-[#FAFAFA] px-6 py-4">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="!rounded-lg !border-[#D9D9D9] !text-[#434343] hover:!bg-[#F5F5F5]">
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
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [monument, setMonument] = useState(null)
    const [sections, setSections] = useState([])
    const [files, setFiles] = useState([])
    const [permission, setPermission] = useState({})
    const [editOpen, setEditOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [reasonAction, setReasonAction] = useState(null)
    const [approvalOpen, setApprovalOpen] = useState(false)
    const [requestApprovalOpen, setRequestApprovalOpen] = useState(false)
    const [publishOpen, setPublishOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState(null)
    const currentUserId = useMemo(() => user?.id || user?.userID || user?.userId || user?.ID || null, [user])
    const isAdmin = useMemo(() => isAdminAccount(user), [user])
    const getMonumentListPath = useCallback((nextMonument = monument) => (
        Number(nextMonument?.type) === MonumentProfileConstants.types.private
            ? '/monument-profile/all?tab=private'
            : '/monument-profile/all'
    ), [monument])

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
            if (error?.response?.status !== 403) {
                toast.error(error?.response?.data?.message || 'Không tải được hồ sơ di tích')
            }
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
            setRequestApprovalOpen(false)
            if (data.permission?.isView === false) {
                router.replace(getMonumentListPath(data.monument || monument))
                return
            }
            await loadDetail()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không trình duyệt được hồ sơ')
        } finally {
            setActionLoading(false)
        }
    }

    const shouldConfirmAdminRequest = () => {
        const status = Number(monument?.status)
        const isOwner = currentUserId && String(monument?.userID) === String(currentUserId)
        return Boolean(
            isAdmin
            && isOwner
            && [
                MonumentProfileConstants.statuses.draft,
                MonumentProfileConstants.statuses.redo,
                MonumentProfileConstants.statuses.notApproved,
            ].includes(status)
        )
    }

    const handleRequestApprovalClick = () => {
        if (shouldConfirmAdminRequest()) {
            setRequestApprovalOpen(true)
            return
        }
        requestApproval()
    }
    const verifyApproval = async () => {
        if (!monument?.id) return

        setActionLoading(true)
        try {
            const response = await monumentApi.verifyMonument({ id: monument.id })
            const data = response?.data || {}
            toast.success(response?.message || 'Duyệt hồ sơ di tích thành công')
            notifyMonumentProfileUpdated()
            setApprovalOpen(false)
            if (data.permission?.isView === false) {
                router.replace(getMonumentListPath(data.monument || monument))
                return
            }
            await loadDetail()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Duyệt hồ sơ di tích không thành công')
        } finally {
            setActionLoading(false)
        }
    }

    const publishProfile = async () => {
        if (!monument?.id) return

        setActionLoading(true)
        try {
            const response = await monumentApi.publishMonument({ id: monument.id })
            const data = response?.data || {}
            toast.success(response?.message || 'Đẩy hồ sơ lên website thành công')
            setPublishOpen(false)
            if (data.monument) {
                setMonument(data.monument)
                setSections(data.monumentSections || [])
                setFiles(data.monumentFiles || [])
                setPermission(data.permission || {})
            } else {
                setMonument((current) => current ? { ...current, status: MonumentProfileConstants.statuses.published } : current)
                setPermission({})
            }
            notifyMonumentProfileUpdated()
            if (data.permission?.isView === false) {
                router.replace(getMonumentListPath(data.monument || monument))
                return
            }
            await loadDetail()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Đẩy hồ sơ lên website không thành công')
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
            const data = response?.data || {}
            if (data.permission?.isView === false) {
                router.replace(getMonumentListPath(data.monument || monument))
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

    const monumentStatus = Number(monument.status)
    const isPrivate = Number(monument.type) === MonumentProfileConstants.types.private
    const isPendingApproval = monumentStatus === MonumentProfileConstants.statuses.pendingApproval
    const isApproved = monumentStatus === MonumentProfileConstants.statuses.approved
    const isAdminOwnerFlow = Boolean(isAdmin && currentUserId && String(monument.userID) === String(currentUserId))
    const canShowReviewActions = (isPendingApproval || isApproved) && !isAdminOwnerFlow
    const isFinalized = [
        MonumentProfileConstants.statuses.approved,
        MonumentProfileConstants.statuses.published,
    ].includes(monumentStatus)
    const isAdminPrivatePublishBlocked = isAdmin && isPrivate && isApproved

    return (
        <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-[#1F1F1F]">Tải di tích lên</h1>
                    <StatusBadge status={monument.status} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {permission.isUpdate && !isFinalized && (
                        <Button variant="outline" onClick={() => setEditOpen(true)} disabled={actionLoading} className="!rounded-lg !border-[#434343] !text-[#1F1F1F] hover:!bg-[#F5F5F5]">
                            <PenLine className="h-4 w-4" />
                            Chỉnh sửa
                        </Button>
                    )}
                    {permission.isRedo && canShowReviewActions && (
                        <Button onClick={() => setReasonAction({ type: 'redo' })} disabled={actionLoading} className="!rounded-lg !bg-[#D46B08] hover:!bg-[#AD4E00]">
                            <RotateCcw className="h-4 w-4" />
                            Trả làm lại
                        </Button>
                    )}
                    {permission.isNotApprove && canShowReviewActions && (
                        <Button onClick={() => setReasonAction({ type: 'refuse' })} disabled={actionLoading} className="!rounded-lg !bg-[#CF1322] hover:!bg-[#A8071A]">
                            <X className="h-4 w-4" />
                            Không duyệt
                        </Button>
                    )}
                    {permission.isRequestApproval && !permission.isApprove && (
                        <Button onClick={handleRequestApprovalClick} loading={actionLoading} className="!rounded-lg !bg-[#2F54EB] hover:!bg-[#1D39C4]">
                            <ArrowRight className="h-4 w-4" />
                            Trình duyệt
                        </Button>
                    )}
                    {permission.isApprove && isPendingApproval && (
                        <Button onClick={() => setApprovalOpen(true)} disabled={actionLoading} className="!rounded-lg !bg-[#2F54EB] hover:!bg-[#1D39C4]">
                            <Check className="h-4 w-4" />
                            Duyệt
                        </Button>
                    )}
                    {permission.isPublic && isApproved && (
                        <span className={isAdminPrivatePublishBlocked ? 'inline-flex cursor-not-allowed' : 'inline-flex'}>
                            <Button
                                onClick={isAdminPrivatePublishBlocked ? undefined : () => setPublishOpen(true)}
                                disabled={actionLoading || isAdminPrivatePublishBlocked}
                                className={`!rounded-lg ${isAdminPrivatePublishBlocked ? '!bg-[#BFBFBF] !text-white hover:!bg-[#BFBFBF] !cursor-not-allowed' : '!bg-[#2F54EB] hover:!bg-[#1D39C4]'}`}
                            >
                                <span className="inline-flex items-center -space-x-2.5" aria-hidden="true">
                                    <Check className="h-4 w-4" />
                                    <Check className="h-4 w-4" />
                                </span>
                                Đẩy lên website
                            </Button>
                        </span>
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
                            <label className="text-sm font-semibold text-[#434547]"><RequiredLabel label="Nội dung *" /></label>
                            {sections.length ? sections.map((section, index) => <SectionView key={`${section.id || index}`} section={section} />) : <p className="text-sm text-[#8C8C8C]">Chưa có dữ liệu</p>}
                        </div>
                    </>
                )}

                <div className="h-px bg-[#F0F0F0]" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {fileGroups.map((group) => <FileGroup key={group.title} title={group.title} files={group.files} onPreview={setPreviewFile} className={group.className} />)}
                </div>
            </div>

            <ApprovalConfirmModal
                open={requestApprovalOpen}
                onClose={() => setRequestApprovalOpen(false)}
                onConfirm={requestApproval}
                loading={actionLoading}
            />
            <ApprovalConfirmModal
                open={approvalOpen}
                onClose={() => setApprovalOpen(false)}
                onConfirm={verifyApproval}
                loading={actionLoading}
            />
            <PublishConfirmModal
                open={publishOpen}
                onClose={() => setPublishOpen(false)}
                onConfirm={publishProfile}
                loading={actionLoading}
            />
            <ReasonModal
                open={!!reasonAction}
                title={reasonAction?.type === 'redo' ? 'Xác nhận trả lại' : 'Không duyệt tài liệu'}
                confirmText={reasonAction?.type === 'redo' ? 'Xác nhận trả lại' : 'Xác nhận không duyệt'}
                confirmClassName={reasonAction?.type === 'redo' ? '!bg-[#D46B08] hover:!bg-[#AD4E00]' : '!bg-[#CF1322] hover:!bg-[#A8071A]'}
                onClose={() => setReasonAction(null)}
                onConfirm={confirmReasonAction}
                loading={actionLoading}
            />
            <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
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