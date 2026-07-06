'use client'

import { useEffect, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, FileText, Italic, Link2, List, ListOrdered, Plus, Redo2, Save, Trash2, Type, Underline, Undo2, Upload, X } from 'lucide-react'
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

const MODEL_3D_EXTENSIONS = ['.stl', '.obj', '.fbx', '.gltf', '.glb']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.svg', '.arw', '.dng']

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

function Divider() {
    return <div className="my-3 h-px w-full bg-[#F0F0F0]" />
}

const RICH_TEXT_CONTENT_CLASS_NAME = '[&_p]:my-2 [&_div]:my-2 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-base [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:text-sm [&_h5]:font-semibold [&_a]:text-[#2F54EB] [&_a]:underline [&_a]:break-words [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1'
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

function UploadBucket({ id, files, onChange, title, accept, multiple = true, error, validateFile, bucketClassName = "", bodyClassName = "" }) {
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
                className={`${bucketClassName || 'min-h-[146px]'} cursor-pointer rounded-md border border-dashed p-1 transition ${dragOver ? 'border-[#597EF7] bg-[#F0F5FF]' : error ? 'border-red-400' : 'border-[#D9D9D9] hover:border-[#597EF7]'}`}
            >
                <div className={`flex ${bodyClassName || "min-h-[136px]"} flex-col items-center justify-center text-center`}>
                    <Upload className="mb-2 h-5 w-5 text-[#597EF7]" />
                    <p className="text-sm font-medium text-[#597EF7]">Tải lên từ máy tính</p>
                    <p className="mt-2 text-sm text-[#8C8C8C]">Hoặc kéo và thả tập tin tại đây</p>
                    <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }} className="mt-3 rounded-md bg-[#597EF7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F54EB]">
                        Kho lưu trữ
                    </button>
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

    const saveSelection = () => {
        const editor = editorRef.current
        if (!editor || typeof window === 'undefined') return
        const selection = window.getSelection()
        if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
            selectionRef.current = selection.getRangeAt(0).cloneRange()
        }
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

    return (
        <div className="h-full">
            <div className="flex h-full min-h-[252px] flex-col rounded-md bg-white">
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
                    onInput={emitChange}
                    onBlur={() => { saveSelection(); emitChange() }}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    className={`min-h-0 flex-1 overflow-auto rounded-b-md border border-t-0 bg-white p-3 text-sm leading-6 text-[#1F2937] outline-none transition focus:border-[#597EF7] focus:ring-2 focus:ring-[#597EF7]/20 ${RICH_TEXT_CONTENT_CLASS_NAME} ${error ? 'border-red-400' : 'border-[#D0D7DE]'}`}
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
                                    <Field label="Hình đại diện" required error={errors.fileAvatar2s}>
                                        <UploadBucket id="fileAvatar2s" files={form.fileAvatar2s} onChange={setFiles('fileAvatar2s')} accept={ACCEPTS.image} multiple={false} validateFile={validateImage} error={errors.fileAvatar2s} />
                                    </Field>
                                    <Field label="Hình ảnh/Video 3D xoay 360" error={errors.fileVideos}>
                                        <UploadBucket id="fileVideos" files={form.fileVideos} onChange={setFiles('fileVideos')} accept={`${ACCEPTS.image},${ACCEPTS.video}`} error={errors.fileVideos} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5">
                                    <Field label="Định dạng 3D" error={errors.fileModel3Ds}>
                                        <UploadBucket id="fileModel3Ds" files={form.fileModel3Ds} onChange={setFiles('fileModel3Ds')} accept={ACCEPTS.model3d} validateFile={validateModel3D} error={errors.fileModel3Ds} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Field label="Kiến trúc" required error={errors.fileStructures}>
                                        <UploadBucket id="fileStructures" files={form.fileStructures} onChange={setFiles('fileStructures')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileStructures} />
                                    </Field>
                                    <Field label="Hình ảnh bản vẽ kỹ thuật" required error={errors.fileImageTechs}>
                                        <UploadBucket id="fileImageTechs" files={form.fileImageTechs} onChange={setFiles('fileImageTechs')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageTechs} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5">
                                    <Field label="Bản đồ khoanh vùng" required error={errors.fileMaps}>
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
                                    <Field label="Hình đại diện" required error={errors.fileAvatars}>
                                        <UploadBucket id="fileAvatars" files={form.fileAvatars} onChange={setFiles('fileAvatars')} accept={ACCEPTS.image} multiple={false} validateFile={validateImage} error={errors.fileAvatars} />
                                    </Field>
                                    <Field label="Hình ảnh hiện vật" error={errors.fileImageObjects}>
                                        <UploadBucket id="fileImageObjects" files={form.fileImageObjects} onChange={setFiles('fileImageObjects')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageObjects} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5">
                                    <Field label="Định dạng 3D" required error={errors.fileModel3Ds}>
                                        <UploadBucket id="fileModel3Ds" files={form.fileModel3Ds} onChange={setFiles('fileModel3Ds')} accept={ACCEPTS.model3d} validateFile={validateModel3D} error={errors.fileModel3Ds} />
                                    </Field>
                                </div>

                                <Divider />

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Field label="Hình ảnh chi tiết" required error={errors.fileImageDetails}>
                                        <UploadBucket id="fileImageDetails" files={form.fileImageDetails} onChange={setFiles('fileImageDetails')} accept={ACCEPTS.image} validateFile={validateImage} error={errors.fileImageDetails} />
                                    </Field>
                                    <Field label="Video mp4" required error={errors.fileVideos}>
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