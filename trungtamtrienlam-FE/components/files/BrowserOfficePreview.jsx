'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'

const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'csv'])
const WORD_XML_EXTENSIONS = new Set(['docx', 'odt'])
const PRESENTATION_XML_EXTENSIONS = new Set(['pptx', 'odp'])
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json', 'xml', 'html', 'htm', 'rtf', 'log'])
const BROWSER_PREVIEW_EXTENSIONS = new Set([
    ...SPREADSHEET_EXTENSIONS,
    ...WORD_XML_EXTENSIONS,
    ...PRESENTATION_XML_EXTENSIONS,
    ...TEXT_EXTENSIONS,
])

function getExtension(fileName) {
    return String(fileName || '').split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || ''
}

function decodeXmlText(value) {
    return String(value || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

function splitCsvLine(line) {
    const cells = []
    let current = ''
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        const nextChar = line[index + 1]

        if (char === '"' && nextChar === '"') {
            current += '"'
            index += 1
        } else if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            cells.push(current)
            current = ''
        } else {
            current += char
        }
    }

    cells.push(current)
    return cells
}

function CsvTable({ text }) {
    const rows = useMemo(
        () => String(text || '')
            .split(/\r?\n/)
            .filter((line) => line.trim() !== '')
            .slice(0, 500)
            .map(splitCsvLine),
        [text]
    )

    return (
        <div className="overflow-auto">
            <table className="min-w-full border-collapse text-sm">
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={`csv-row-${rowIndex}`} className={rowIndex === 0 ? 'bg-[#F5F5F5] font-semibold' : 'odd:bg-white even:bg-[#FAFAFA]'}>
                            {row.map((cell, cellIndex) => (
                                <td key={`csv-cell-${rowIndex}-${cellIndex}`} className="max-w-[320px] border border-[#E5E7EB] px-3 py-2 align-top text-[#1F1F1F]">
                                    <span className="whitespace-pre-wrap break-words">{cell}</span>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function WorkbookPreview({ sheets }) {
    const [activeSheet, setActiveSheet] = useState(0)
    const sheet = sheets[activeSheet]

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#E5E7EB] bg-white px-3 py-2">
                {sheets.map((item, index) => (
                    <button
                        key={item.name}
                        type="button"
                        onClick={() => setActiveSheet(index)}
                        className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${index === activeSheet ? 'bg-[#2F54EB] text-white' : 'bg-[#F5F5F5] text-[#434343] hover:bg-[#E5E7EB]'}`}
                    >
                        {item.name}
                    </button>
                ))}
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white">
                <table className="min-w-full border-collapse text-sm">
                    <tbody>
                        {sheet.rows.map((row, rowIndex) => (
                            <tr key={`${sheet.name}-row-${rowIndex}`} className={rowIndex === 0 ? 'bg-[#F5F5F5] font-semibold' : 'odd:bg-white even:bg-[#FAFAFA]'}>
                                {row.map((cell, cellIndex) => (
                                    <td key={`${sheet.name}-cell-${rowIndex}-${cellIndex}`} className="max-w-[320px] border border-[#E5E7EB] px-3 py-2 align-top text-[#1F1F1F]">
                                        <span className="whitespace-pre-wrap break-words">{cell ?? ''}</span>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function TextDocument({ text }) {
    return (
        <div className="h-full overflow-auto bg-white px-8 py-6 text-sm leading-7 text-[#1F1F1F]">
            <div className="mx-auto max-w-[920px] whitespace-pre-wrap break-words">{text}</div>
        </div>
    )
}

function LoadingState() {
    return (
        <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-[#434343]">
            <FileText className="h-11 w-11 text-[#8C8C8C]" />
            <div className="w-60 max-w-[72%] overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-2 w-1/2 animate-pulse rounded-full bg-[#2F54EB]" />
            </div>
            <p className="text-sm font-medium">Dang tai tai lieu...</p>
        </div>
    )
}

async function extractZipText(arrayBuffer, extension) {
    const JSZip = (await import('jszip')).default
    const archive = await JSZip.loadAsync(arrayBuffer)
    const fileNames = Object.keys(archive.files).filter((name) => !archive.files[name].dir)
    let candidates = []

    if (extension === 'docx') {
        candidates = fileNames.filter((name) => /^word\/(document|header|footer).*\.xml$/i.test(name))
    } else if (extension === 'odt') {
        candidates = fileNames.filter((name) => /^content\.xml$/i.test(name))
    } else if (extension === 'pptx') {
        candidates = fileNames.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    } else if (extension === 'odp') {
        candidates = fileNames.filter((name) => /^content\.xml$/i.test(name))
    }

    const parts = []
    for (const name of candidates) {
        const xml = await archive.files[name].async('string')
        const text = decodeXmlText(xml)
        if (text) parts.push(text)
    }

    return parts.join('\n\n')
}

export function canPreviewInBrowser(fileNameOrPath) {
    return BROWSER_PREVIEW_EXTENSIONS.has(getExtension(fileNameOrPath))
}

export default function BrowserOfficePreview({ fileUrl, fileName, className, scale = 1 }) {
    const extension = getExtension(fileName || fileUrl)
    const [state, setState] = useState({ status: 'loading', content: null, error: '' })
    const zoomStyle = { zoom: scale }

    useEffect(() => {
        let isActive = true

        async function loadPreview() {
            setState({ status: 'loading', content: null, error: '' })

            try {
                const response = await fetch(fileUrl)
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                if (extension === 'docx') {
                    const mammoth = await import('mammoth/mammoth.browser')
                    const arrayBuffer = await response.arrayBuffer()
                    const result = await mammoth.convertToHtml({ arrayBuffer })
                    if (isActive) setState({ status: 'ready', content: { kind: 'html', html: result.value }, error: '' })
                    return
                }

                if (SPREADSHEET_EXTENSIONS.has(extension) && extension !== 'csv') {
                    const XLSX = await import('xlsx')
                    const arrayBuffer = await response.arrayBuffer()
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
                    const sheets = workbook.SheetNames.map((sheetName) => {
                        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }).slice(0, 500)
                        return { name: sheetName, rows: rows.length ? rows : [['']] }
                    })

                    if (isActive) setState({ status: 'ready', content: { kind: 'workbook', sheets }, error: '' })
                    return
                }

                if (WORD_XML_EXTENSIONS.has(extension) || PRESENTATION_XML_EXTENSIONS.has(extension)) {
                    const arrayBuffer = await response.arrayBuffer()
                    const text = await extractZipText(arrayBuffer, extension)
                    if (isActive) setState({ status: 'ready', content: { kind: 'text', text: text || 'Khong tim thay noi dung van ban trong tep nay.' }, error: '' })
                    return
                }

                const text = await response.text()
                if (isActive) {
                    setState({
                        status: 'ready',
                        content: { kind: extension === 'csv' ? 'csv' : 'text', text },
                        error: '',
                    })
                }
            } catch (error) {
                if (isActive) {
                    setState({ status: 'error', content: null, error: error?.message || 'Khong the doc tep nay' })
                }
            }
        }

        loadPreview()

        return () => {
            isActive = false
        }
    }, [extension, fileUrl])

    return (
        <div className={className}>
            {state.status === 'loading' && <LoadingState />}
            {state.status === 'error' && (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-center text-sm text-[#595959]">
                    <FileText className="h-12 w-12 text-[#8C8C8C]" />
                    <p>Khong the xem truoc tep nay trong trinh duyet.</p>
                    {state.error ? <p className="max-w-[520px] text-xs text-[#8C8C8C]">{state.error}</p> : null}
                </div>
            )}
            {state.status === 'ready' && state.content?.kind === 'html' && (
                <div className="h-full overflow-auto bg-white">
                    <div className="px-8 py-6 text-sm leading-7 text-[#1F1F1F]" style={zoomStyle}>
                        <div className="prose mx-auto max-w-[920px]" dangerouslySetInnerHTML={{ __html: state.content.html }} />
                    </div>
                </div>
            )}
            {state.status === 'ready' && state.content?.kind === 'workbook' && (
                <div className="h-full" style={zoomStyle}>
                    <WorkbookPreview sheets={state.content.sheets} />
                </div>
            )}
            {state.status === 'ready' && state.content?.kind === 'csv' && (
                <div className="h-full overflow-auto" style={zoomStyle}>
                    <CsvTable text={state.content.text} />
                </div>
            )}
            {state.status === 'ready' && state.content?.kind === 'text' && (
                <div className="h-full" style={zoomStyle}>
                    <TextDocument text={state.content.text} />
                </div>
            )}
        </div>
    )
}