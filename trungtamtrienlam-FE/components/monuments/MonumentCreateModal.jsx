'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlignCenter, AlignLeft, AlignRight, Bold, Boxes, Check, ChevronDown, Crop, FileText, Image as ImageIcon, Italic, Link2, List, ListOrdered, MoreHorizontal, Pencil, Plus, Redo2, RotateCcw, Save, Trash2, Type, Underline, Undo2, Upload, Video, X, ZoomIn, ZoomOut } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/contexts/ToastContext'
import { MonumentFileConstants, MonumentProfileConstants, MonumentSectionConstants } from '@/constants/monumentConstants'
import { buildMediaUrl } from '@/lib/mediaUrl'
import { notifyMonumentProfileUpdated } from '@/lib/monumentRealtime'
import * as monumentApi from '@/lib/api/monumentsApi'

const ACCEPTS = {
    all: '*/*',
    image: '.png,.jpg,.jpeg,.bmp,.gif,.webp,.svg,.arw,.dng,image/*',
    video: '.mp4,.m4a,.avi,.mkv,.mov,.wmv,.flv,.webm,video/*',
    document: '.doc,.docx,.pdf,.xls,.xlsx',
    model3d: '.stl,.obj,.fbx,.gltf,.glb',
}

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

const MODEL_3D_EXTENSIONS = ['.stl', '.obj', '.fbx', '.gltf', '.glb']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.svg', '.arw', '.dng']
const VIDEO_EXTENSIONS = ['.mp4', '.m4a', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm']

const createInitialForm = () => ({
    name: '',
    recognitionDecision: '',
    address: '',
    yearOfConstruction: '',
    location: '',
    rating: '',
    typeOfMonument: 0,
    priorityMode: 0,
    description: '',
    sections: [],
    fileRecognitionDecisions: [],
    fileRatings: [],
    fileAvatars: [],
    fileImageObjects: [],
    fileImageDetails: [],
    fileVideos: [],
    fileModel3Ds: [],
    fileAvatar2s: [],
    fileStructures: [],
    fileImageTechs: [],
    fileMaps: [],
    deletedFileIds: [],
    deletedSectionFileIds: [],
})

function getExtension(fileName = '') {
    const index = fileName.lastIndexOf('.')
    return index >= 0 ? fileName.slice(index).toLowerCase() : ''
}

function isNativeFile(file) {
    return typeof File !== 'undefined' && file instanceof File
}

function getUploadFileName(file) {
    return file?.fileName || file?.name || 'File'
}

function formatUploadFileSize(size) {
    const numericSize = Number(size)
    if (!Number.isFinite(numericSize) || numericSize <= 0) return ''

    const units = ['KB', 'MB', 'GB', 'TB']
    let value = numericSize < 1024 ? numericSize : numericSize / 1024
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    const displayValue = value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
    return `${displayValue}${units[unitIndex]}`
}

function getUploadFileIcon(file) {
    const fileName = getUploadFileName(file)
    const extension = getExtension(fileName)
    const type = file?.type || ''

    if (MODEL_3D_EXTENSIONS.includes(extension)) return Boxes
    if (type.startsWith('video/') || VIDEO_EXTENSIONS.includes(extension)) return Video
    if (type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension)) return ImageIcon
    return FileText
}

function isUploadImagePreviewable(file) {
    const fileName = getUploadFileName(file)
    const extension = getExtension(fileName)
    const type = file?.type || ''
    return type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension)
}

function isUploadVideoPreviewable(file) {
    const fileName = getUploadFileName(file)
    const extension = getExtension(fileName)
    const type = file?.type || ''
    return type.startsWith('video/') || VIDEO_EXTENSIONS.includes(extension)
}

function isUploadModelPreviewable(file) {
    const fileName = getUploadFileName(file)
    const extension = getExtension(fileName)
    return ['.glb', '.gltf'].includes(extension)
}

function getUploadPreviewType(file) {
    if (isUploadImagePreviewable(file)) return 'image'
    if (isUploadVideoPreviewable(file)) return 'video'
    if (isUploadModelPreviewable(file)) return 'model3d'
    return 'file'
}

function isUploadPreviewable(file) {
    return getUploadPreviewType(file) !== 'file'
}

function toExistingFile(file) {
    return {
        id: file.id,
        name: file.fileName || file.name || 'Tệp đã tải lên',
        fileName: file.fileName || file.name || 'Tệp đã tải lên',
        size: file.size,
        path: buildMediaUrl(file.link || file.path),
        isExisting: true,
    }
}

function toExistingSection(section) {
    return {
        id: section.id || uuidv4(),
        type: Number(section.type ?? MonumentSectionConstants.types.image),
        content: section.content || '',
        file: section.fileLink ? {
            id: section.id,
            name: section.fileName || 'Hình ảnh section',
            fileName: section.fileName || 'Hình ảnh section',
            size: section.fileSize,
            path: buildMediaUrl(section.fileLink),
            isExisting: true,
        } : null,
    }
}

function Field({ label, required = false, error, children, className = '' }) {
    return (
        <div className={className}>
            <label className="mb-2 block text-sm font-semibold text-[#434547]">
                {label}{required && <span className="text-red-500"> *</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
}

function Divider() {
    return <div className="my-3 h-px w-full bg-[#F0F0F0]" />
}

const RICH_TEXT_CONTENT_CLASS_NAME = 'break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_*]:[word-break:break-word] [&_p]:my-0 [&_div]:my-0 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-base [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:text-sm [&_h5]:font-semibold [&_a]:cursor-pointer [&_a]:text-[#2F54EB] [&_a]:underline [&_a]:break-words [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1'
const TEXT_SIZE_STYLES = { 1: '12px', 2: '14px', 3: '16px', 4: '18px', 5: '22px', 6: '28px', 7: '36px' }

function RadioOption({ name, value, checked, onChange, label }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-[#434343]">
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={() => onChange(value)}
                className="h-4 w-4 accent-[#597EF7]"
            />
            <span>{label}</span>
        </label>
    )
}

const DEFAULT_IMAGE_CROP_BOX = { x: 15, y: 15, width: 70, height: 70 }
const IMAGE_EDIT_MAX_ZOOM_STEP = 120
const IMAGE_EDIT_ZOOM_RATIO = 1.12

function getImageEditZoom(step) {
    const safeStep = Math.min(Math.max(Number(step) || 0, 0), IMAGE_EDIT_MAX_ZOOM_STEP)
    return Number(Math.pow(IMAGE_EDIT_ZOOM_RATIO, safeStep).toFixed(4))
}

function cropImageFile(file, cropBox, imageZoom = 1, frameSize = null) {
    return new Promise((resolve, reject) => {
        if (!isNativeFile(file) || typeof document === 'undefined' || typeof URL === 'undefined') {
            reject(new Error('Cannot crop this image'))
            return
        }

        const image = new Image()
        const objectUrl = URL.createObjectURL(file)
        image.onload = () => {
            try {
                const frameWidth = Math.max(1, Number(frameSize?.width) || image.naturalWidth)
                const frameHeight = Math.max(1, Number(frameSize?.height) || image.naturalHeight)
                const containScale = Math.min(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight)
                const displayScale = containScale * Math.max(1, imageZoom)
                const displayWidth = image.naturalWidth * displayScale
                const displayHeight = image.naturalHeight * displayScale
                const displayLeft = (frameWidth - displayWidth) / 2
                const displayTop = (frameHeight - displayHeight) / 2
                const cropLeft = (cropBox.x / 100) * frameWidth
                const cropTop = (cropBox.y / 100) * frameHeight
                const cropWidth = (cropBox.width / 100) * frameWidth
                const cropHeight = (cropBox.height / 100) * frameHeight

                const rawSourceX = (cropLeft - displayLeft) / displayScale
                const rawSourceY = (cropTop - displayTop) / displayScale
                const rawSourceWidth = cropWidth / displayScale
                const rawSourceHeight = cropHeight / displayScale
                const sourceX = Math.min(Math.max(0, rawSourceX), image.naturalWidth - 1)
                const sourceY = Math.min(Math.max(0, rawSourceY), image.naturalHeight - 1)
                const sourceWidth = Math.max(1, Math.min(rawSourceWidth, image.naturalWidth - sourceX))
                const sourceHeight = Math.max(1, Math.min(rawSourceHeight, image.naturalHeight - sourceY))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(sourceWidth)
                canvas.height = Math.round(sourceHeight)
                const context = canvas.getContext('2d')
                context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
                const outputType = file.type && file.type !== 'image/svg+xml' ? file.type : 'image/png'
                const outputName = outputType === 'image/png' ? file.name.replace(/\.[^.]+$/, '.png') : file.name

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(objectUrl)
                    if (!blob) {
                        reject(new Error('Cannot export cropped image'))
                        return
                    }

                    const nextFile = typeof File !== 'undefined'
                        ? new File([blob], outputName || 'image.png', { type: outputType, lastModified: Date.now() })
                        : blob
                    resolve(nextFile)
                }, outputType, 0.95)
            } catch (error) {
                URL.revokeObjectURL(objectUrl)
                reject(error)
            }
        }
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('Cannot load image'))
        }
        image.src = objectUrl
    })
}
function UploadVideoPreview({ src, fileName }) {
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
function UploadBucket({ id, files, onChange, title, accept, multiple = true, error, validateFile, bucketClassName = "", bodyClassName = "", showImagePreview = false }) {
    const inputRef = useRef(null)
    const previewFrameRef = useRef(null)
    const cropImageRef = useRef(null)
    const imagePreviewFrameRef = useRef(null)
    const imagePreviewRef = useRef(null)
    const imagePreviewDragRef = useRef(null)
    const imagePreviewLoadTimerRef = useRef(null)
    const imagePreviewScaleRef = useRef(1)
    const imagePreviewPositionRef = useRef({ x: 0, y: 0 })
    const cropDragRef = useRef(null)
    const [dragOver, setDragOver] = useState(false)
    const [previewUrl, setPreviewUrl] = useState('')
    const [listPreviewFile, setListPreviewFile] = useState(null)
    const [listPreviewUrl, setListPreviewUrl] = useState('')
    const [imageMenuOpen, setImageMenuOpen] = useState(false)
    const [isEditingImage, setIsEditingImage] = useState(false)
    const [cropBox, setCropBox] = useState(DEFAULT_IMAGE_CROP_BOX)
    const [imageEditBaselineBox, setImageEditBaselineBox] = useState(DEFAULT_IMAGE_CROP_BOX)
    const [imageZoomStep, setImageZoomStep] = useState(0)
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
    const [imagePreviewScale, setImagePreviewScale] = useState(1)
    const [imagePreviewPosition, setImagePreviewPosition] = useState({ x: 0, y: 0 })
    const [isDraggingImagePreview, setIsDraggingImagePreview] = useState(false)
    const [imagePreviewLoadProgress, setImagePreviewLoadProgress] = useState(1)
    const [isImagePreviewLoaded, setIsImagePreviewLoaded] = useState(false)
    const [imagePreviewFitSize, setImagePreviewFitSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        if (!showImagePreview) {
            setPreviewUrl('')
            return undefined
        }

        const file = files[0]
        if (!file) {
            setPreviewUrl('')
            return undefined
        }

        if (file.path) {
            setPreviewUrl(file.path)
            return undefined
        }

        if (isNativeFile(file) && file.type?.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl(objectUrl)
            return () => URL.revokeObjectURL(objectUrl)
        }

        setPreviewUrl('')
        return undefined
    }, [files, showImagePreview])
    useEffect(() => {
        if (!listPreviewFile) {
            setListPreviewUrl('')
            return undefined
        }

        if (listPreviewFile.path) {
            setListPreviewUrl(listPreviewFile.path)
            return undefined
        }

        if (isNativeFile(listPreviewFile) && isUploadPreviewable(listPreviewFile)) {
            const objectUrl = URL.createObjectURL(listPreviewFile)
            setListPreviewUrl(objectUrl)
            return () => URL.revokeObjectURL(objectUrl)
        }

        setListPreviewUrl('')
        return undefined
    }, [listPreviewFile])

    useEffect(() => {
        setImageMenuOpen(false)
        setIsEditingImage(false)
        setCropBox(DEFAULT_IMAGE_CROP_BOX)
        setImageEditBaselineBox(DEFAULT_IMAGE_CROP_BOX)
        setImageZoomStep(0)
        setIsImagePreviewOpen(false)
        setImagePreviewScale(1)
        setImagePreviewPosition({ x: 0, y: 0 })
        setIsDraggingImagePreview(false)
        setImagePreviewFitSize({ width: 0, height: 0 })
        setListPreviewFile(null)
        imagePreviewScaleRef.current = 1
        imagePreviewPositionRef.current = { x: 0, y: 0 }
        imagePreviewDragRef.current = null
        cropDragRef.current = null
    }, [files[0]?.name, files[0]?.path, files[0]?.size])

    const hasImagePreview = showImagePreview && !!previewUrl
    const currentImagePreviewUrl = listPreviewUrl || previewUrl
    const imagePreviewFileName = listPreviewFile ? getUploadFileName(listPreviewFile) : files[0]?.fileName || files[0]?.name || 'Ảnh đã chọn'
    const currentPreviewType = listPreviewFile ? getUploadPreviewType(listPreviewFile) : 'image'
    const imageZoom = getImageEditZoom(imageZoomStep)
    const hasImageEditAdjustment = imageZoomStep > 0
        || Math.abs(cropBox.x - imageEditBaselineBox.x) > 0.1
        || Math.abs(cropBox.y - imageEditBaselineBox.y) > 0.1
        || Math.abs(cropBox.width - imageEditBaselineBox.width) > 0.1
        || Math.abs(cropBox.height - imageEditBaselineBox.height) > 0.1

    useEffect(() => {
        if (!isImagePreviewOpen) return undefined

        if (imagePreviewLoadTimerRef.current) {
            window.clearTimeout(imagePreviewLoadTimerRef.current)
            imagePreviewLoadTimerRef.current = null
        }

        imagePreviewScaleRef.current = 1
        imagePreviewPositionRef.current = { x: 0, y: 0 }
        setImagePreviewScale(1)
        setImagePreviewPosition({ x: 0, y: 0 })
        setIsDraggingImagePreview(false)
        setImagePreviewLoadProgress(1)
        setIsImagePreviewLoaded(false)
        setImagePreviewFitSize({ width: 0, height: 0 })

        const progressTimer = window.setInterval(() => {
            setImagePreviewLoadProgress((current) => {
                if (current >= 95) return current

                const step = Math.max(1, Math.round((95 - current) * 0.14))
                return Math.min(95, current + step)
            })
        }, 120)

        return () => window.clearInterval(progressTimer)
    }, [isImagePreviewOpen, currentImagePreviewUrl])

    useEffect(() => {
        if (!isImagePreviewOpen) return undefined

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsImagePreviewOpen(false)
                setListPreviewFile(null)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isImagePreviewOpen])

    useEffect(() => () => {
        if (imagePreviewLoadTimerRef.current) window.clearTimeout(imagePreviewLoadTimerRef.current)
    }, [])

    const addFiles = (fileList) => {
        const selected = Array.from(fileList || [])
        if (!selected.length) return
        const validFiles = []
        for (const file of selected) {
            const message = validateFile?.(file)
            if (message) {
                onChange(files, message)
                return
            }
            validFiles.push(file)
        }
        onChange(multiple ? [...files, ...validFiles] : validFiles.slice(0, 1))
    }

    const removeFile = (index) => {
        setImageMenuOpen(false)
        setIsEditingImage(false)
        onChange(files.filter((_, itemIndex) => itemIndex !== index))
    }

    const openFilePicker = () => {
        if (!isEditingImage && !hasImagePreview) inputRef.current?.click()
    }

    const getCropImageBounds = (zoomValue = imageZoom) => {
        const frame = previewFrameRef.current
        const image = cropImageRef.current

        if (!frame || !image) return { left: 0, top: 0, right: 100, bottom: 100 }

        const rect = frame.getBoundingClientRect()
        const naturalWidth = image.naturalWidth || 0
        const naturalHeight = image.naturalHeight || 0

        if (!rect.width || !rect.height || !naturalWidth || !naturalHeight) {
            return { left: 0, top: 0, right: 100, bottom: 100 }
        }

        const containScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight)
        const displayScale = containScale * Math.max(1, zoomValue)
        const displayWidth = naturalWidth * displayScale
        const displayHeight = naturalHeight * displayScale
        const left = ((rect.width - displayWidth) / 2 / rect.width) * 100
        const top = ((rect.height - displayHeight) / 2 / rect.height) * 100
        const right = left + (displayWidth / rect.width) * 100
        const bottom = top + (displayHeight / rect.height) * 100

        return {
            left: Math.max(0, left),
            top: Math.max(0, top),
            right: Math.min(100, right),
            bottom: Math.min(100, bottom),
        }
    }

    const clampCropBox = (box) => {
        const bounds = getCropImageBounds()
        const boundsWidth = Math.max(1, bounds.right - bounds.left)
        const boundsHeight = Math.max(1, bounds.bottom - bounds.top)
        const minWidth = Math.min(24, boundsWidth)
        const minHeight = Math.min(24, boundsHeight)
        const width = Math.min(boundsWidth, Math.max(minWidth, box.width))
        const height = Math.min(boundsHeight, Math.max(minHeight, box.height))

        return {
            width,
            height,
            x: Math.min(Math.max(bounds.left, box.x), bounds.right - width),
            y: Math.min(Math.max(bounds.top, box.y), bounds.bottom - height),
        }
    }

    const getDefaultCropBox = (zoomValue = imageZoom) => {
        const bounds = getCropImageBounds(zoomValue)
        const boundsWidth = Math.max(1, bounds.right - bounds.left)
        const boundsHeight = Math.max(1, bounds.bottom - bounds.top)
        const horizontalInset = Math.min(boundsWidth * 0.12, 12)
        const verticalInset = Math.min(boundsHeight * 0.14, 14)

        const minWidth = Math.min(24, boundsWidth)
        const minHeight = Math.min(24, boundsHeight)
        const width = Math.min(boundsWidth, Math.max(minWidth, boundsWidth - horizontalInset * 2))
        const height = Math.min(boundsHeight, Math.max(minHeight, boundsHeight - verticalInset * 2))

        return {
            x: bounds.left + (boundsWidth - width) / 2,
            y: bounds.top + (boundsHeight - height) / 2,
            width,
            height,
        }
    }

    useEffect(() => {
        if (!isEditingImage) return
        setCropBox((current) => clampCropBox(current))
    }, [imageZoom, isEditingImage])

    const startImageEdit = (event) => {
        event.stopPropagation()
        setImageMenuOpen(false)
        setImageZoomStep(0)
        const defaultCropBox = getDefaultCropBox(1)
        setImageEditBaselineBox(defaultCropBox)
        setCropBox(defaultCropBox)
        setIsEditingImage(true)
    }

    const changeImage = (event) => {
        event.stopPropagation()
        setImageMenuOpen(false)
        inputRef.current?.click()
    }

    const deleteImage = (event) => {
        event.stopPropagation()
        removeFile(0)
    }

    const startCropDrag = (event, action = 'move') => {
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        cropDragRef.current = {
            pointerId: event.pointerId,
            action,
            startX: event.clientX,
            startY: event.clientY,
            startBox: cropBox,
        }
    }

    const handleCropPointerMove = (event) => {
        const dragState = cropDragRef.current
        const frame = previewFrameRef.current
        if (!dragState || dragState.pointerId !== event.pointerId || !frame) return

        event.preventDefault()
        const rect = frame.getBoundingClientRect()
        const deltaX = ((event.clientX - dragState.startX) / rect.width) * 100
        const deltaY = ((event.clientY - dragState.startY) / rect.height) * 100
        const startBox = dragState.startBox

        if (dragState.action === 'move') {
            setCropBox(clampCropBox({
                ...startBox,
                x: startBox.x + deltaX,
                y: startBox.y + deltaY,
            }))
            return
        }

        const bounds = getCropImageBounds()
        const minWidth = Math.min(24, Math.max(1, bounds.right - bounds.left))
        const minHeight = Math.min(24, Math.max(1, bounds.bottom - bounds.top))
        let left = startBox.x
        let right = startBox.x + startBox.width
        let top = startBox.y
        let bottom = startBox.y + startBox.height
        const clampValue = (value, min, max) => Math.min(Math.max(value, min), max)

        if (dragState.action.includes('w')) left = clampValue(startBox.x + deltaX, bounds.left, right - minWidth)
        if (dragState.action.includes('e')) right = clampValue(startBox.x + startBox.width + deltaX, left + minWidth, bounds.right)
        if (dragState.action.includes('n')) top = clampValue(startBox.y + deltaY, bounds.top, bottom - minHeight)
        if (dragState.action.includes('s')) bottom = clampValue(startBox.y + startBox.height + deltaY, top + minHeight, bounds.bottom)

        setCropBox(clampCropBox({
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
        }))
    }

    const stopCropDrag = (event) => {
        const dragState = cropDragRef.current
        if (!dragState || dragState.pointerId !== event.pointerId) return

        event.currentTarget.releasePointerCapture?.(event.pointerId)
        cropDragRef.current = null
    }

    const applyImageEdit = async (event) => {
        event.stopPropagation()
        const file = files[0]
        if (!file) return

        if (!isNativeFile(file)) {
            setIsEditingImage(false)
            return
        }

        try {
            const frameRect = previewFrameRef.current?.getBoundingClientRect()
            const croppedFile = await cropImageFile(file, cropBox, imageZoom, frameRect ? { width: frameRect.width, height: frameRect.height } : null)
            onChange([croppedFile])
            setImageZoomStep(0)
            setIsEditingImage(false)
        } catch {
            setIsEditingImage(false)
        }
    }

    const cancelImageEdit = (event) => {
        event.stopPropagation()
        setImageMenuOpen(false)
        setIsEditingImage(false)
        setCropBox(DEFAULT_IMAGE_CROP_BOX)
        setImageEditBaselineBox(DEFAULT_IMAGE_CROP_BOX)
        setImageZoomStep(0)
    }

    const zoomImageIn = (event) => {
        event.stopPropagation()
        setImageZoomStep((current) => Math.min(current + 1, IMAGE_EDIT_MAX_ZOOM_STEP))
    }

    const undoImageZoomStep = (event) => {
        event.stopPropagation()
        const nextZoomStep = Math.max(imageZoomStep - 1, 0)
        const defaultCropBox = getDefaultCropBox(getImageEditZoom(nextZoomStep))
        setImageEditBaselineBox(defaultCropBox)
        setCropBox(defaultCropBox)
        setImageZoomStep(nextZoomStep)
    }

    const closeImagePreview = () => {
        setIsImagePreviewOpen(false)
        setListPreviewFile(null)
    }

    const openImagePreview = (event) => {
        event.stopPropagation()
        if (isEditingImage) return

        setImageMenuOpen(false)
        setListPreviewFile(null)
        setIsImagePreviewOpen(true)
    }

    const openFileCardPreview = (file, event) => {
        event.stopPropagation()
        if (!isUploadPreviewable(file)) return

        setImageMenuOpen(false)
        setListPreviewFile(file)
        setIsImagePreviewOpen(true)
    }

    const clampImagePreviewPosition = (position, scaleValue = imagePreviewScaleRef.current) => {
        const frame = imagePreviewFrameRef.current
        const image = imagePreviewRef.current

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
    }

    const updateImagePreviewFitSize = () => {
        const frame = imagePreviewFrameRef.current
        const image = imagePreviewRef.current

        if (!frame || !image || !image.naturalWidth || !image.naturalHeight) return

        const frameRect = frame.getBoundingClientRect()
        if (!frameRect.width || !frameRect.height) return

        const fitScale = Math.min(frameRect.width / image.naturalWidth, frameRect.height / image.naturalHeight)
        const nextSize = {
            width: Math.max(1, Math.round(image.naturalWidth * fitScale)),
            height: Math.max(1, Math.round(image.naturalHeight * fitScale)),
        }

        setImagePreviewFitSize((current) => (
            current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
        ))
    }

    const zoomImagePreview = (getNextScale, anchor) => {
        const currentScale = imagePreviewScaleRef.current
        const rawNextScale = typeof getNextScale === 'function' ? getNextScale(currentScale) : getNextScale
        const nextScale = Number(Math.min(Math.max(rawNextScale, 1), 5).toFixed(3))
        const factor = currentScale > 0 ? nextScale / currentScale : 1
        let nextPosition = imagePreviewPositionRef.current

        if (anchor && factor !== 1) {
            const frameRect = imagePreviewFrameRef.current?.getBoundingClientRect()

            if (frameRect) {
                const anchorX = anchor.clientX - frameRect.left - frameRect.width / 2
                const anchorY = anchor.clientY - frameRect.top - frameRect.height / 2

                nextPosition = {
                    x: imagePreviewPositionRef.current.x * factor + anchorX * (1 - factor),
                    y: imagePreviewPositionRef.current.y * factor + anchorY * (1 - factor),
                }
            }
        }

        const clampedPosition = clampImagePreviewPosition(nextPosition, nextScale)
        imagePreviewScaleRef.current = nextScale
        imagePreviewPositionRef.current = clampedPosition
        setImagePreviewScale(nextScale)
        setImagePreviewPosition(clampedPosition)
    }

    const handleImagePreviewWheel = (event) => {
        event.preventDefault()
        const wheelDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
        const zoomFactor = Math.exp(-wheelDelta * 0.0015)
        zoomImagePreview((current) => current * zoomFactor, { clientX: event.clientX, clientY: event.clientY })
    }

    const handleImagePreviewPointerDown = (event) => {
        if (event.button !== 0) return

        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        imagePreviewDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startPosition: imagePreviewPositionRef.current,
        }
        setIsDraggingImagePreview(true)
    }

    const handleImagePreviewPointerMove = (event) => {
        const dragState = imagePreviewDragRef.current
        if (!dragState || dragState.pointerId !== event.pointerId) return

        event.preventDefault()
        const clampedPosition = clampImagePreviewPosition({
            x: dragState.startPosition.x + event.clientX - dragState.startX,
            y: dragState.startPosition.y + event.clientY - dragState.startY,
        }, imagePreviewScaleRef.current)
        imagePreviewPositionRef.current = clampedPosition
        setImagePreviewPosition(clampedPosition)
    }

    const stopImagePreviewDrag = (event) => {
        const dragState = imagePreviewDragRef.current
        if (!dragState || dragState.pointerId !== event.pointerId) return

        if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }

        imagePreviewDragRef.current = null
        setIsDraggingImagePreview(false)
    }

    useEffect(() => {
        if (!isImagePreviewOpen) return undefined

        let frameId = window.requestAnimationFrame(updateImagePreviewFitSize)
        const handleResize = () => {
            window.cancelAnimationFrame(frameId)
            frameId = window.requestAnimationFrame(updateImagePreviewFitSize)
        }

        window.addEventListener('resize', handleResize)
        return () => {
            window.cancelAnimationFrame(frameId)
            window.removeEventListener('resize', handleResize)
        }
    }, [isImagePreviewOpen, currentImagePreviewUrl])

    useEffect(() => {
        if (!isImagePreviewOpen || !imagePreviewFitSize.width || !imagePreviewFitSize.height) return

        const clampedPosition = clampImagePreviewPosition(imagePreviewPositionRef.current, imagePreviewScaleRef.current)
        imagePreviewPositionRef.current = clampedPosition
        setImagePreviewPosition(clampedPosition)
    }, [imagePreviewFitSize.width, imagePreviewFitSize.height, isImagePreviewOpen])

    return (
        <div>
            {title && <p className="mb-2 text-sm font-semibold text-[#434547]">{title}</p>}
            {files.length > 0 && !hasImagePreview && (
                <div className="mb-2 space-y-2">
                    {files.map((file, index) => {
                        const fileName = getUploadFileName(file)
                        const fileSize = formatUploadFileSize(file.size)
                        const UploadFileIcon = getUploadFileIcon(file)
                        const canPreviewFile = isUploadPreviewable(file)

                        return (
                            <div
                                key={`${fileName}-${file.size || file.id || index}-${index}`}
                                role={canPreviewFile ? 'button' : undefined}
                                tabIndex={canPreviewFile ? 0 : undefined}
                                onClick={(event) => canPreviewFile && openFileCardPreview(file, event)}
                                onKeyDown={(event) => {
                                    if (!canPreviewFile || (event.key !== 'Enter' && event.key !== ' ')) return
                                    event.preventDefault()
                                    openFileCardPreview(file, event)
                                }}
                                className={`flex min-h-[62px] items-center justify-between gap-3 rounded-md border border-[#D9D9D9] bg-white p-2 text-sm transition-colors ${canPreviewFile ? 'cursor-pointer hover:bg-[#FAFAFA]' : ''}`}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <UploadFileIcon className="h-[30px] w-[30px] flex-shrink-0 text-[#1F1F1F]" />
                                    <div className="min-w-0">
                                        <p className="w-full break-words text-sm text-[#1F1F1F]">{fileName}</p>
                                        {fileSize && <p className="mt-1 break-words text-sm text-[#8C8C8C]">{fileSize}</p>}
                                        {file.isExisting && <span className="mt-1 inline-flex rounded bg-[#F6FFED] px-2 py-0.5 text-xs font-medium text-[#389E0D]">Đã tải lên</span>}
                                    </div>
                                </div>
                                <button type="button" onClick={(event) => { event.stopPropagation(); removeFile(index) }} className="flex-shrink-0 rounded p-1 text-[#8C8C8C] transition hover:bg-red-50 hover:text-red-500" aria-label="Xóa tệp">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
            <div
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(event) => event.key === 'Enter' && openFilePicker()}
                onDragOver={(event) => {
                    event.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                    event.preventDefault()
                    setDragOver(false)
                    addFiles(event.dataTransfer.files)
                }}
                className={`${bucketClassName || 'min-h-[146px]'} cursor-pointer rounded-md border border-dashed p-1 transition ${dragOver ? 'border-[#597EF7] bg-[#F0F5FF]' : error ? 'border-red-400' : 'border-[#D9D9D9] hover:border-[#597EF7]'}`}
            >
                {hasImagePreview ? (
                    <div ref={previewFrameRef} className={`relative ${bodyClassName || "min-h-[136px]"} overflow-hidden rounded-[4px] bg-white ${isEditingImage ? '' : 'cursor-zoom-in'}`} onClick={openImagePreview}>
                        <img ref={cropImageRef} src={previewUrl} alt={files[0]?.name || files[0]?.fileName || 'Ảnh đã chọn'} className="absolute inset-0 h-full w-full object-contain transition-transform duration-200 ease-out" style={{ transform: `scale(${isEditingImage ? imageZoom : 1})`, transformOrigin: 'center center' }} />

                        {isEditingImage ? (
                            <>
                                <div className="absolute left-0 top-0 bg-black/35" style={{ width: '100%', height: `${cropBox.y}%` }} />
                                <div className="absolute left-0 bg-black/35" style={{ top: `${cropBox.y + cropBox.height}%`, width: '100%', height: `${100 - cropBox.y - cropBox.height}%` }} />
                                <div className="absolute left-0 bg-black/35" style={{ top: `${cropBox.y}%`, width: `${cropBox.x}%`, height: `${cropBox.height}%` }} />
                                <div className="absolute bg-black/35" style={{ left: `${cropBox.x + cropBox.width}%`, top: `${cropBox.y}%`, width: `${100 - cropBox.x - cropBox.width}%`, height: `${cropBox.height}%` }} />
                                <div
                                    className="absolute z-20 cursor-move border-2 border-[#4285F4] bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
                                    style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.width}%`, height: `${cropBox.height}%` }}
                                    onPointerDown={startCropDrag}
                                    onPointerMove={handleCropPointerMove}
                                    onPointerUp={stopCropDrag}
                                    onPointerCancel={stopCropDrag}
                                >
                                    <div className="absolute left-1/3 top-0 h-full border-l border-dashed border-white/70" />
                                    <div className="absolute left-2/3 top-0 h-full border-l border-dashed border-white/70" />
                                    <div className="absolute left-0 top-1/3 w-full border-t border-dashed border-white/70" />
                                    <div className="absolute left-0 top-2/3 w-full border-t border-dashed border-white/70" />
                                    {[
                                        ['nw', 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize'],
                                        ['n', 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize'],
                                        ['ne', 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize'],
                                        ['w', 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize'],
                                        ['e', 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize'],
                                        ['sw', 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize'],
                                        ['s', 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize'],
                                        ['se', 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize'],
                                    ].map(([action, position]) => (
                                        <span key={action} onPointerDown={(event) => startCropDrag(event, action)} className={`absolute h-2.5 w-2.5 rounded-[2px] border border-white bg-[#4285F4] ${position}`} />
                                    ))}
                                </div>
                                <div className="absolute right-2 top-2 z-30 flex flex-col gap-2">
                                    <button type="button" onClick={(event) => { event.stopPropagation(); setImageMenuOpen((current) => !current) }} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#344054] shadow-none ring-1 ring-inset ring-[#E4E7EC] transition hover:border-[#B7C4FF] hover:bg-[#F8FAFF] hover:text-[#2F54EB]" aria-label="Mở menu chỉnh sửa ảnh">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={zoomImageIn} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow-sm transition hover:bg-red-50" aria-label="Phóng to ảnh">
                                        <Crop className="h-4 w-4" />
                                    </button>
                                    {hasImageEditAdjustment && (
                                        <button type="button" onClick={undoImageZoomStep} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#434547] shadow-sm transition hover:bg-[#F0F5FF] hover:text-[#2F54EB]" aria-label="Lùi một bước chỉnh sửa ảnh">
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button type="button" onClick={applyImageEdit} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#434547] shadow-sm transition hover:bg-[#F0F5FF] hover:text-[#2F54EB]" aria-label="Áp dụng chỉnh sửa">
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={cancelImageEdit} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#434547] shadow-sm transition hover:bg-red-50 hover:text-red-500" aria-label="Hủy chỉnh sửa">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                {imageMenuOpen && (
                                    <div className="absolute right-11 top-2 z-40 w-44 overflow-hidden rounded-lg bg-white py-1.5 text-sm shadow-lg ring-1 ring-black/5" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" onClick={cancelImageEdit} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#595959] transition hover:bg-[#F5F5F5] hover:text-[#D4380D]">
                                            <Pencil className="h-4 w-4 text-red-500" />
                                            Hủy bỏ chỉnh sửa
                                        </button>
                                        <button type="button" onClick={changeImage} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#595959] transition hover:bg-[#F5F5F5] hover:text-[#2F54EB]">
                                            <RotateCcw className="h-4 w-4" />
                                            Thay đổi hình
                                        </button>
                                        <button type="button" onClick={deleteImage} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#595959] transition hover:bg-red-50 hover:text-red-500">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                            Xóa
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={(event) => { event.stopPropagation(); setImageMenuOpen((current) => !current) }} className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#344054] shadow-none ring-1 ring-inset ring-[#E4E7EC] transition hover:border-[#B7C4FF] hover:bg-[#F8FAFF] hover:text-[#2F54EB]" aria-label="Mở menu ảnh">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {imageMenuOpen && (
                                    <div className="absolute right-2 top-11 z-30 w-44 overflow-hidden rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" onClick={startImageEdit} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#595959] transition hover:bg-[#F5F5F5] hover:text-[#D4380D]">
                                            <Pencil className="h-4 w-4 text-red-500" />
                                            Chỉnh sửa hình
                                        </button>
                                        <button type="button" onClick={changeImage} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#595959] transition hover:bg-[#F5F5F5] hover:text-[#2F54EB]">
                                            <RotateCcw className="h-4 w-4" />
                                            Thay đổi hình
                                        </button>
                                        <button type="button" onClick={deleteImage} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#595959] transition hover:bg-red-50 hover:text-red-500">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                            Xóa
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className={`flex ${bodyClassName || "min-h-[136px]"} flex-col items-center justify-center text-center`}>
                        <Upload className="mb-2 h-5 w-5 text-[#597EF7]" />
                        <p className="text-sm font-medium text-[#597EF7]">Tải lên từ máy tính</p>
                        <p className="mt-2 text-sm text-[#8C8C8C]">Hoặc kéo và thả tập tin tại đây</p>
                        <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }} className="mt-3 rounded-md bg-[#597EF7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F54EB]">
                            Kho lưu trữ
                        </button>
                    </div>
                )}
            </div>
            {isImagePreviewOpen && currentImagePreviewUrl && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={closeImagePreview} />
                    <div className="relative w-full max-w-[768px] rounded-md bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        {currentPreviewType === 'model3d' ? (
                            <GlbViewer src={currentImagePreviewUrl} fileName={imagePreviewFileName} />
                        ) : currentPreviewType === 'video' ? (
                            <UploadVideoPreview src={currentImagePreviewUrl} fileName={imagePreviewFileName} />
                        ) : (
                            <div
                                ref={imagePreviewFrameRef}
                                className={`relative flex h-[58vh] min-h-[360px] select-none items-center justify-center overflow-hidden rounded-md bg-white ${isDraggingImagePreview ? 'cursor-grabbing' : 'cursor-grab'}`}
                                onWheel={handleImagePreviewWheel}
                                onPointerDown={handleImagePreviewPointerDown}
                                onPointerMove={handleImagePreviewPointerMove}
                                onPointerUp={stopImagePreviewDrag}
                                onPointerCancel={stopImagePreviewDrag}
                                onLostPointerCapture={stopImagePreviewDrag}
                                style={{ touchAction: 'none' }}
                            >
                                {!isImagePreviewLoaded && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white text-[#434343]">
                                        <ImageIcon className="h-9 w-9 text-[#1F1F1F]" />
                                        <div className="w-56 max-w-[70%] overflow-hidden rounded-full bg-[#F0F0F0]">
                                            <div className="h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out" style={{ width: `${imagePreviewLoadProgress}%` }} />
                                        </div>
                                        <p className="text-sm font-medium">Đang tải ảnh {imagePreviewLoadProgress}%</p>
                                    </div>
                                )}
                                <img
                                    ref={imagePreviewRef}
                                    src={currentImagePreviewUrl}
                                    alt={imagePreviewFileName}
                                    draggable={false}
                                    onLoad={() => {
                                        updateImagePreviewFitSize()
                                        const clampedPosition = clampImagePreviewPosition(imagePreviewPositionRef.current, imagePreviewScaleRef.current)
                                        imagePreviewPositionRef.current = clampedPosition
                                        setImagePreviewPosition(clampedPosition)
                                        setImagePreviewLoadProgress(100)

                                        if (imagePreviewLoadTimerRef.current) {
                                            window.clearTimeout(imagePreviewLoadTimerRef.current)
                                        }

                                        imagePreviewLoadTimerRef.current = window.setTimeout(() => {
                                            setIsImagePreviewLoaded(true)
                                            imagePreviewLoadTimerRef.current = null
                                        }, 160)
                                    }}
                                    onError={() => {
                                        setImagePreviewLoadProgress(100)
                                        setIsImagePreviewLoaded(true)
                                    }}
                                    onDragStart={(event) => event.preventDefault()}
                                    className={`max-h-full max-w-full flex-none select-none object-contain transition-opacity duration-200 ${isImagePreviewLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    style={{
                                        width: imagePreviewFitSize.width ? `${imagePreviewFitSize.width}px` : undefined,
                                        height: imagePreviewFitSize.height ? `${imagePreviewFitSize.height}px` : undefined,
                                        transform: `translate3d(${imagePreviewPosition.x}px, ${imagePreviewPosition.y}px, 0) scale(${imagePreviewScale})`,
                                        transition: isDraggingImagePreview ? 'opacity 200ms ease-out' : 'opacity 200ms ease-out, transform 120ms ease-out',
                                        willChange: 'transform, opacity',
                                    }}
                                />
                            </div>
                        )}
                        <div className="mt-4">
                            <p className="break-words text-sm text-[#1F1F1F]">{imagePreviewFileName}</p>
                            <div className="mt-2 flex items-center justify-between gap-3">
                                {currentPreviewType === 'image' ? (
                                    <div className="flex h-9 items-center gap-2 rounded-full border border-[#D9D9D9] px-2 text-[#1F1F1F]">
                                        <button type="button" onClick={() => zoomImagePreview((current) => current - 0.2)} className="rounded-full p-1 transition hover:bg-[#F5F5F5]" aria-label="Thu nhỏ ảnh">
                                            <ZoomOut className="h-4 w-4" />
                                        </button>
                                        <span className="min-w-10 text-center text-sm text-[#434343]">{Math.round(imagePreviewScale * 100)}%</span>
                                        <button type="button" onClick={() => zoomImagePreview((current) => current + 0.2)} className="rounded-full p-1 transition hover:bg-[#F5F5F5]" aria-label="Phóng to ảnh">
                                            <ZoomIn className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : <div />}
                                <Button variant="danger" onClick={closeImagePreview} className="!rounded-lg !bg-[#EF4444] hover:!bg-[#DC2626]">
                                    <X className="h-4 w-4" />
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(event) => {
                    addFiles(event.target.files)
                    event.target.value = ''
                }}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
}

function ToolbarIconButton({ children, className = '', onClick }) {
    return (
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={`inline-flex h-7 w-7 items-center justify-center rounded text-[#48505B] transition hover:bg-[#EEF2FF] hover:text-[#2F54EB] ${className}`}>
            {children}
        </button>
    )
}

function ToolbarDivider() {
    return <span className="mx-1 h-6 w-px bg-[#D9D9D9]" />
}

function SectionTextEditor({ value, onChange, error }) {
    const editorRef = useRef(null)
    const selectionRef = useRef(null)
    const [headingOpen, setHeadingOpen] = useState(false)
    const [sizeOpen, setSizeOpen] = useState(false)
    const [linkOpen, setLinkOpen] = useState(false)
    const [linkValue, setLinkValue] = useState('')

    const headingOptions = [
        { label: 'P', value: 'P' },
        { label: 'H1', value: 'H1' },
        { label: 'H2', value: 'H2' },
        { label: 'H3', value: 'H3' },
        { label: 'H4', value: 'H4' },
        { label: 'H5', value: 'H5' },
    ]
    const sizeOptions = [1, 2, 3, 4, 5, 6, 7]

    useEffect(() => {
        const editor = editorRef.current
        if (!editor || document.activeElement === editor) return
        if ((value || '') !== editor.innerHTML) editor.innerHTML = value || ''
    }, [value])

    const emitChange = () => {
        const editor = editorRef.current
        if (!editor) return
        const nextValue = editor.textContent?.trim() ? editor.innerHTML : ''
        onChange(nextValue)
    }

    const isAutoLinkText = (text) => {
        const trimmed = (text || '').trim()
        if (!trimmed || /\s/.test(trimmed)) return false

        return /^https?:\/\/\S+$/i.test(trimmed)
            || /^www\.[^\s.]+\.[^\s]+$/i.test(trimmed)
            || /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/\S*)?$/i.test(trimmed)
    }

    const normalizeAutoLinkHref = (text) => {
        const trimmed = (text || '').trim()
        if (/^https?:\/\//i.test(trimmed)) return trimmed
        return `https://${trimmed.replace(/^\/+/, '')}`
    }

    const splitAutoLinkText = (text) => {
        let linkText = text || ''
        let suffix = ''

        while (/[.,!?;:)\]}]+$/.test(linkText)) {
            suffix = linkText.slice(-1) + suffix
            linkText = linkText.slice(0, -1)
        }

        return { linkText, suffix }
    }

    const applyAutoLinkStyle = (link) => {
        if (!link) return
        link.style.color = '#2F54EB'
        link.style.textDecoration = 'underline'
        link.style.cursor = 'pointer'
        link.style.overflowWrap = 'anywhere'
        link.style.wordBreak = 'break-word'
    }

    const createAutoLink = (linkText) => {
        const link = document.createElement('a')
        link.href = normalizeAutoLinkHref(linkText)
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.textContent = linkText
        applyAutoLinkStyle(link)
        return link
    }

    const saveSelection = () => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined') return
        const selection = window.getSelection()
        if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
            selectionRef.current = selection.getRangeAt(0).cloneRange()
        }
    }

    const getCaretTextOffset = () => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined' || typeof document === 'undefined') return null

        const selection = window.getSelection()
        if (!selection?.rangeCount) return null

        const range = selection.getRangeAt(0)
        if (!editor.contains(range.endContainer)) return null

        const preRange = range.cloneRange()
        preRange.selectNodeContents(editor)
        try {
            preRange.setEnd(range.endContainer, range.endOffset)
        } catch {
            return null
        }

        return preRange.toString().length
    }

    const restoreCaretTextOffset = (offset) => {
        const editor = editorRef.current
        if (offset === null || offset === undefined || !editor || typeof window === 'undefined' || typeof document === 'undefined') return

        const walker = document.createTreeWalker(editor, window.NodeFilter.SHOW_TEXT)
        let currentOffset = 0
        let node = walker.nextNode()

        while (node) {
            const nodeLength = node.nodeValue?.length || 0
            const nextOffset = currentOffset + nodeLength

            if (offset <= nextOffset) {
                const range = document.createRange()
                range.setStart(node, Math.max(0, Math.min(nodeLength, offset - currentOffset)))
                range.collapse(true)
                const selection = window.getSelection()
                selection.removeAllRanges()
                selection.addRange(range)
                selectionRef.current = range.cloneRange()
                return
            }

            currentOffset = nextOffset
            node = walker.nextNode()
        }

        placeCaretAtEnd()
    }

    const normalizeExistingAutoLinks = (editor) => {
        let changed = false
        const links = Array.from(editor.querySelectorAll('a'))

        links.forEach((link) => {
            applyAutoLinkStyle(link)
            const fullText = link.textContent || ''
            const whitespaceIndex = fullText.search(/\s/)
            let linkText = whitespaceIndex >= 0 ? fullText.slice(0, whitespaceIndex) : fullText
            let suffix = whitespaceIndex >= 0 ? fullText.slice(whitespaceIndex) : ''
            const splitText = splitAutoLinkText(linkText)
            linkText = splitText.linkText
            suffix = splitText.suffix + suffix

            if (!isAutoLinkText(linkText)) return

            const nextHref = normalizeAutoLinkHref(linkText)
            if (link.getAttribute('href') !== nextHref) {
                link.setAttribute('href', nextHref)
                changed = true
            }
            if (link.getAttribute('target') !== '_blank') {
                link.setAttribute('target', '_blank')
                changed = true
            }
            if (link.getAttribute('rel') !== 'noopener noreferrer') {
                link.setAttribute('rel', 'noopener noreferrer')
                changed = true
            }
            if (link.textContent !== linkText) {
                link.textContent = linkText
                changed = true
            }
            if (suffix) {
                link.after(document.createTextNode(suffix))
                changed = true
            }
        })

        return changed
    }

    const autoLinkEditorContent = () => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined' || typeof document === 'undefined') return false

        const caretOffset = getCaretTextOffset()
        const textNodes = []
        const walker = document.createTreeWalker(editor, window.NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.nodeValue || !node.nodeValue.trim()) return window.NodeFilter.FILTER_REJECT
                if (node.parentElement?.closest('a')) return window.NodeFilter.FILTER_REJECT
                return window.NodeFilter.FILTER_ACCEPT
            },
        })
        let currentNode = walker.nextNode()

        while (currentNode) {
            textNodes.push(currentNode)
            currentNode = walker.nextNode()
        }

        let changed = normalizeExistingAutoLinks(editor)
        const urlPattern = /\b((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?)/gi

        textNodes.forEach((node) => {
            const source = node.nodeValue || ''
            const fragment = document.createDocumentFragment()
            let lastIndex = 0
            let nodeChanged = false
            urlPattern.lastIndex = 0

            for (const match of source.matchAll(urlPattern)) {
                const rawMatch = match[0]
                const matchIndex = match.index || 0
                if (matchIndex > 0 && source[matchIndex - 1] === '@') continue

                const { linkText, suffix } = splitAutoLinkText(rawMatch)
                if (!isAutoLinkText(linkText)) continue

                fragment.append(document.createTextNode(source.slice(lastIndex, matchIndex)))
                fragment.append(createAutoLink(linkText))
                if (suffix) fragment.append(document.createTextNode(suffix))
                lastIndex = matchIndex + rawMatch.length
                nodeChanged = true
            }

            if (!nodeChanged) return

            fragment.append(document.createTextNode(source.slice(lastIndex)))
            node.replaceWith(fragment)
            changed = true
        })

        if (changed) restoreCaretTextOffset(caretOffset)
        return changed
    }

    const placeCaretAtEnd = () => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined') return
        const range = document.createRange()
        range.selectNodeContents(editor)
        range.collapse(false)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
        selectionRef.current = range.cloneRange()
    }

    const restoreSelection = () => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined') return
        editor.focus()
        if (!selectionRef.current || !editor.contains(selectionRef.current.commonAncestorContainer)) {
            placeCaretAtEnd()
            return
        }
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(selectionRef.current)
    }

    const runCommand = (command, commandValue = null) => {
        const editor = editorRef.current
        if (!editor || typeof document === 'undefined') return
        restoreSelection()
        document.execCommand(command, false, commandValue)
        emitChange()
        saveSelection()
    }

    const findCurrentBlock = () => {
        const editor = editorRef.current
        const selection = typeof window !== 'undefined' ? window.getSelection() : null
        const startNode = selection?.rangeCount ? selection.getRangeAt(0).startContainer : null
        let current = startNode?.nodeType === 1 ? startNode : startNode?.parentElement
        const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5'])

        while (current && current !== editor) {
            if (blockTags.has(current.tagName)) return current
            current = current.parentElement
        }

        return null
    }

    const replaceBlockTag = (tag) => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined') return
        const block = findCurrentBlock()
        const nextBlock = document.createElement(tag.toLowerCase())
        const source = block || editor

        while (source.firstChild) nextBlock.appendChild(source.firstChild)
        if (block) {
            block.replaceWith(nextBlock)
        } else {
            editor.appendChild(nextBlock)
        }

        const range = document.createRange()
        range.selectNodeContents(nextBlock)
        range.collapse(false)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
        selectionRef.current = range.cloneRange()
    }

    const applyHeading = (tag) => {
        const editor = editorRef.current
        if (!editor || typeof document === 'undefined') return
        restoreSelection()
        const normalizedTag = tag.toLowerCase()
        const commandValues = [normalizedTag, `<${normalizedTag}>`]
        let applied = false

        for (const commandValue of commandValues) {
            try {
                applied = document.execCommand('formatBlock', false, commandValue)
                if (applied) break
            } catch {
                applied = false
            }
        }

        if (!applied) replaceBlockTag(normalizedTag)
        emitChange()
        saveSelection()
        setHeadingOpen(false)
    }

    const placeCaretAfterNode = (node) => {
        if (!node || typeof window === 'undefined') return
        const range = document.createRange()
        range.selectNodeContents(node)
        range.collapse(false)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
        selectionRef.current = range.cloneRange()
    }

    const normalizeFontSizeMarkup = () => {
        const editor = editorRef.current
        if (!editor) return
        editor.querySelectorAll('font[size]').forEach((fontNode) => {
            const mappedSize = TEXT_SIZE_STYLES[Number(fontNode.getAttribute('size'))] || TEXT_SIZE_STYLES[3]
            const span = document.createElement('span')
            span.style.fontSize = mappedSize
            while (fontNode.firstChild) span.appendChild(fontNode.firstChild)
            fontNode.replaceWith(span)
        })
    }

    const wrapRangeWithTextSize = (range, fontSize) => {
        const span = document.createElement('span')
        span.style.fontSize = fontSize
        const fragment = range.extractContents()
        span.appendChild(fragment)
        range.insertNode(span)
        placeCaretAfterNode(span)
    }

    const wrapBlockWithTextSize = (block, fontSize) => {
        if (!block || !block.textContent?.trim()) return false
        const span = document.createElement('span')
        span.style.fontSize = fontSize
        while (block.firstChild) span.appendChild(block.firstChild)
        block.appendChild(span)
        placeCaretAfterNode(span)
        return true
    }

    const applyTextSize = (size) => {
        const editor = editorRef.current
        if (!editor || typeof document === 'undefined' || typeof window === 'undefined') return
        restoreSelection()
        const selection = window.getSelection()
        const fontSize = TEXT_SIZE_STYLES[Number(size)] || TEXT_SIZE_STYLES[3]

        if (selection?.rangeCount) {
            const range = selection.getRangeAt(0)
            if (!range.collapsed) {
                wrapRangeWithTextSize(range, fontSize)
            } else if (!wrapBlockWithTextSize(findCurrentBlock() || editor, fontSize)) {
                document.execCommand('fontSize', false, String(size))
                normalizeFontSizeMarkup()
            }
        } else {
            document.execCommand('fontSize', false, String(size))
            normalizeFontSizeMarkup()
        }

        emitChange()
        saveSelection()
        setSizeOpen(false)
    }

    const applyColor = (event) => runCommand('foreColor', event.target.value)

    const openLinkModal = () => {
        saveSelection()
        setLinkValue('')
        setLinkOpen(true)
        setHeadingOpen(false)
        setSizeOpen(false)
    }

    const closeLinkModal = () => {
        setLinkOpen(false)
        setLinkValue('')
    }

    const saveLink = () => {
        const editor = editorRef.current
        const rawUrl = linkValue.trim()
        if (!rawUrl || !editor || typeof window === 'undefined' || typeof document === 'undefined') return

        const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
        restoreSelection()

        let selection = window.getSelection()
        let range = selection?.rangeCount ? selection.getRangeAt(0) : null
        if (!range || !editor.contains(range.commonAncestorContainer)) {
            placeCaretAtEnd()
            selection = window.getSelection()
            range = selection?.rangeCount ? selection.getRangeAt(0) : null
        }

        if (!range) return

        const selectedText = selection?.toString()?.trim()
        const linkNode = document.createElement('a')
        linkNode.href = url
        linkNode.target = '_blank'
        linkNode.rel = 'noopener noreferrer'
        linkNode.textContent = selectedText || rawUrl
        applyAutoLinkStyle(linkNode)

        range.deleteContents()
        range.insertNode(linkNode)

        const spacer = document.createTextNode(' ')
        linkNode.after(spacer)

        const nextRange = document.createRange()
        nextRange.setStartAfter(spacer)
        nextRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(nextRange)
        selectionRef.current = nextRange.cloneRange()

        emitChange()
        closeLinkModal()
    }

    const getEditorLinkFromTarget = (target) => {
        const editor = editorRef.current
        const link = target?.nodeType === 1 ? target.closest('a') : target?.parentElement?.closest('a')

        if (!editor || !link || !editor.contains(link)) return null
        return link
    }

    const handleEditorLinkMouseDown = (event) => {
        if (event.button !== 0) return

        const link = getEditorLinkFromTarget(event.target)
        if (!link) return

        const href = link.getAttribute('href')
        if (!href) return

        event.preventDefault()
        event.stopPropagation()
        saveSelection()
        window.open(href, '_blank', 'noopener,noreferrer')
    }

    const handleEditorInput = () => {
        autoLinkEditorContent()
        emitChange()
        saveSelection()
    }

    const handleEditorKeyUp = () => {
        const changed = autoLinkEditorContent()
        if (changed) emitChange()
        saveSelection()
    }

    const handleEditorBlur = () => {
        autoLinkEditorContent()
        saveSelection()
        emitChange()
    }

    return (
        <div className="h-full">
            <div className="flex h-full min-h-[252px] max-h-[252px] flex-col overflow-hidden rounded-md bg-white">
                <div className={`flex min-h-11 shrink-0 flex-wrap items-center gap-1 rounded-t-md border border-[#D0D7DE] bg-[#F8FAFC] p-2 ${error ? 'border-red-400' : ''}`}>
                    <ToolbarIconButton onClick={() => runCommand('undo')}><Undo2 className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarIconButton onClick={() => runCommand('redo')}><Redo2 className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarDivider />
                    <div className="relative">
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setHeadingOpen((current) => !current); setSizeOpen(false) }} className="inline-flex h-8 items-center gap-1 rounded border border-[#D9D9D9] bg-white px-2 text-sm text-[#434547] transition hover:bg-[#F0F5FF]">
                            H <ChevronDown className={`h-3.5 w-3.5 transition-transform ${headingOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {headingOpen && (
                            <div className="absolute left-0 top-full z-[80] mt-1 w-16 overflow-hidden rounded-md border border-[#E5E7EB] bg-white py-1 shadow-lg">
                                {headingOptions.map((option) => (
                                    <button key={option.value} type="button" onMouseDown={(event) => { event.preventDefault(); applyHeading(option.value) }} className="block w-full px-3 py-1.5 text-left text-sm text-[#1F1F1F] transition hover:bg-[#F0F5FF] hover:text-[#2F54EB]">
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSizeOpen((current) => !current); setHeadingOpen(false) }} className="inline-flex h-8 items-center gap-1 rounded border border-[#D9D9D9] bg-white px-2 text-sm text-[#434547] transition hover:bg-[#F0F5FF]">
                            <Type className="h-4 w-4" /> <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sizeOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {sizeOpen && (
                            <div className="absolute left-0 top-full z-[80] mt-1 max-h-64 w-28 overflow-y-auto rounded-md border border-[#E5E7EB] bg-white py-1 shadow-lg">
                                {sizeOptions.map((size) => (
                                    <button key={size} type="button" onMouseDown={(event) => { event.preventDefault(); applyTextSize(size) }} className="block w-full px-3 py-1.5 text-left text-sm text-[#1F1F1F] transition hover:bg-[#F0F5FF] hover:text-[#2F54EB]">
                                        Size {size}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <input type="color" defaultValue="#000000" onChange={applyColor} className="ml-1 h-7 w-7 cursor-pointer rounded border border-[#D9D9D9] bg-white p-0" aria-label="Màu chữ" />
                    <ToolbarDivider />
                    <ToolbarIconButton onClick={() => runCommand('bold')}><Bold className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarIconButton onClick={() => runCommand('italic')}><Italic className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarIconButton onClick={() => runCommand('underline')}><Underline className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarDivider />
                    <ToolbarIconButton onClick={openLinkModal}><Link2 className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarDivider />
                    <ToolbarIconButton onClick={() => runCommand('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarIconButton onClick={() => runCommand('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarDivider />
                    <ToolbarIconButton onClick={() => runCommand('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarIconButton onClick={() => runCommand('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolbarIconButton>
                    <ToolbarIconButton onClick={() => runCommand('justifyRight')}><AlignRight className="h-4 w-4" /></ToolbarIconButton>
                </div>
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onMouseDown={handleEditorLinkMouseDown}
                    onBlur={handleEditorBlur}
                    onKeyUp={handleEditorKeyUp}
                    onMouseUp={saveSelection}
                    className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-b-md border border-t-0 bg-white p-3 text-sm leading-6 text-[#1F2937] outline-none transition focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20 ${RICH_TEXT_CONTENT_CLASS_NAME} ${error ? 'border-red-400' : 'border-[#D0D7DE]'}`}
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

            {linkOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-[512px] overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
                            <h3 className="text-lg font-semibold text-[#111827]">Nhập URL</h3>
                            <button type="button" onClick={closeLinkModal} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#98A2B3] transition hover:bg-[#F2F4F7] hover:text-[#475467]" aria-label="Đóng">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-6 py-6">
                            <input
                                value={linkValue}
                                onChange={(event) => setLinkValue(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveLink() } }}
                                autoFocus
                                placeholder="Nhập đường dẫn"
                                className="h-10 w-full rounded-md border border-[#D0D5DD] px-3 text-sm outline-none transition focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] bg-white px-6 py-4">
                            <button type="button" onClick={closeLinkModal} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-4 text-sm font-medium text-[#344054] transition hover:bg-[#F9FAFB]">
                                <X className="h-4 w-4" />
                                Đóng
                            </button>
                            <button type="button" onClick={saveLink} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#597EF7] px-4 text-sm font-medium text-white transition hover:bg-[#2F54EB]">
                                <Save className="h-4 w-4" />
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default function MonumentCreateModal({ open, onClose, onSaved, profileType = MonumentProfileConstants.types.public, itemId }) {
    const toast = useToast()
    const [form, setForm] = useState(createInitialForm)
    const [sectionType, setSectionType] = useState(MonumentSectionConstants.types.image)
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const onCloseRef = useRef(onClose)
    const isEditing = !!itemId
    const isPrivateProfile = Number(profileType) === Number(MonumentProfileConstants.types.private)

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        if (!open) {
            setForm(createInitialForm())
            setErrors({})
            setSubmitting(null)
            setLoadingDetail(false)
            return
        }

        if (!itemId) {
            setForm(createInitialForm())
            setErrors({})
            setLoadingDetail(false)
            return
        }

        let mounted = true
        const loadDetail = async () => {
            setLoadingDetail(true)
            setErrors({})
            try {
                const response = await monumentApi.getMonument({ id: itemId })
                const data = response?.data || {}
                const monument = data.monument
                const files = data.monumentFiles || []
                const sections = data.monumentSections || []

                if (!mounted || !monument) return

                const filesByMode = (mode) => files.filter((file) => Number(file.mode) === Number(mode)).map(toExistingFile)
                setForm({
                    ...createInitialForm(),
                    name: monument.name || '',
                    recognitionDecision: monument.recognitionDecision || '',
                    address: monument.address || '',
                    yearOfConstruction: monument.yearOfConstruction || '',
                    location: monument.location || '',
                    rating: Number(monument.rating ?? 0),
                    typeOfMonument: Number(monument.typeOfMonument ?? 0),
                    priorityMode: Number(monument.priorityMode ?? 0),
                    description: monument.description || '',
                    sections: sections.map(toExistingSection),
                    fileRecognitionDecisions: filesByMode(MonumentFileConstants.modes.fileRecognitionDecision),
                    fileRatings: filesByMode(MonumentFileConstants.modes.fileRating),
                    fileAvatars: filesByMode(MonumentFileConstants.modes.imageAvatar),
                    fileImageObjects: filesByMode(MonumentFileConstants.modes.imageObject),
                    fileImageDetails: filesByMode(MonumentFileConstants.modes.imageDetail),
                    fileVideos: filesByMode(MonumentFileConstants.modes.fileVideo),
                    fileModel3Ds: filesByMode(MonumentFileConstants.modes.fileModel3D),
                    fileAvatar2s: filesByMode(MonumentFileConstants.modes.imageAvatar2),
                    fileStructures: filesByMode(MonumentFileConstants.modes.fileStructure),
                    fileImageTechs: filesByMode(MonumentFileConstants.modes.imageTech),
                    fileMaps: filesByMode(MonumentFileConstants.modes.fileMap),
                })
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Không tải được hồ sơ di tích')
                onCloseRef.current?.()
            } finally {
                if (mounted) setLoadingDetail(false)
            }
        }

        loadDetail()
        return () => {
            mounted = false
        }
    }, [itemId, open, toast])

    if (!open) return null

    const setValue = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }))
        setErrors((current) => ({ ...current, [name]: undefined }))
    }

    const onChangeInput = (event) => {
        const { name, value } = event.target
        setValue(name, value)
    }

    const setFiles = (name) => (nextFiles, warningMessage) => {
        if (warningMessage) {
            toast.warning(warningMessage)
            return
        }

        setForm((current) => {
            const previousFiles = Array.isArray(current[name]) ? current[name] : []
            const nextExistingIds = new Set((nextFiles || [])
                .filter((file) => file?.isExisting && file?.id)
                .map((file) => String(file.id)))
            const removedIds = previousFiles
                .filter((file) => file?.isExisting && file?.id && !nextExistingIds.has(String(file.id)))
                .map((file) => String(file.id))
            const deletedFileIds = [...(current.deletedFileIds || [])]

            removedIds.forEach((id) => {
                if (!deletedFileIds.includes(id)) deletedFileIds.push(id)
            })

            return { ...current, [name]: nextFiles || [], deletedFileIds }
        })
        setErrors((current) => ({ ...current, [name]: undefined }))
    }

    const addSection = () => {
        setForm((current) => ({
            ...current,
            sections: [
                ...current.sections,
                { id: uuidv4(), type: sectionType, content: '', file: null },
            ],
        }))
        setErrors((current) => ({ ...current, sections: undefined }))
    }

    const updateSection = (id, patch) => {
        setForm((current) => {
            const deletedSectionFileIds = [...(current.deletedSectionFileIds || [])]
            const sections = current.sections.map((section) => {
                if (section.id !== id) return section

                if (Object.prototype.hasOwnProperty.call(patch, 'file')) {
                    const previousFile = section.file
                    const nextFile = patch.file
                    const keepsSameExistingFile = previousFile?.isExisting && nextFile?.isExisting && String(previousFile.id) === String(nextFile.id)

                    if (previousFile?.isExisting && previousFile?.id && !keepsSameExistingFile) {
                        const fileId = String(previousFile.id)
                        if (!deletedSectionFileIds.includes(fileId)) deletedSectionFileIds.push(fileId)
                    }
                }

                return { ...section, ...patch }
            })

            return { ...current, sections, deletedSectionFileIds }
        })
    }

    const removeSection = (id) => {
        setForm((current) => {
            const deletedSectionFileIds = [...(current.deletedSectionFileIds || [])]
            const removedSection = current.sections.find((section) => section.id === id)

            if (removedSection?.file?.isExisting && removedSection.file.id) {
                const fileId = String(removedSection.file.id)
                if (!deletedSectionFileIds.includes(fileId)) deletedSectionFileIds.push(fileId)
            }

            return {
                ...current,
                sections: current.sections.filter((section) => section.id !== id),
                deletedSectionFileIds,
            }
        })
    }

    const validate = () => {
        const nextErrors = {}
        if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên di tích'
        if (!form.recognitionDecision.trim()) nextErrors.recognitionDecision = 'Vui lòng nhập quyết định công nhận'
        if (!form.address.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ'
        if (!form.yearOfConstruction.trim()) nextErrors.yearOfConstruction = 'Vui lòng nhập năm xây dựng'
        if (!form.location.trim()) nextErrors.location = 'Vui lòng nhập vị trí'
        if (form.rating === '' || form.rating === null || form.rating === undefined) nextErrors.rating = 'Vui lòng chọn xếp hạng'

        if (isPrivateProfile) {
            if (!form.description.trim()) nextErrors.description = 'Vui lòng nhập nội dung'
            if (!form.fileAvatar2s.length) nextErrors.fileAvatar2s = 'Vui lòng chọn hình đại diện'
            if (!form.fileStructures.length) nextErrors.fileStructures = 'Vui lòng chọn tệp kiến trúc'
            if (!form.fileImageTechs.length) nextErrors.fileImageTechs = 'Vui lòng chọn hình ảnh bản vẽ kỹ thuật'
            if (!form.fileMaps.length) nextErrors.fileMaps = 'Vui lòng chọn bản đồ khoanh vùng'
        } else {
            if (!form.sections.length) nextErrors.sections = 'Vui lòng thêm section nội dung'

            form.sections.forEach((section, index) => {
                const key = section.id || index
                if ([1, 2, 3].includes(Number(section.type)) && !section.content.trim()) {
                    nextErrors[`section_${key}_content`] = 'Vui lòng nhập nội dung section'
                }
                if ([0, 1, 3].includes(Number(section.type)) && !section.file) {
                    nextErrors[`section_${key}_file`] = 'Vui lòng chọn hình ảnh section'
                }
            })

            if (!form.fileAvatars.length) nextErrors.fileAvatars = 'Vui lòng chọn hình đại diện'
            if (!form.fileModel3Ds.length) nextErrors.fileModel3Ds = 'Vui lòng chọn tệp GLB/3D'
            if (!form.fileImageDetails.length) nextErrors.fileImageDetails = 'Vui lòng chọn hình ảnh chi tiết'
            if (!form.fileVideos.length) nextErrors.fileVideos = 'Vui lòng chọn video'
        }

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const buildFormData = () => {
        const body = new FormData()
        if (itemId) body.append('id', itemId)
        body.append('name', form.name.trim())
        body.append('recognitionDecision', form.recognitionDecision.trim())
        body.append('address', form.address.trim())
        body.append('yearOfConstruction', form.yearOfConstruction.trim())
        body.append('location', form.location.trim())
        body.append('rating', String(form.rating))
        body.append('typeOfMonument', String(form.typeOfMonument))
        body.append('priorityMode', String(form.priorityMode))
        body.append('description', form.description || '')
        body.append('type', String(profileType))
        body.append('submitForApproval', 'false')
        body.append('deletedFileIds', JSON.stringify(form.deletedFileIds || []))
        body.append('deletedSectionFileIds', JSON.stringify(form.deletedSectionFileIds || []))

        const sectionsPayload = isPrivateProfile ? [] : form.sections.map((section, index) => ({
            id: section.id,
            type: Number(section.type),
            content: section.content,
            order: index + 1,
        }))
        body.append('sections', JSON.stringify(sectionsPayload))

        if (!isPrivateProfile) {
            form.sections.forEach((section, index) => {
                if (isNativeFile(section.file)) {
                    body.append(`sections[${index}][file]`, section.file)
                }
            })
        }

        const publicFileBuckets = [
            'fileRecognitionDecisions',
            'fileRatings',
            'fileAvatars',
            'fileImageObjects',
            'fileImageDetails',
            'fileVideos',
            'fileModel3Ds',
        ]
        const privateFileBuckets = [
            'fileRecognitionDecisions',
            'fileRatings',
            'fileAvatar2s',
            'fileVideos',
            'fileModel3Ds',
            'fileStructures',
            'fileImageTechs',
            'fileMaps',
        ]
        const fileBuckets = isPrivateProfile ? privateFileBuckets : publicFileBuckets
        fileBuckets.forEach((bucket) => {
            form[bucket].filter(isNativeFile).forEach((file) => body.append(bucket, file))
        })
        return body
    }
    const submit = async () => {
        if (!validate()) {
            toast.warning('Vui lòng kiểm tra lại thông tin hồ sơ')
            return
        }

        setSubmitting('draft')
        try {
            const response = isEditing
                ? await monumentApi.updateMonument(buildFormData())
                : await monumentApi.createMonument(buildFormData())
            toast.success(response?.message || (isEditing ? 'Đã cập nhật hồ sơ' : 'Đã lưu tạm hồ sơ'))
            notifyMonumentProfileUpdated()
            setForm(createInitialForm())
            setErrors({})
            onSaved?.()
            onClose?.()
        } catch (error) {
            const response = error?.response?.data
            if (response?.errors) setErrors(response.errors)
            toast.error(response?.message || 'Không lưu được hồ sơ di tích')
        } finally {
            setSubmitting(null)
        }
    }

    const validateModel3D = (file) => {
        const ext = getExtension(file.name)
        return MODEL_3D_EXTENSIONS.includes(ext) ? null : 'Định dạng 3D chỉ hỗ trợ .stl, .obj, .fbx, .gltf, .glb'
    }

    const validateImage = (file) => {
        const ext = getExtension(file.name)
        return IMAGE_EXTENSIONS.includes(ext) ? null : 'Tệp hình ảnh không đúng định dạng hỗ trợ'
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative flex max-h-[calc(100vh-48px)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-center border-b border-[#F0F0F0] px-4 py-4">
                    <h2 className="text-lg font-semibold text-[#1F1F1F]">Tải di tích lên</h2>
                </div>

                {loadingDetail ? (
                    <div className="flex min-h-[360px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597EF7]" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        <div className="grid grid-cols-1 gap-5">
                            <Field label="Tên di tích" required error={errors.name}>
                                <Input name="name" value={form.name} onChange={onChangeInput} error={!!errors.name} />
                            </Field>
                        </div>

                        <Divider />

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Quyết định công nhận" required error={errors.recognitionDecision}>
                                <Input name="recognitionDecision" value={form.recognitionDecision} onChange={onChangeInput} error={!!errors.recognitionDecision} />
                            </Field>
                            <div className="md:pt-6">
                                <UploadBucket id="fileRecognitionDecisions" files={form.fileRecognitionDecisions} onChange={setFiles('fileRecognitionDecisions')} accept={ACCEPTS.all} error={errors.fileRecognitionDecisions} />
                            </div>
                        </div>

                        <Divider />

                        <div>
                            <Field label="Địa chỉ" required error={errors.address}>
                                <Input name="address" value={form.address} onChange={onChangeInput} error={!!errors.address} />
                            </Field>
                        </div>

                        <Divider />

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Năm xây dựng" required error={errors.yearOfConstruction}>
                                <Input name="yearOfConstruction" value={form.yearOfConstruction} onChange={onChangeInput} error={!!errors.yearOfConstruction} />
                            </Field>
                            <Field label="Vị trí" required error={errors.location}>
                                <Input name="location" value={form.location} onChange={onChangeInput} error={!!errors.location} />
                            </Field>
                        </div>

                        <Divider />

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Xếp hạng" required error={errors.rating}>
                                <Select
                                    name="rating"
                                    value={form.rating}
                                    onChange={(event) => setValue('rating', event.target.value === '' ? '' : Number(event.target.value))}
                                    options={MonumentProfileConstants.ratingOptions}
                                    searchable={false}
                                    placeholder="-- Chọn --"
                                    showPlaceholderOption={false}
                                />
                            </Field>
                            <div className="md:pt-6">
                                <UploadBucket id="fileRatings" files={form.fileRatings} onChange={setFiles('fileRatings')} accept={ACCEPTS.all} error={errors.fileRatings} />
                            </div>
                        </div>

                        <Divider />

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Loại di tích" required>
                                <div className="flex flex-col gap-3 pt-1">
                                    {MonumentProfileConstants.ratingOptions.map((option) => (
                                        <RadioOption key={option.value} name="typeOfMonument" value={option.value} checked={form.typeOfMonument === option.value} onChange={(value) => setValue('typeOfMonument', value)} label={option.label} />
                                    ))}
                                </div>
                            </Field>
                            <Field label="Chế độ ưu tiên" required>
                                <div className="flex flex-col gap-3 pt-1">
                                    {MonumentProfileConstants.priorityModeOptions.map((option) => (
                                        <RadioOption key={option.value} name="priorityMode" value={option.value} checked={form.priorityMode === option.value} onChange={(value) => setValue('priorityMode', value)} label={option.label} />
                                    ))}
                                </div>
                            </Field>
                        </div>

                        <Divider />

                        <div className="flex items-center justify-between">
                            <div className="inline-flex rounded-lg border border-[#ADC6FF] p-1">
                                <button type="button" className="rounded-md bg-[#F0F5FF] px-3 py-2 text-sm font-medium text-[#597EF7]">
                                    {isPrivateProfile ? 'Bí mật' : 'Công khai'}
                                </button>
                            </div>
                        </div>

                        {isPrivateProfile ? (
                            <>
                                <div className="mt-4">
                                    <Field label="Nội dung" required error={errors.description}>
                                        <textarea
                                            name="description"
                                            value={form.description}
                                            onChange={onChangeInput}
                                            className={`min-h-[160px] w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20 ${errors.description ? 'border-red-400' : 'border-gray-300'}`}
                                        />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Field label="Hình đại diện" required>
                                        <UploadBucket id="fileAvatar2s" files={form.fileAvatar2s} onChange={setFiles('fileAvatar2s')} accept={ACCEPTS.image} multiple={false} validateFile={validateImage} error={errors.fileAvatar2s} />
                                    </Field>
                                    <Field label="Hình ảnh/Video 3D xoay 360">
                                        <UploadBucket id="fileVideos" files={form.fileVideos} onChange={setFiles('fileVideos')} accept={`${ACCEPTS.image},${ACCEPTS.video}`} error={errors.fileVideos} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5">
                                    <Field label="Định dạng 3D">
                                        <UploadBucket id="fileModel3Ds" files={form.fileModel3Ds} onChange={setFiles('fileModel3Ds')} accept={ACCEPTS.model3d} validateFile={validateModel3D} error={errors.fileModel3Ds} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Field label="Kiến trúc" required>
                                        <UploadBucket id="fileStructures" files={form.fileStructures} onChange={setFiles('fileStructures')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileStructures} />
                                    </Field>
                                    <Field label="Hình ảnh bản vẽ kỹ thuật" required>
                                        <UploadBucket id="fileImageTechs" files={form.fileImageTechs} onChange={setFiles('fileImageTechs')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageTechs} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5">
                                    <Field label="Bản đồ khoanh vùng" required>
                                        <UploadBucket id="fileMaps" files={form.fileMaps} onChange={setFiles('fileMaps')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileMaps} />
                                    </Field>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mt-4">
                                    <Field label="Nội dung" required error={errors.sections}>
                                        <div className="space-y-3">
                                            {form.sections.map((section, index) => {
                                                const sectionKey = section.id || index
                                                const sectionTypeValue = Number(section.type)
                                                const needsImage = [0, 1, 3].includes(sectionTypeValue)
                                                const needsContent = [1, 2, 3].includes(sectionTypeValue)
                                                const imageFirst = sectionTypeValue !== MonumentSectionConstants.types.contentImage
                                                const fileError = errors[`section_${sectionKey}_file`]
                                                const contentError = errors[`section_${sectionKey}_content`]
                                                const imageSlot = needsImage ? (
                                                    <UploadBucket
                                                        id={`section-${section.id}`}
                                                        files={section.file ? [section.file] : []}
                                                        onChange={(files, warningMessage) => {
                                                            if (warningMessage) {
                                                                toast.warning(warningMessage)
                                                                return
                                                            }
                                                            updateSection(section.id, { file: files[0] || null })
                                                        }}
                                                        accept={ACCEPTS.image}
                                                        multiple={false}
                                                        validateFile={validateImage}
                                                        error={fileError}
                                                        bucketClassName={needsContent ? 'h-full min-h-[252px]' : ''}
                                                        bodyClassName={needsContent ? 'min-h-[242px]' : ''}
                                                        showImagePreview
                                                    />
                                                ) : null
                                                const contentSlot = needsContent ? (
                                                    <SectionTextEditor
                                                        value={section.content}
                                                        onChange={(content) => updateSection(section.id, { content })}
                                                        error={contentError}
                                                    />
                                                ) : null

                                                return (
                                                    <div key={section.id} className="group relative mt-3 rounded-md border border-[#D9D9D9] bg-white p-3 pt-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                                        <button type="button" onClick={() => removeSection(section.id)} className="absolute right-3 top-0 z-10 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#FFE1E1] bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-[#F5222D]" aria-label="Xóa section">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <div className={`grid grid-cols-1 items-stretch gap-2 ${needsImage && needsContent ? 'md:grid-cols-2' : ''}`}>
                                                            {imageFirst ? (
                                                                <>
                                                                    {imageSlot}
                                                                    {contentSlot}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {contentSlot}
                                                                    {imageSlot}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="mt-3 rounded-md border border-[#BFBFBF] bg-white p-8 text-center">
                                            <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-lg border border-[#2F54EB] bg-[#F0F5FF] px-3 py-2 text-sm font-medium text-[#2F54EB] transition duration-150 hover:bg-[#2F54EB] hover:text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#597EF7]/30">
                                                <Plus className="h-4 w-4" />
                                                Thêm section
                                            </button>
                                            <div className="mx-auto mt-6 grid max-w-[560px] grid-cols-1 gap-3 text-left md:grid-cols-2">
                                                {MonumentSectionConstants.options.map((option) => (
                                                    <RadioOption key={option.value} name="sectionType" value={option.value} checked={sectionType === option.value} onChange={setSectionType} label={option.label} />
                                                ))}
                                            </div>
                                        </div>
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Field label="Hình đại diện" required>
                                        <UploadBucket id="fileAvatars" files={form.fileAvatars} onChange={setFiles('fileAvatars')} accept={ACCEPTS.image} multiple={false} validateFile={validateImage} error={errors.fileAvatars} />
                                    </Field>
                                    <Field label="Hình ảnh hiện vật">
                                        <UploadBucket id="fileImageObjects" files={form.fileImageObjects} onChange={setFiles('fileImageObjects')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageObjects} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5">
                                    <Field label="Định dạng 3D" required>
                                        <UploadBucket id="fileModel3Ds" files={form.fileModel3Ds} onChange={setFiles('fileModel3Ds')} accept={ACCEPTS.model3d} validateFile={validateModel3D} error={errors.fileModel3Ds} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Field label="Hình ảnh chi tiết" required>
                                        <UploadBucket id="fileImageDetails" files={form.fileImageDetails} onChange={setFiles('fileImageDetails')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageDetails} />
                                    </Field>
                                    <Field label="Video" required>
                                        <UploadBucket id="fileVideos" files={form.fileVideos} onChange={setFiles('fileVideos')} accept={ACCEPTS.video} error={errors.fileVideos} />
                                    </Field>
                                </div>
                            </>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-end gap-3 border-t border-[#F0F0F0] px-4 py-4">
                    <Button variant="outline" onClick={onClose} disabled={!!submitting}>
                        <X className="h-4 w-4" />
                        Đóng
                    </Button>
                    <Button variant="outline" onClick={() => submit()} loading={submitting === 'draft'} disabled={!!submitting || loadingDetail}>
                        <Save className="h-4 w-4" />
                        Lưu tạm
                    </Button>
                </div>
            </div>
        </div>
    )
}