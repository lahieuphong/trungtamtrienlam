'use client'

import { useMemo } from 'react'
import { FileText } from 'lucide-react'

import BrowserOfficePreview, { canPreviewInBrowser } from './BrowserOfficePreview'
import PdfConverter from '@/components/converPDF/PdfConverter'
import RenderFileToken from '@/components/controls/renderFileTokens/RenderFileToken'
import OnlyOfficeComponent, { getTypeOnlyOffice } from '@/components/onlyOffices/OnlyOfficeComponent'
import { ApiConstants } from '@/constants/apiConstants'
import { OnlyOfficeConstants } from '@/constants/configConstants'
import { FileHelpers } from '@/helpers/fileHelpers'

const ABSOLUTE_URL_RE = /^(https?:|blob:|data:)/i

function isBrowserLocalUrl(url) {
    return /^(blob|data):/i.test(String(url || ''))
}

function getDocumentIdentity(file, filePath, fileName, fileUrl) {
    return String(file?.id || file?.Id || filePath || fileName || fileUrl || 'document-preview')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 120)
}

function DocumentLoading({ className }) {
    return (
        <div className={`${className} flex flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-[#434343]`}>
            <FileText className="h-11 w-11 text-[#8C8C8C]" />
            <div className="w-60 max-w-[72%] overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-2 w-1/2 animate-pulse rounded-full bg-[#2F54EB]" />
            </div>
            <p className="text-sm font-medium">Dang tai tai lieu...</p>
        </div>
    )
}

export function getDocumentPreviewType(fileNameOrPath) {
    if (canPreviewInBrowser(fileNameOrPath)) {
        return { kind: 'browser' }
    }

    if (FileHelpers.isFilePdf(fileNameOrPath)) {
        return { kind: 'pdf' }
    }

    const onlyOfficeType = getTypeOnlyOffice(fileNameOrPath)
    if (onlyOfficeType) {
        return { kind: 'only-office', ...onlyOfficeType }
    }

    return null
}

export default function UniversalDocumentPreview({
    file,
    fileUrl,
    filePath,
    fileName,
    className = 'h-[58vh] min-h-[360px] w-full overflow-hidden rounded-md border border-[#D9D9D9] bg-white',
    isPrivate = true,
    onlyOfficeCallBackUrl,
    scale = 1,
}) {
    const documentType = useMemo(
        () => getDocumentPreviewType(filePath || fileName || fileUrl),
        [filePath, fileName, fileUrl]
    )

    const uniqueKey = useMemo(
        () => getDocumentIdentity(file, filePath, fileName, fileUrl),
        [file, filePath, fileName, fileUrl]
    )

    if (!documentType || !(filePath || fileUrl)) {
        return null
    }

    const renderDocument = (resolvedUrl) => {
        if (!resolvedUrl) {
            return <DocumentLoading className={className} />
        }

        if (documentType.kind === 'pdf') {
            return (
                <div className={className}>
                    <PdfConverter
                        className="h-full w-full overflow-auto"
                        fileUrl={resolvedUrl}
                        fileName={filePath || fileName}
                        title={fileName}
                        uniqueKey={`pdf-${uniqueKey}`}
                        staffFiles={[]}
                        signatureList={[]}
                        isWordDoc={false}
                        isEnabled={false}
                    />
                </div>
            )
        }

        if (documentType.kind === 'browser' || canPreviewInBrowser(filePath || fileName || resolvedUrl)) {
            return (
                <BrowserOfficePreview
                    fileUrl={resolvedUrl}
                    fileName={fileName || filePath}
                    className={className}
                    scale={scale}
                />
            )
        }

        if (isBrowserLocalUrl(resolvedUrl)) {
            return (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-md bg-[#F5F5F5] text-center text-sm text-[#595959]">
                    <FileText className="h-12 w-12 text-[#8C8C8C]" />
                    <p>Tep nay can duoc tai len may chu truoc khi xem bang OnlyOffice.</p>
                </div>
            )
        }

        const callbackUrl = onlyOfficeCallBackUrl || (
            filePath
                ? `${ApiConstants.onlyOfficeServerUrlCallBack}?savePath=${filePath}&isPrivate=${isPrivate}`
                : ApiConstants.onlyOfficeServerUrlCallBack
        )

        return (
            <OnlyOfficeComponent
                className={className}
                widthContent="100%"
                heightContent="58vh"
                fileUrl={resolvedUrl}
                fileType={documentType.type}
                documentType={documentType.documentType}
                mode={OnlyOfficeConstants.modes.view}
                title={fileName}
                uniqueKey={`office-${uniqueKey}`}
                callbackUrl={callbackUrl}
            />
        )
    }

    if (filePath && !ABSOLUTE_URL_RE.test(String(filePath))) {
        return (
            <RenderFileToken
                pathFile={filePath}
                isPrivate={isPrivate}
                Component={({ src }) => renderDocument(src)}
            />
        )
    }

    return renderDocument(fileUrl || filePath)
}