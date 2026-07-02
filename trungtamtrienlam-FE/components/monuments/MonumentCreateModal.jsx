'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/contexts/ToastContext'
import { MonumentFileConstants, MonumentProfileConstants, MonumentSectionConstants } from '@/constants/monumentConstants'
import { buildMediaUrl } from '@/lib/mediaUrl'
import * as monumentApi from '@/lib/api/monumentsApi'

const ACCEPTS = {
    image: '.png,.jpg,.jpeg,.bmp,.gif,.webp,.svg,.arw,.dng,image/*',
    video: '.mp4,.m4a,.avi,.mkv,.mov,.wmv,.flv,.webm,video/*',
    document: '.doc,.docx,.pdf,.xls,.xlsx',
    model3d: '.stl,.obj,.fbx,.gltf,.glb',
}

const MODEL_3D_EXTENSIONS = ['.stl', '.obj', '.fbx', '.gltf', '.glb']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.svg', '.arw', '.dng']

const createInitialForm = () => ({
    name: '',
    recognitionDecision: '',
    address: '',
    yearOfConstruction: '',
    location: '',
    rating: 0,
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
})

function getExtension(fileName = '') {
    const index = fileName.lastIndexOf('.')
    return index >= 0 ? fileName.slice(index).toLowerCase() : ''
}

function isNativeFile(file) {
    return typeof File !== 'undefined' && file instanceof File
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

function UploadBucket({ id, files, onChange, title, accept, multiple = true, error, validateFile }) {
    const inputRef = useRef(null)
    const [dragOver, setDragOver] = useState(false)

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
        onChange(files.filter((_, itemIndex) => itemIndex !== index))
    }

    return (
        <div>
            {title && <p className="mb-2 text-sm font-semibold text-[#434547]">{title}</p>}
            <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
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
                className={`min-h-[118px] cursor-pointer rounded-md border border-dashed p-4 transition ${dragOver ? 'border-[#597EF7] bg-[#F0F5FF]' : error ? 'border-red-400' : 'border-[#D9D9D9] hover:border-[#597EF7]'}`}
            >
                <div className="flex min-h-[86px] flex-col items-center justify-center text-center">
                    <Upload className="mb-2 h-5 w-5 text-[#597EF7]" />
                    <p className="text-sm font-medium text-[#597EF7]">Tải lên từ máy tính</p>
                    <p className="mt-1 text-xs text-[#8C8C8C]">Hoặc kéo và thả tập tin tại đây</p>
                </div>
            </div>
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
            {files.length > 0 && (
                <div className="mt-2 space-y-2">
                    {files.map((file, index) => (
                        <div key={`${file.name}-${file.size || file.id || index}-${index}`} className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm">
                            <div className="flex min-w-0 items-center gap-2 text-[#434547]">
                                <FileText className="h-4 w-4 flex-shrink-0 text-[#597EF7]" />
                                <span className="truncate">{file.name}</span>
                                {file.isExisting && <span className="flex-shrink-0 rounded bg-[#F0F5FF] px-2 py-0.5 text-xs text-[#597EF7]">Đã tải lên</span>}
                            </div>
                            {!file.isExisting && (
                                <button type="button" onClick={() => removeFile(index)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Xóa tệp">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
    const isEditing = !!itemId

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
                })
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Không tải được hồ sơ di tích')
                onClose?.()
            } finally {
                if (mounted) setLoadingDetail(false)
            }
        }

        loadDetail()
        return () => {
            mounted = false
        }
    }, [itemId, onClose, open, toast])

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
        setValue(name, nextFiles)
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
        setForm((current) => ({
            ...current,
            sections: current.sections.map((section) => section.id === id ? { ...section, ...patch } : section),
        }))
    }

    const removeSection = (id) => {
        setForm((current) => ({
            ...current,
            sections: current.sections.filter((section) => section.id !== id),
        }))
    }

    const validate = () => {
        const nextErrors = {}
        if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên di tích'
        if (!form.recognitionDecision.trim()) nextErrors.recognitionDecision = 'Vui lòng nhập quyết định công nhận'
        if (!form.address.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ'
        if (!form.yearOfConstruction.trim()) nextErrors.yearOfConstruction = 'Vui lòng nhập năm xây dựng'
        if (!form.location.trim()) nextErrors.location = 'Vui lòng nhập vị trí'
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
        body.append('sections', JSON.stringify(form.sections.map((section, index) => ({
            id: section.id,
            type: Number(section.type),
            content: section.content,
            order: index + 1,
        }))))

        form.sections.forEach((section, index) => {
            if (isNativeFile(section.file)) {
                body.append(`sections[${index}][file]`, section.file)
            }
        })

        const fileBuckets = [
            'fileRecognitionDecisions',
            'fileRatings',
            'fileAvatars',
            'fileImageObjects',
            'fileImageDetails',
            'fileVideos',
            'fileModel3Ds',
        ]
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
            <div className="relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#F0F0F0] px-6 py-4">
                    <h2 className="text-lg font-semibold text-[#1F1F1F]">Tải di tích lên</h2>
                    <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Đóng">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loadingDetail ? (
                    <div className="flex min-h-[360px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597EF7]" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Tên di tích" required error={errors.name}>
                                <Input name="name" value={form.name} onChange={onChangeInput} error={!!errors.name} />
                            </Field>
                            <Field label="Quyết định công nhận" required error={errors.recognitionDecision}>
                                <Input name="recognitionDecision" value={form.recognitionDecision} onChange={onChangeInput} error={!!errors.recognitionDecision} />
                                <div className="mt-3">
                                    <UploadBucket id="fileRecognitionDecisions" files={form.fileRecognitionDecisions} onChange={setFiles('fileRecognitionDecisions')} accept={ACCEPTS.document} />
                                </div>
                            </Field>
                        </div>

                        <div className="mt-5">
                            <Field label="Địa chỉ" required error={errors.address}>
                                <Input name="address" value={form.address} onChange={onChangeInput} error={!!errors.address} />
                            </Field>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Năm xây dựng" required error={errors.yearOfConstruction}>
                                <Input name="yearOfConstruction" value={form.yearOfConstruction} onChange={onChangeInput} error={!!errors.yearOfConstruction} />
                            </Field>
                            <Field label="Vị trí" required error={errors.location}>
                                <Input name="location" value={form.location} onChange={onChangeInput} error={!!errors.location} />
                            </Field>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Xếp hạng" required error={errors.rating}>
                                <Select
                                    name="rating"
                                    value={form.rating}
                                    onChange={(event) => setValue('rating', Number(event.target.value))}
                                    options={MonumentProfileConstants.ratingOptions}
                                    searchable={false}
                                />
                                <div className="mt-3">
                                    <UploadBucket id="fileRatings" files={form.fileRatings} onChange={setFiles('fileRatings')} accept={ACCEPTS.document} />
                                </div>
                            </Field>
                            <Field label="Loại di tích" required>
                                <div className="space-y-2 pt-2">
                                    {MonumentProfileConstants.ratingOptions.map((option) => (
                                        <RadioOption key={option.value} name="typeOfMonument" value={option.value} checked={form.typeOfMonument === option.value} onChange={(value) => setValue('typeOfMonument', value)} label={option.label} />
                                    ))}
                                </div>
                            </Field>
                        </div>

                        <div className="mt-5">
                            <Field label="Chế độ ưu tiên" required>
                                <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-3">
                                    {MonumentProfileConstants.priorityModeOptions.map((option) => (
                                        <RadioOption key={option.value} name="priorityMode" value={option.value} checked={form.priorityMode === option.value} onChange={(value) => setValue('priorityMode', value)} label={option.label} />
                                    ))}
                                </div>
                            </Field>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-[#F0F0F0] pt-4">
                            <div className="inline-flex rounded-lg border border-[#ADC6FF] p-1">
                                <button type="button" className="rounded-md bg-[#F0F5FF] px-3 py-2 text-sm font-medium text-[#597EF7]">Công khai</button>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Field label="Nội dung" required error={errors.sections}>
                                <div className="space-y-4">
                                    {form.sections.map((section, index) => {
                                        const sectionKey = section.id || index
                                        const needsImage = [0, 1, 3].includes(Number(section.type))
                                        const needsContent = [1, 2, 3].includes(Number(section.type))
                                        return (
                                            <div key={section.id} className="rounded-md border border-[#E5E7EB] p-3">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-[#434547]">Section {index + 1}</p>
                                                    <button type="button" onClick={() => removeSection(section.id)} className="inline-flex items-center rounded p-1 text-red-500 hover:bg-red-50" aria-label="Xóa section">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {needsImage && (
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
                                                        error={errors[`section_${sectionKey}_file`]}
                                                    />
                                                )}
                                                {needsContent && (
                                                    <div className="mt-3">
                                                        <textarea
                                                            value={section.content}
                                                            onChange={(event) => updateSection(section.id, { content: event.target.value })}
                                                            className={`min-h-[130px] w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20 ${errors[`section_${sectionKey}_content`] ? 'border-red-400' : 'border-gray-300'}`}
                                                        />
                                                        {errors[`section_${sectionKey}_content`] && <p className="mt-1 text-xs text-red-500">{errors[`section_${sectionKey}_content`]}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="mt-3 rounded-md border border-[#BFBFBF] bg-white p-6 text-center">
                                    <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-lg border border-[#2F54EB] bg-[#F0F5FF] px-3 py-2 text-sm font-medium text-[#2F54EB]">
                                        <Plus className="h-4 w-4" />
                                        Thêm section
                                    </button>
                                    <div className="mt-5 grid grid-cols-1 gap-3 text-left md:grid-cols-2">
                                        {MonumentSectionConstants.options.map((option) => (
                                            <RadioOption key={option.value} name="sectionType" value={option.value} checked={sectionType === option.value} onChange={setSectionType} label={option.label} />
                                        ))}
                                    </div>
                                </div>
                            </Field>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Hình đại diện" required error={errors.fileAvatars}>
                                <UploadBucket id="fileAvatars" files={form.fileAvatars} onChange={setFiles('fileAvatars')} accept={ACCEPTS.image} multiple={false} validateFile={validateImage} error={errors.fileAvatars} />
                            </Field>
                            <Field label="Hình ảnh hiện vật" error={errors.fileImageObjects}>
                                <UploadBucket id="fileImageObjects" files={form.fileImageObjects} onChange={setFiles('fileImageObjects')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageObjects} />
                            </Field>
                        </div>

                        <div className="mt-5">
                            <Field label="Định dạng 3D" required error={errors.fileModel3Ds}>
                                <UploadBucket id="fileModel3Ds" files={form.fileModel3Ds} onChange={setFiles('fileModel3Ds')} accept={ACCEPTS.model3d} validateFile={validateModel3D} error={errors.fileModel3Ds} />
                            </Field>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="Hình ảnh chi tiết" required error={errors.fileImageDetails}>
                                <UploadBucket id="fileImageDetails" files={form.fileImageDetails} onChange={setFiles('fileImageDetails')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageDetails} />
                            </Field>
                            <Field label="Video mp4" error={errors.fileVideos}>
                                <UploadBucket id="fileVideos" files={form.fileVideos} onChange={setFiles('fileVideos')} accept={ACCEPTS.video} error={errors.fileVideos} />
                            </Field>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-[#F0F0F0] px-6 py-4">
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