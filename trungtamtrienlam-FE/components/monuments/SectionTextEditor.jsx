'use client'

import { useEffect, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, Italic, Link2, List, ListOrdered, Redo2, Save, Type, Underline, Undo2, X } from 'lucide-react'

const RICH_TEXT_CONTENT_CLASS_NAME = 'break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_*]:[word-break:break-word] [&_p]:my-0 [&_div]:my-0 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:my-2 [&_h4]:text-base [&_h4]:font-semibold [&_h5]:my-2 [&_h5]:text-sm [&_h5]:font-semibold [&_a]:cursor-pointer [&_a]:text-[#2F54EB] [&_a]:underline [&_a]:break-words [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1'
const TEXT_SIZE_STYLES = { 1: '12px', 2: '14px', 3: '16px', 4: '18px', 5: '22px', 6: '28px', 7: '36px' }
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

export default SectionTextEditor
