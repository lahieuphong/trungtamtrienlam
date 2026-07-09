'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Boxes, Download, FileText, Image as ImageIcon, Info, Video, X, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { buildMediaUrl } from '@/lib/mediaUrl'

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

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'jfif', 'tif', 'tiff', 'ico', 'avif', 'heic', 'heif', 'apng', 'arw', 'dng'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v', 'flv', 'wmv', 'mpeg', 'mpg'])
const MODEL_3D_EXTENSIONS = new Set(['glb', 'gltf', 'obj', 'fbx', 'stl'])

function getFilePath(file) {
    return file?.link || file?.Link || file?.path || file?.Path || file?.file || file?.File || file?.url || file?.Url || ''
}

function getFileName(file) {
    return file?.fileName || file?.FileName || file?.name || file?.Name || 'Tệp đính kèm'
}

function getFileExtension(file) {
    const extension = String(file?.extension || file?.Extension || '').replace(/^\./, '').toLowerCase()
    if (extension) return extension

    const fileName = String(getFileName(file))
    if (fileName.includes('.')) return fileName.split('.').pop().toLowerCase()

    const path = String(getFilePath(file)).split('?')[0].split('#')[0]
    return path.includes('.') ? path.split('.').pop().toLowerCase() : ''
}

function getFileTypeNumber(file) {
    const numericType = Number(file?.type ?? file?.Type)
    if (Number.isFinite(numericType)) return numericType

    const mimeType = String(file?.type || file?.Type || '').toLowerCase()
    if (mimeType.startsWith('image/')) return 0
    if (mimeType.startsWith('video/')) return 2
    return NaN
}

function getFileIcon(file) {
    const extension = getFileExtension(file)
    const fileType = getFileTypeNumber(file)

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

function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

function getUploaderDisplayName(file) {
    const value = getFileMetadataValue(
        file,
        'fullName',
        'FullName',
        'createdByName',
        'CreatedByName',
        'uploadedByName',
        'UploadedByName',
        'senderName',
        'SenderName',
        'userFullName',
        'UserFullName',
        'name',
        'Name'
    )

    return isUuidLike(value) ? '' : value
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
    const fileName = getFileName(file)
    const topics = getFileTopics(file)
    const fileType = getFileTypeNumber(file)
    const timeLabel = fileType === 2 ? 'Thời gian quay' : 'Thời gian chụp'
    const capturedAt = formatFileMetadataDate(getFileMetadataValue(file, 'capturedAt', 'takenAt', 'recordedAt', 'time', 'createdDate', 'createdAt', 'createdDate'))
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
        ['Người đăng', getUploaderDisplayName(file)],
    ]

    return (
        <div
            className="fixed z-[10020] origin-bottom-left animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 overflow-visible rounded-md bg-white px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.14)] duration-150"
            style={{ left: panelStyle.left, top: panelStyle.top, width: panelStyle.width, maxHeight: panelStyle.maxHeight }}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute -right-3 -top-3 z-[10030] flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1F1F1F] shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#EF4444] hover:text-white"
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
                        <div className="h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out" style={{ width: `${progress}%` }} />
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

export default function UniversalFilePreviewModal({ file, onClose, zIndexClassName = 'z-[10010]' }) {
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
        const fileType = getFileTypeNumber(file)
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

    const previewUrl = buildMediaUrl(getFilePath(file))
    const fileName = getFileName(file)
    const extension = getFileExtension(file)
    const fileType = getFileTypeNumber(file)
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
                            <ImageIcon className="h-9 w-9 text-[#1F1F1F]" />
                            <div className="w-56 max-w-[70%] overflow-hidden rounded-full bg-[#F0F0F0]">
                                <div className="h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out" style={{ width: `${imageLoadProgress}%` }} />
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
            return <iframe title={fileName} src={`${previewUrl}#toolbar=0&navpanes=0`} className="h-[58vh] w-full rounded-md border border-[#D9D9D9]" />
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
        <div className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center p-4`}>
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
                            {showInfo && <FileMetadataPanel file={file} onClose={() => setShowInfo(false)} anchorRef={infoButtonRef} />}
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