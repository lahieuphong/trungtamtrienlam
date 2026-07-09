'use client'
import React, { useState, useEffect } from 'react'
import ConvertPDF from './ConvertPDF'
import PdfSignatureViewer from '../pdf/PdfSignatureViewer'
import { FileHelpers } from '@/helpers/fileHelpers'

const getFileType = fileName => {
  if (!fileName) return { isPdf: false, isWord: false, isSupported: false }
  const isPdf = FileHelpers.isFilePdf(fileName)
  const isWord =
    FileHelpers.isFileDocDocument(fileName) ||
    FileHelpers.isFileDocxDocument(fileName)
  const isSupported =
    isPdf ||
    isWord ||
    FileHelpers.isFileExcelDocument(fileName) ||
    FileHelpers.isFileExcelxDocument(fileName) ||
    FileHelpers.isFilePowerPointDocument(fileName) ||
    FileHelpers.isFilePowerPointxDocument(fileName) ||
    FileHelpers.isFileTxtDocument(fileName)
  return { isPdf, isWord, isSupported }
}

export default function PdfConverter ({
  fileUrl,
  fileName,
  title,
  uniqueKey,
  staffFiles,
  signatureList = [],
  isWordDoc = true,
  onConvertingChange,
  onCommit,
  onPlacementsChange,
  onLockChange,
  onAddSignature,
  isEnabled,
  mobileSignatureMode,
  onMobileSignatureModeChange,
  isMobile
}) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState(null)

  // Xác định loại file
  const fileType = getFileType(fileName)
  const { isPdf: isPdfFile, isWord: isWordFile, isSupported } = fileType

  useEffect(() => {
    if (onConvertingChange) {
      onConvertingChange(isConverting)
    }
  }, [isConverting, onConvertingChange])

  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(null)
      setError(null)
      if (isPdfFile) {
        setPdfUrl(fileUrl)
        setIsConverting(false)
      } else if (isWordFile) {
        setIsConverting(true)
      } else if (isSupported) {
        setIsConverting(true)
      } else {
        console.warn('❌ File không được hỗ trợ:', fileName)
        setError('Định dạng file không được hỗ trợ')
      }
    }
  }, [fileUrl, fileName, isPdfFile, isWordFile, isSupported])

  const handleConversionSuccess = url => {
    if (url && typeof url === 'string' && url.length > 0) {
      setPdfUrl(url)
      setIsConverting(false)
    } else {
      console.error('❌ PdfConverter: Invalid URL received:', url)
      setError('URL không hợp lệ từ conversion')
      setIsConverting(false)
    }
  }

  const handleConversionError = errorMsg => {
    console.error('❌ PdfConverter: Conversion failed:', errorMsg)
    setError(errorMsg)
    setIsConverting(false)
  }

  return (
    <div className='w-full h-full'>
      {(isWordFile || isSupported) && !isPdfFile && isConverting && !pdfUrl && (
        <div className='flex flex-col items-center justify-center h-full bg-gray-50'>
          <div className='animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4'></div> 
        </div>
      )}

      {/* Show loading for PDF files */}
      {isPdfFile && isConverting && (
        <div className='flex flex-col items-center justify-center h-full bg-gray-50'>
          <div className='animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4'></div>
          <p className='text-gray-700 font-semibold text-lg'>
            Đang tải file PDF...
          </p>
          <p className='text-sm text-gray-500 mt-2'>File: {fileName}</p>
        </div>
      )}

      {/* Show error */}
      {error && (
        <div className='flex flex-col items-center justify-center h-full p-8 bg-red-50'>
          <div className='text-red-500 text-center'>
            <p className='text-lg font-semibold mb-2'>
              ❌{' '}
              {isPdfFile ? 'Không thể tải file PDF' : 'Không thể convert file'}
            </p>
            <p className='text-sm mb-4'>{error}</p>
            <button
              onClick={() => {
                setError(null)
                setPdfUrl(null)
                if (isPdfFile) {
                  setPdfUrl(fileUrl)
                  setIsConverting(false)
                } else if (isSupported) {
                  setIsConverting(true)
                }
              }}
              className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg'
            >
              🔄 Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Hidden converter for non-PDF files only */}
      {!isPdfFile && isSupported && !pdfUrl && !error && fileUrl && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <ConvertPDF
            fileUrl={fileUrl}
            fileName={fileName}
            title={title}
            convertToPdf={true}
            onPdfReady={handleConversionSuccess}
            uniqueKey={uniqueKey}
          />
        </div>
      )}

      {(() => {
        let srcToUse = null
        if (pdfUrl) {
          srcToUse = pdfUrl
        }

        if (srcToUse) {
          return (
            <PdfSignatureViewer
              key={`viewer-${srcToUse}-${staffFiles?.length ?? 0}`}
              src={srcToUse}
              staffFiles={staffFiles}
              signatureList={signatureList}
              onCommit={onCommit}
              onPlacementsChange={onPlacementsChange}
              onLockChange={onLockChange}
              onAddSignature={onAddSignature}
              isEnabled={isEnabled}
              mobileSignatureMode={mobileSignatureMode}
              onMobileSignatureModeChange={onMobileSignatureModeChange}
              isMobile={isMobile}
            />
          )
        }

        if (!isSupported && fileUrl) {
          return (
            <div className='flex flex-col items-center justify-center h-full p-8 bg-yellow-50'>
              <div className='text-yellow-600 text-center'>
                <p className='text-lg font-semibold mb-2'>
                  ⚠️ File không được hỗ trợ
                </p>
                <p className='text-sm mb-4'>
                  Chỉ hỗ trợ các định dạng: PDF, Word (DOC/DOCX), Excel
                  (XLS/XLSX), PowerPoint (PPT/PPTX), Text (TXT)
                </p>
                <p className='text-xs text-gray-500'>
                  File hiện tại: {fileName}
                </p>
              </div>
            </div>
          )
        }

        return null
      })()}
    </div>
  )
}
