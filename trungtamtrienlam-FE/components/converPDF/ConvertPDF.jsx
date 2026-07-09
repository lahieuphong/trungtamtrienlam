'use client'
import React, { useEffect, useId, useState } from 'react'
import { OnlyOfficeConstants } from '../../constants/configConstants'
import { ApiConstants } from '../../constants/apiConstants'
import { FileHelpers } from '@/helpers/fileHelpers'
import UserUtil from '../../utils/userUtil'

export function getTypeOnlyOffice (fileName) {
  if (FileHelpers.isFileDocDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.doc,
      documentType: OnlyOfficeConstants.documentTypes.word
    }
  } else if (FileHelpers.isFileDocxDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.docx,
      documentType: OnlyOfficeConstants.documentTypes.word
    }
  } else if (FileHelpers.isFilePowerPointxDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.pptx,
      documentType: OnlyOfficeConstants.documentTypes.slide
    }
  } else if (FileHelpers.isFilePowerPointDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.ppt,
      documentType: OnlyOfficeConstants.documentTypes.slide
    }
  } else if (FileHelpers.isFileExcelxDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.xlsx,
      documentType: OnlyOfficeConstants.documentTypes.cell
    }
  } else if (FileHelpers.isFileExcelDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.xls,
      documentType: OnlyOfficeConstants.documentTypes.cell
    }
  } else if (FileHelpers.isFileTxtDocument(fileName)) {
    return {
      type: OnlyOfficeConstants.fileTypes.txt,
      documentType: OnlyOfficeConstants.documentTypes.word
    }
  } else if (FileHelpers.isFilePdf(fileName)) {
    return {
      type: 'pdf',
      documentType: 'pdf'
    }
  }
  return null
}

export default function ConvertPDF ({
  className = '',
  widthContent = '100%',
  heightContent = '100%',
  fileUrl,
  fileType,
  documentType,
  fileName,
  mode = OnlyOfficeConstants.modes.view,
  title = 'Document',
  uniqueKey,
  callbackUrl,
  convertToPdf = false,
  onPdfReady,
  jwtToken = ApiConstants.onlyOfficeJwtToken,
  children
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const placeholderId = useId().replace(/:/g, '_')

  const derived =
    (!fileType || !documentType) && fileName
      ? getTypeOnlyOffice(fileName)
      : null
  const _fileType = fileType || derived?.type
  const _documentType = documentType || derived?.documentType

  useEffect(() => {
    if (!window.DocsAPI) {
      console.error(
        '❌ DocsAPI is not loaded. Make sure OnlyOffice api.js is included.'
      )
      return
    }

    // Guard: required fields
    if (
      !(fileUrl && _fileType && _documentType && mode && title && uniqueKey)
    ) {
      console.error('❌ Missing required parameters for OnlyOffice editor:', {
        fileUrl: !!fileUrl,
        _fileType: !!_fileType,
        _documentType: !!_documentType,
        mode: !!mode,
        title: !!title,
        uniqueKey: !!uniqueKey
      })
      return
    }

    setIsLoading(true)

    const userInfo = UserUtil.getUserInfo?.()
    let docEditor = null
    let cleaned = false

    // Build DocEditor config
    const config = {
      // If DS uses JWT, pass token here
      ...(jwtToken ? { token: jwtToken } : {}),
      width: convertToPdf ? 0 : widthContent,
      height: convertToPdf ? 0 : heightContent,
      documentType: _documentType,
      document: {
        fileType: _fileType,
        key: String(uniqueKey),
        title: title,
        url: fileUrl
      },
      editorConfig: {
        mode, // 'view' or 'edit'
        lang: 'vi',
        callbackUrl:
          mode === OnlyOfficeConstants.modes.view
            ? undefined
            : callbackUrl || ApiConstants.onlyOfficeServerUrlCallBack,
        user: userInfo
          ? {
              id: String(userInfo.id ?? userInfo.userId ?? '0'),
              name: String(userInfo.fullName ?? userInfo.name ?? 'User')
            }
          : undefined,

        customization: {
          autosave: false,
          forcesave: true,
          chat: false,
          comments: false,
          feedback: false,
          help: false,
          toolbarNoTabs: true,
          hideRightMenu: true,
          plugins: false, // Disable plugins for faster loading
          compactToolbar: true,
          toolbar: false, // Hide toolbar completely for conversion
          statusBar: false,
          leftMenu: false,
          rightMenu: false,
          header: false,
          zoom: -1 // Fit to width
        },
        coEditing: {
          mode: 'fast',
          change: false
        }
      },
      events: {
        onAppReady: () => {
          try {
            if (convertToPdf) {
              const conversionTimeout = setTimeout(() => {
                console.warn(
                  '⚠️ PDF conversion taking longer than expected (10s)'
                )
                if (docEditor) {
                  try {
                    if (typeof docEditor.downloadAs === 'function') {
                      docEditor.downloadAs('pdf')
                    }
                  } catch (retryError) {
                    console.error('❌ Retry conversion failed:', retryError)
                  }
                }
              }, 10000)

              const failTimeout = setTimeout(() => {
                console.error('❌ PDF conversion failed - timeout after 30s')
                if (window.conversionTimeout) {
                  clearTimeout(window.conversionTimeout)
                  window.conversionTimeout = null
                }
              }, 30000)

              window.conversionTimeout = conversionTimeout
              window.failTimeout = failTimeout

              docEditor?.downloadAs?.('pdf')
            }
          } catch (e) {
            console.error('❌ downloadAs failed:', e)
          }
        },
        onDownloadAs: e => {
          if (window.conversionTimeout) {
            clearTimeout(window.conversionTimeout)
            window.conversionTimeout = null
          }
          if (window.failTimeout) {
            clearTimeout(window.failTimeout)
            window.failTimeout = null
          }

          try {
            const data = e?.data || {}
            const url =
              data.url ||
              data.fileUrl ||
              data.uri ||
              data.downloadUrl ||
              e.url ||
              e.fileUrl ||
              e.uri ||
              e.downloadUrl ||
              null
            if (url) {
              setPdfUrl(url)
              if (typeof onPdfReady === 'function') {
                onPdfReady(url)
              } else {
                console.warn('⚠️ onPdfReady is not a function:', onPdfReady)
              }
            } else {
              console.error('❌ onDownloadAs returned no url')
            }
          } catch (err) {
            console.error('❌ onDownloadAs parse error:', err)
          } finally {
            if (convertToPdf) {
              try {
                docEditor?.destroyEditor?.()
              } catch {}
            }
          }
        },
        onError: e => {
          console.error('❌ ONLYOFFICE error:', e)
        },
        onDocumentReady: () => {},
        onRequestSaveAs: e => {}
      }
    }

    try {
      docEditor = new window.DocsAPI.DocEditor(placeholderId, config)
    } catch (error) {
      console.error('❌ Failed to create DocEditor:', error)
      return
    }

    const t = setTimeout(() => {
      if (!cleaned) {
        setIsLoading(false)
      }
    }, 1000)

    return () => {
      cleaned = true
      clearTimeout(t)

      // Clear conversion timeouts
      if (window.conversionTimeout) {
        clearTimeout(window.conversionTimeout)
        window.conversionTimeout = null
      }
      if (window.failTimeout) {
        clearTimeout(window.failTimeout)
        window.failTimeout = null
      }

      try {
        if (docEditor) {
          docEditor?.destroyEditor?.()
        }
      } catch (err) {
        console.error('❌ Failed to destroy OnlyOffice editor:', err)
      }
    }
  }, [
    fileUrl,
    _fileType,
    _documentType,
    mode,
    title,
    uniqueKey,
    callbackUrl,
    convertToPdf,
    onPdfReady,
    jwtToken,
    widthContent,
    heightContent,
    placeholderId
  ])

  const renderChildren =
    typeof children === 'function' ? children(pdfUrl) : null

  return (
    <div className={`${className} relative`}>
      <div
        id={placeholderId}
        style={
          convertToPdf
            ? { width: 0, height: 0, overflow: 'hidden', position: 'absolute' }
            : { width: widthContent, height: heightContent }
        }
      />
      {!convertToPdf && isLoading && (
        <div className='absolute z-[1] top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-[rgba(255,255,255,1)]'>
          <div>
            <img
              className='w-14 h-14 text-black'
              src='/images/icons/loading_black.svg'
            />
          </div>
          <p className='text-black text-sm'>
            Đang tải dữ liệu, xin vui lòng đợi trong giây lát...
          </p>
        </div>
      )}
      {renderChildren}
    </div>
  )
}
