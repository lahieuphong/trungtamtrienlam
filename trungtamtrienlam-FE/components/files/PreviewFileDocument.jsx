'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Info, Download, X } from 'lucide-react'
import { Button } from '../Form'
import moment from 'moment'
import OnlyOfficeComponent from '../onlyOffices/OnlyOfficeComponent'
import { OnlyOfficeConstants } from '@/constants/configConstants'
import { v4 as uuidv4 } from 'uuid'
import { ApiConstants } from '@/constants/apiConstants'
import RenderFileToken from '../controls/renderFileTokens/RenderFileToken'
import { getTypeOnlyOffice } from '../onlyOffices/OnlyOfficeComponent'
import { FileHelpers } from '@/helpers/fileHelpers'
import PdfConverter from '../converPDF/PdfConverter'

const onlyOfficeId = uuidv4()

const PreviewFileDocument = ({
  onClose,
  file,
  onDownload,
  onlyOfficeCallBackUrl,
  isPrivate = true
}) => {

  const onlyOfficeFileType = getTypeOnlyOffice(file.path)
  const [isShowInfo, setIsShowInfo] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const contextMenuRef = useRef(null)
  // const renderFile = useMemo(() => (
  //     (onlyOfficeFileType) ? <RenderFileToken pathFile={file.path} isPrivate={true} Component={({ src }) => {
  //         const id = file.isAcceptEditShare ? file.id : onlyOfficeId;
  //         const onlyOfficeMode = file.isAcceptEditShare ? OnlyOfficeConstants.modes.edit : OnlyOfficeConstants.modes.view;

  //         return <OnlyOfficeComponent className='h-[65vh]' widthContent='100%' heightContent='65vh' fileUrl={src} fileType={(onlyOfficeFileType || {}).type} documentType={(onlyOfficeFileType || {}).documentType} mode={'edit'} title={file.name} uniqueKey={id} callbackUrl={file.isGlobal ? onlyOfficeCallBackUrl : ApiConstants.onlyOfficeServerUrlCallBack + `?savePath=${file.path}&isPrivate=${true}`} />
  //     }} /> : <div className='flex items-center justify-center min-h-[20vh]'>
  //         <p className='text-sm text-[#1F1F1F]'>Không thể xem trước tập tin có định dạng này</p>
  //     </div>
  // ), [file.path]);

  const onInfo = (e) => {
    e.stopPropagation()
    if (isShowInfo) {
      setIsShowInfo(false)
    } else {
      const rect = e.target.getBoundingClientRect()
      const menuHeight = 700
      setContextMenuPosition({
        x: rect.right + 20,
        y: Math.max(20, rect.top - menuHeight)
      })
      setIsShowInfo(true)
    }
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setIsShowInfo(false)
      }
    }

    if (isShowInfo) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isShowInfo])

  const topics = (file.topics || '').split('|');

  return (
    <div className='fixed inset-0 z-50 bg-white flex flex-col'>
      {FileHelpers.isFilePdf(file.path) ? <div className='flex-1'>
        <RenderFileToken
          key={`pdf-${file?.id || file?.path}-${Date.now()}`}
          isPrivate={true}
          pathFile={file.path}
          Component={({ src }) => (
            <PdfConverter
              key={`pdf-converter-${file?.id || file?.path}-${Date.now()}`}
              className='overflow-auto flex-1 w-full h-full'
              fileUrl={src}
              fileName={file.path}
              title={file.name}
              uniqueKey={`pdf-${file?.id || file?.path}-${Date.now()}`}
              staffFiles={[]}
              signatureList={[]}
              isWordDoc={false}
              isEnabled={false}
            />
          )}
        />
      </div> : <>
        {onlyOfficeFileType ? (
          <RenderFileToken
            pathFile={file.path}
            isPrivate={true}
            Component={({ src }) => {
              const id = file.isAcceptEditShare ? file.id : onlyOfficeId
              const onlyOfficeMode = file.isAcceptEditShare
                ? OnlyOfficeConstants.modes.edit
                : OnlyOfficeConstants.modes.view;

              return (
                <OnlyOfficeComponent
                  className='h-[93vh] !w-[100%]'
                  widthContent='100%'
                  heightContent={'calc(100vh-140px)'}
                  fileUrl={src}
                  fileType={(onlyOfficeFileType || {}).type}
                  documentType={(onlyOfficeFileType || {}).documentType}
                  mode={onlyOfficeMode}
                  title={file.name || file.fileName}
                  uniqueKey={id}
                  callbackUrl={
                    file.isGlobal
                      ? onlyOfficeCallBackUrl
                      : ApiConstants.onlyOfficeServerUrlCallBack +
                      `?savePath=${file.path}&isPrivate=${isPrivate}`
                  }
                />
              )
            }}
          />
        ) : (
          <div className='flex items-center justify-center min-h-[20vh]'>
            <p className='text-sm text-[#1F1F1F]'>
              Không thể xem trước tập tin có định dạng này
            </p>
          </div>
        )}
      </>}
      <div className='mt-4 p-2'>
        <p className='text-sm'>{file.name}</p>
        <div className='gap-2 flex mt-2 justify-between'>
          <div className='flex-1 flex gap-2 relative'>
            {file.id && !file.isGlobal && (
              <>
                <button
                  onClick={onInfo}
                  className='border border-[#D9D9D9] rounded-full flex items-center justify-center w-8 h-8'
                >
                  <Info size={16} className='' />
                </button>
                <button
                  onClick={onDownload(file)}
                  className='border border-[#D9D9D9] rounded-full flex items-center justify-center w-8 h-8'
                >
                  <Download size={16} className='' />
                </button>
              </>
            )}
          </div>
          <Button variant='destructive' onClick={onClose}>
            <X size={16} className='mr-2' />
            Đóng
          </Button>
        </div>
      </div>
      {isShowInfo && !file.isGlobal && (
        <div
          ref={contextMenuRef}
          className='fixed z-[9999] bg-white border border-[#D9D9D9] rounded-lg w-[380px] max-h-[70vh] shadow-lg overflow-y-auto'
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }}
        >
          <div className='p-4'>
            <div className='space-y-3'>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Mã số tệp tin</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.code}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Mã cơ quan lưu trữ</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.organizationCode}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Số lưu trữ</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.storageNumber}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Ký hiệu thông tin</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.informationSympol}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Tên sự kiện</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.eventName}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Lĩnh vực</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.fieldName}</p>
              </div>
              <div className='pb-2 border-b'>
                <p className='text-xs text-[#434343] mb-2'>Chủ đề</p>
                <div className='flex flex-wrap gap-1'>
                  {topics.map((topic, index) => (
                    <span
                      key={`topic-item-${index}`}
                      className='px-2 py-1 bg-[#F5F5F5] border border-[#D9D9D9] rounded-full text-xs text-[#1F1F1F]'
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Tiêu đề tập tin</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.name}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Tác giả</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.author}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Địa điểm</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.location}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Thời gian</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{moment(file.createdDate).format('DD/MM/YYYY HH:mm')}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Ngôn ngữ</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.language}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Chế độ sử dụng</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.usageMode}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Chất lượng</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.quality}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Tình trạng vật lý</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.physicalStatus}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Từ khóa</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.hashTag}</p>
              </div>
              <div className='flex justify-between items-start pb-2 border-b'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Ghi chú</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.note}</p>
              </div>
              <div className='flex justify-between items-start'>
                <p className='text-xs text-[#434343] min-w-[120px]'>Người đăng</p>
                <p className='text-xs text-[#1F1F1F] font-medium text-right flex-1'>{file.fullName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PreviewFileDocument
