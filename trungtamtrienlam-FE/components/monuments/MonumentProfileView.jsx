'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
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

const GlbViewer = dynamic(() => import('@/components/monuments/GlbViewer'), {
    ssr: false,
    loading: () => (
        <div className="flex h-[58vh] min-h-[360px] flex-col items-center justify-center gap-3 rounded-md bg-[#F5F5F5] text-[#434343]">
            <Boxes className="h-11 w-11 text-[#8C8C8C]" />
            <div className="w-60 max-w-[72%] overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-2 w-1/2 animate-pulse rounded-full bg-[#2F54EB]" />
            </div>
            <p className="text-sm font-medium">Đang chuẩn bị mô hình 3D</p>
        </div>
    ),
})

const RICH_TEXT_CONTENT_CLASS_NAME = 'break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_*]:[word-break:break-word] [&_p]:my-0 [&_div]:my-0 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-base [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:text-sm [&_h5]:font-semibold [&_a]:cursor-pointer [&_a]:text-[#2F54EB] [&_a]:underline [&_a]:break-words [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1'

const LEVEL_NAMES = {
    [MonumentProfileConstants.levelObjects.specialNation]: 'Cấp quốc gia đặc biệt',
    [MonumentProfileConstants.levelObjects.nation]: 'Cấp quốc gia',
    [MonumentProfileConstants.levelObjects.city]: 'Cấp thành phố',
}

const FILE_GROUPS_PUBLIC = [
    { title: 'Quyết định công nhận', mode: MonumentFileConstants.modes.fileRecognitionDecision },
    { title: 'Xếp hạng', mode: MonumentFileConstants.modes.fileRating },
    { title: 'Hình đại diện', mode: MonumentFileConstants.modes.imageAvatar },
    { title: 'Hình ảnh hiện vật', mode: MonumentFileConstants.modes.imageObject },
    { title: 'Định dạng 3D', mode: MonumentFileConstants.modes.fileModel3D, className: 'md:col-span-2' },
    { title: 'Hình ảnh chi tiết', mode: MonumentFileConstants.modes.imageDetail },
    { title: 'Video', mode: MonumentFileConstants.modes.fileVideo },
]

const FILE_GROUPS_PRIVATE = [
    { title: 'Quyết định công nhận', mode: MonumentFileConstants.modes.fileRecognitionDecision },
    { title: 'Xếp hạng', mode: MonumentFileConstants.modes.fileRating },
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

function getFileMetadataValue(file, ...keys) {
    for (const key of keys) {
        const value = file?.[key]
        if (Array.isArray(value)) return value
        if (value !== undefined && value !== null && String(value).trim() !== '') return value
    }

    return ''
}

function formatFileMetadataDate(value) {
    if (!value) return ''

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    const pad = (number) => String(number).padStart(2, '0')
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getFileTopics(file) {
    const topics = getFileMetadataValue(file, 'topics', 'topicNames', 'topicName')
    if (Array.isArray(topics)) return topics.filter(Boolean)

    return String(topics || '')
        .split('|')
        .map((topic) => topic.trim())
        .filter(Boolean)
}

function FileMetadataRow({ label, children }) {
    return (
        <div className="grid min-h-9 grid-cols-[108px_minmax(0,1fr)] items-start gap-3 border-b border-[#F0F0F0] py-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
            <span className="text-[#434547]">{label}</span>
            <div className="min-w-0 font-semibold leading-5 text-[#1F1F1F]" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{children}</div>
        </div>
    )
}

function FileMetadataPanel({ file, onClose, anchorRef }) {
    const fileName = file?.fileName || file?.name || 'Tệp đính kèm'
    const topics = getFileTopics(file)
    const fileType = Number(file?.type)
    const timeLabel = fileType === 2 ? 'Thời gian quay' : 'Thời gian chụp'
    const capturedAt = formatFileMetadataDate(getFileMetadataValue(file, 'capturedAt', 'takenAt', 'recordedAt', 'time', 'createdDate', 'createdAt'))
    const [panelStyle, setPanelStyle] = useState({ left: 16, top: 16, width: 400, maxHeight: 420 })

    useEffect(() => {
        const updatePanelPosition = () => {
            const viewportWidth = window.innerWidth || 1024
            const viewportHeight = window.innerHeight || 768
            const width = Math.min(400, viewportWidth - 32)
            const anchorRect = anchorRef?.current?.getBoundingClientRect()

            if (!anchorRect) {
                const maxHeight = Math.min(520, viewportHeight - 32)
                setPanelStyle({
                    left: Math.max(16, (viewportWidth - width) / 2),
                    top: Math.max(16, (viewportHeight - maxHeight) / 2),
                    width,
                    maxHeight,
                })
                return
            }

            const availableAbove = Math.max(220, anchorRect.top - 24)
            const maxHeight = Math.min(520, availableAbove, viewportHeight - 32)
            const top = Math.max(16, anchorRect.top - maxHeight - 12)
            const left = Math.min(Math.max(16, anchorRect.left), viewportWidth - width - 16)

            setPanelStyle({ left, top, width, maxHeight })
        }

        updatePanelPosition()
        window.addEventListener('resize', updatePanelPosition)
        window.addEventListener('scroll', updatePanelPosition, true)

        return () => {
            window.removeEventListener('resize', updatePanelPosition)
            window.removeEventListener('scroll', updatePanelPosition, true)
        }
    }, [anchorRef])

    const rows = [
        ['Mã số tệp tin', getFileMetadataValue(file, 'code', 'fileCode', 'codeFile')],
        ['Mã cơ quan lưu trữ', getFileMetadataValue(file, 'organizationCode', 'archiveAgencyCode')],
        ['Số lưu trữ', getFileMetadataValue(file, 'storageNumber')],
        ['Ký hiệu thông tin', getFileMetadataValue(file, 'informationSympol', 'informationSymbol')],
        ['Tên sự kiện', getFileMetadataValue(file, 'eventName')],
        ['Lĩnh vực', getFileMetadataValue(file, 'fieldName')],
        ['Tiêu đề tập tin', getFileMetadataValue(file, 'title', 'fileTitle') || fileName],
        ['Tác giả', getFileMetadataValue(file, 'author')],
        ['Địa điểm', getFileMetadataValue(file, 'location')],
        [timeLabel, capturedAt],
        ['Ngôn ngữ', getFileMetadataValue(file, 'language')],
        ['Chế độ sử dụng', getFileMetadataValue(file, 'usageMode')],
        ['Chất lượng', getFileMetadataValue(file, 'quality')],
        ['Tình trạng vật lý', getFileMetadataValue(file, 'physicalStatus')],
        ['Từ khóa', getFileMetadataValue(file, 'hashTag', 'hashtag', 'keywords')],
        ['Ghi chú', getFileMetadataValue(file, 'note')],
        ['Người đăng', getFileMetadataValue(file, 'fullName', 'createdByName', 'createdBy', 'uploadedBy')],
    ]

    return (
        <div
            className="fixed z-[60] origin-bottom-left animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 overflow-visible rounded-md bg-white px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.14)] duration-150"
            style={{ left: panelStyle.left, top: panelStyle.top, width: panelStyle.width, maxHeight: panelStyle.maxHeight }}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute -right-3 -top-3 z-[70] flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#EF4444] hover:text-white"
                aria-label="Đóng thông tin file"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="overflow-y-auto pr-1" style={{ maxHeight: Math.max(188, panelStyle.maxHeight - 32) }}>
                {rows.slice(0, 6).map(([label, value]) => (
                    <FileMetadataRow key={label} label={label}>{value}</FileMetadataRow>
                ))}
                <FileMetadataRow label="Chủ đề">
                    {topics.length ? (
                        <div className="flex flex-wrap gap-1">
                            {topics.map((topic, index) => (
                                <span key={`${topic}-${index}`} className="rounded-full border border-[#D9D9D9] bg-[#F5F5F5] px-2 py-0.5 text-xs font-semibold text-[#1F1F1F]">
                                    {topic}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </FileMetadataRow>
                {rows.slice(6).map(([label, value]) => (
                    <FileMetadataRow key={label} label={label}>{value}</FileMetadataRow>
                ))}
            </div>
        </div>
    )
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

function VideoPreview({ src, fileName }) {
    const videoRef = useRef(null)
    const progressValueRef = useRef(1)
    const progressTargetRef = useRef(1)
    const revealTimerRef = useRef(null)
    const [progress, setProgress] = useState(1)
    const [isVideoReady, setIsVideoReady] = useState(false)
    const [hasVideoError, setHasVideoError] = useState(false)

    const updateProgressTarget = useCallback((target) => {
        progressTargetRef.current = Math.max(progressTargetRef.current, target)
    }, [])

    const revealVideo = useCallback(() => {
        updateProgressTarget(100)

        if (revealTimerRef.current) {
            window.clearInterval(revealTimerRef.current)
        }

        revealTimerRef.current = window.setInterval(() => {
            if (progressValueRef.current < 99.5) return

            progressValueRef.current = 100
            setProgress(100)
            setIsVideoReady(true)
            window.clearInterval(revealTimerRef.current)
            revealTimerRef.current = null
        }, 40)
    }, [updateProgressTarget])

    useEffect(() => {
        progressValueRef.current = 1
        progressTargetRef.current = 1
        setProgress(1)
        setIsVideoReady(false)
        setHasVideoError(false)

        const progressTimer = window.setInterval(() => {
            if (progressTargetRef.current < 92) {
                progressTargetRef.current = Math.min(92, progressTargetRef.current + 0.6)
            }

            const current = progressValueRef.current
            const target = progressTargetRef.current
            if (current >= target) return

            const distance = target - current
            const step = Math.max(target >= 100 ? 2.6 : 0.8, distance * (target >= 100 ? 0.22 : 0.08))
            const nextProgress = Math.min(target, current + step)

            progressValueRef.current = nextProgress
            setProgress(Math.max(1, Math.min(100, Math.round(nextProgress))))
        }, 90)

        return () => {
            window.clearInterval(progressTimer)
            if (revealTimerRef.current) {
                window.clearInterval(revealTimerRef.current)
                revealTimerRef.current = null
            }
        }
    }, [src])

    const handleVideoProgress = useCallback(() => {
        const video = videoRef.current
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0 || !video.buffered?.length) return

        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = Math.min(1, Math.max(0, bufferedEnd / video.duration))
        updateProgressTarget(Math.min(96, 8 + bufferedPercent * 88))
    }, [updateProgressTarget])

    return (
        <div className="relative overflow-hidden rounded-md bg-black">
            {!isVideoReady && !hasVideoError && (
                <div className="absolute inset-0 z-10 flex min-h-[360px] flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-[#434343]">
                    <Video className="h-11 w-11 text-[#8C8C8C]" />
                    <div className="w-60 max-w-[72%] overflow-hidden rounded-full bg-[#E5E7EB]">
                        <div
                            className="h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm font-medium">Đang tải video {progress}%</p>
                </div>
            )}

            {hasVideoError && (
                <div className="absolute inset-0 z-10 flex min-h-[360px] flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-center text-sm text-[#595959]">
                    <Video className="h-12 w-12 text-[#8C8C8C]" />
                    <p>Không thể tải video này.</p>
                </div>
            )}

            <video
                ref={videoRef}
                src={src}
                controls
                preload="auto"
                playsInline
                title={fileName}
                onLoadedMetadata={() => updateProgressTarget(42)}
                onLoadedData={() => updateProgressTarget(72)}
                onProgress={handleVideoProgress}
                onCanPlay={revealVideo}
                onError={() => {
                    setHasVideoError(true)
                    setProgress(100)
                }}
                className={`max-h-[58vh] w-full rounded-md bg-black transition-opacity duration-200 ${isVideoReady && !hasVideoError ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    )
}
function FilePreviewModal({ file, onClose }) {
    const [scale, setScale] = useState(1)
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
    const [isDraggingImage, setIsDraggingImage] = useState(false)
    const [imageLoadProgress, setImageLoadProgress] = useState(1)
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const infoButtonRef = useRef(null)
    const imageFrameRef = useRef(null)
    const imageRef = useRef(null)
    const imageDragRef = useRef(null)
    const imageLoadFinishTimerRef = useRef(null)
    const scaleRef = useRef(1)
    const imagePositionRef = useRef({ x: 0, y: 0 })

    const clampImagePosition = useCallback((position, scaleValue) => {
        const frame = imageFrameRef.current
        const image = imageRef.current

        if (!frame || !image || scaleValue <= 0) return { x: 0, y: 0 }

        const frameRect = frame.getBoundingClientRect()
        const imageWidth = image.offsetWidth || image.naturalWidth || 0
        const imageHeight = image.offsetHeight || image.naturalHeight || 0

        if (!frameRect.width || !frameRect.height || !imageWidth || !imageHeight) return { x: 0, y: 0 }

        const scaledImageWidth = imageWidth * scaleValue
        const scaledImageHeight = imageHeight * scaleValue
        const maxX = Math.abs(scaledImageWidth - frameRect.width) / 2
        const maxY = Math.abs(scaledImageHeight - frameRect.height) / 2

        return {
            x: Math.min(Math.max(position.x, -maxX), maxX),
            y: Math.min(Math.max(position.y, -maxY), maxY),
        }
    }, [])

    const zoomImage = useCallback((getNextScale, anchor) => {
        const currentScale = scaleRef.current
        const rawNextScale = typeof getNextScale === 'function' ? getNextScale(currentScale) : getNextScale
        const nextScale = Number(Math.min(Math.max(rawNextScale, 1), 5).toFixed(3))
        const factor = currentScale > 0 ? nextScale / currentScale : 1
        let nextPosition = imagePositionRef.current

        if (anchor && factor !== 1) {
            const frameRect = imageFrameRef.current?.getBoundingClientRect()

            if (frameRect) {
                const anchorX = anchor.clientX - frameRect.left - frameRect.width / 2
                const anchorY = anchor.clientY - frameRect.top - frameRect.height / 2

                nextPosition = {
                    x: imagePositionRef.current.x * factor + anchorX * (1 - factor),
                    y: imagePositionRef.current.y * factor + anchorY * (1 - factor),
                }
            }
        }

        const clampedPosition = clampImagePosition(nextPosition, nextScale)
        scaleRef.current = nextScale
        imagePositionRef.current = clampedPosition
        setScale(nextScale)
        setImagePosition(clampedPosition)
    }, [clampImagePosition])

    const handleImageWheel = useCallback((event) => {
        event.preventDefault()
        const wheelDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
        const zoomFactor = Math.exp(-wheelDelta * 0.0015)
        zoomImage((currentScale) => currentScale * zoomFactor, { clientX: event.clientX, clientY: event.clientY })
    }, [zoomImage])

    const handleImagePointerDown = useCallback((event) => {
        if (event.button !== 0) return

        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        imageDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startPosition: imagePositionRef.current,
        }
        setIsDraggingImage(true)
    }, [])

    const handleImagePointerMove = useCallback((event) => {
        const dragState = imageDragRef.current
        if (!dragState || dragState.pointerId !== event.pointerId) return

        event.preventDefault()
        const clampedPosition = clampImagePosition({
            x: dragState.startPosition.x + event.clientX - dragState.startX,
            y: dragState.startPosition.y + event.clientY - dragState.startY,
        }, scaleRef.current)
        imagePositionRef.current = clampedPosition
        setImagePosition(clampedPosition)
    }, [clampImagePosition])

    const stopImageDrag = useCallback((event) => {
        const dragState = imageDragRef.current
        if (!dragState || dragState.pointerId !== event.pointerId) return

        if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }

        imageDragRef.current = null
        setIsDraggingImage(false)
    }, [])

    useEffect(() => {
        if (imageLoadFinishTimerRef.current) {
            clearTimeout(imageLoadFinishTimerRef.current)
            imageLoadFinishTimerRef.current = null
        }

        if (file) {
            scaleRef.current = 1
            imagePositionRef.current = { x: 0, y: 0 }
            setScale(1)
            setImagePosition({ x: 0, y: 0 })
            setIsDraggingImage(false)
            setImageLoadProgress(1)
            setIsImageLoaded(false)
            imageDragRef.current = null
            setShowInfo(false)
        }
    }, [file])

    useEffect(() => {
        if (!file) return undefined

        const extension = getFileExtension(file)
        const fileType = Number(file?.type)
        const nextIsImage = fileType === 0 || IMAGE_EXTENSIONS.has(extension)

        if (!nextIsImage) {
            setImageLoadProgress(100)
            setIsImageLoaded(true)
            return undefined
        }

        setImageLoadProgress(1)
        setIsImageLoaded(false)

        const progressTimer = window.setInterval(() => {
            setImageLoadProgress((current) => {
                if (current >= 95) return current

                const step = Math.max(1, Math.round((95 - current) * 0.12))
                return Math.min(95, current + step)
            })
        }, 120)

        return () => window.clearInterval(progressTimer)
    }, [file])

    useEffect(() => {
        const handleResize = () => {
            const clampedPosition = clampImagePosition(imagePositionRef.current, scaleRef.current)
            imagePositionRef.current = clampedPosition
            setImagePosition(clampedPosition)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [clampImagePosition])

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
            const imageCursorClass = isDraggingImage ? 'cursor-grabbing' : 'cursor-grab'

            return (
                <div
                    ref={imageFrameRef}
                    className={`relative flex max-h-[58vh] min-h-[360px] select-none items-center justify-center overflow-hidden rounded-md bg-white ${imageCursorClass}`}
                    onWheel={handleImageWheel}
                    onPointerDown={handleImagePointerDown}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={stopImageDrag}
                    onPointerCancel={stopImageDrag}
                    onLostPointerCapture={stopImageDrag}
                    style={{ touchAction: 'none' }}
                >
                    {!isImageLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white text-[#434343]">
                            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#D9D9D9] border-t-[#2F54EB]" />
                            <div className="w-56 max-w-[70%] overflow-hidden rounded-full bg-[#F0F0F0]">
                                <div
                                    className="h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out"
                                    style={{ width: `${imageLoadProgress}%` }}
                                />
                            </div>
                            <p className="text-sm font-medium">Đang tải ảnh {imageLoadProgress}%</p>
                        </div>
                    )}
                    <img
                        ref={imageRef}
                        src={previewUrl}
                        alt={fileName}
                        draggable={false}
                        onLoad={() => {
                            const clampedPosition = clampImagePosition(imagePositionRef.current, scaleRef.current)
                            imagePositionRef.current = clampedPosition
                            setImagePosition(clampedPosition)
                            setImageLoadProgress(100)

                            if (imageLoadFinishTimerRef.current) {
                                clearTimeout(imageLoadFinishTimerRef.current)
                            }

                            imageLoadFinishTimerRef.current = window.setTimeout(() => {
                                setIsImageLoaded(true)
                                imageLoadFinishTimerRef.current = null
                            }, 180)
                        }}
                        onError={() => {
                            setImageLoadProgress(100)
                            setIsImageLoaded(true)
                        }}
                        onDragStart={(event) => event.preventDefault()}
                        className={`max-h-[58vh] max-w-full select-none object-contain transition-opacity duration-200 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            transform: `translate3d(${imagePosition.x}px, ${imagePosition.y}px, 0) scale(${scale})`,
                            transition: isDraggingImage ? 'opacity 200ms ease-out' : 'opacity 200ms ease-out, transform 120ms ease-out',
                            willChange: 'transform, opacity',
                        }}
                    />
                </div>
            )
        }

        if (isModel3D && ['glb', 'gltf'].includes(extension)) {
            return <GlbViewer src={previewUrl} fileName={fileName} />
        }

        if (isVideo) {
            return <VideoPreview src={previewUrl} fileName={fileName} />
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
                                ref={infoButtonRef}
                                type="button"
                                onClick={() => setShowInfo((current) => !current)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D9D9] text-[#1F1F1F] hover:bg-[#F5F5F5]"
                                aria-label="Thông tin file"
                            >
                                <Info className="h-4 w-4" />
                            </button>
                            {!isModel3D && (
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={!previewUrl}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D9D9] text-[#1F1F1F] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Tải xuống"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                            )}
                            {isImage && (
                                <div className="flex h-8 items-center gap-2 rounded-full border border-[#D9D9D9] px-2 text-[#1F1F1F]">
                                    <button type="button" onClick={() => zoomImage((current) => current - 0.2)} aria-label="Thu nhỏ">
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <p className="min-w-10 text-center text-sm text-[#434343]">{Math.round(scale * 100)}%</p>
                                    <button type="button" onClick={() => zoomImage((current) => current + 0.2)} aria-label="Phóng to">
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            {showInfo && (
                                <FileMetadataPanel file={file} onClose={() => setShowInfo(false)} anchorRef={infoButtonRef} />
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
function SectionImage({ section, imageUrl }) {
    if (!imageUrl) return null

    return (
        <img
            src={imageUrl}
            alt={section.fileName || 'Section'}
            className="h-full min-h-[220px] w-full rounded-md object-cover"
        />
    )
}

function SectionContent({ content }) {
    if (!content) return null

    return (
        <div
            className={`max-w-none rounded-md bg-white text-sm leading-6 text-[#1F2937] ${RICH_TEXT_CONTENT_CLASS_NAME}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    )
}

function SectionView({ section }) {
    const type = Number(section.type)
    const imageUrl = buildMediaUrl(section.fileLink)
    const image = <SectionImage section={section} imageUrl={imageUrl} />
    const content = <SectionContent content={section.content || ''} />

    if (type === MonumentSectionConstants.types.image) {
        return (
            <div className="rounded-md border border-[#E5E7EB] p-3">
                {image || <p className="text-sm text-[#8C8C8C]">Chưa có hình ảnh</p>}
            </div>
        )
    }

    if (type === MonumentSectionConstants.types.content) {
        return (
            <div className="rounded-md border border-[#E5E7EB] p-3">
                {content || <p className="text-sm text-[#8C8C8C]">Chưa có nội dung</p>}
            </div>
        )
    }

    const slots = type === MonumentSectionConstants.types.contentImage
        ? [content, image]
        : [image, content]

    return (
        <div className="rounded-md border border-[#E5E7EB] p-3">
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
                {slots.map((slot, index) => (
                    <div key={index} className="min-h-[220px]">
                        {slot || <p className="text-sm text-[#8C8C8C]">Chưa có dữ liệu</p>}
                    </div>
                ))}
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
