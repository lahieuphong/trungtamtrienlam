import React, { useEffect, useRef, useState } from 'react'
import { Info, Download, ZoomIn, ZoomOut, X } from 'lucide-react'
import moment from 'moment'

import RenderFileToken from '../controls/renderFileTokens/RenderFileToken'
import { Button } from '../Form'

const PreviewFileImage = ({ file, onDownload, onClose, ishowBtn = true, isPrivate = true }) => {
  const containerRef = useRef(null)
  const [isShowInfo, setIsShowInfo] = React.useState(false)
  const [dragStart, setDragStart] = useState(null)
  const loadingTimerRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [loadProgress, setLoadProgress] = useState(1)
  const [isLoaded, setIsLoaded] = useState(false)

  // const renderFile = useMemo(() => (
  //     file.isGlobal ? <img src={file.path} className='w-[100%] select-none' style={{
  //         transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
  //         userSelect: "none",
  //         transition: dragStart ? "none" : "transform 0.2s ease-out",
  //     }} /> : <RenderFileToken pathFile={file.path} isPrivate={true} Component={({ src }) => {
  //         return <img src={src} className='w-[100%] select-none' style={{
  //             transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
  //             userSelect: "none",
  //             transition: dragStart ? "none" : "transform 0.2s ease-out",
  //         }} />
  //     }} />
  // ), [file.path, position, scale, dragStart]);

  const onInfo = () => {
    setIsShowInfo(!isShowInfo)
  }

  const onZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 1))
  }

  const onZoomeIn = () => {
    setScale(prev => Math.min(prev + 0.2, 5))
  }

  const onHandleMouseDown = e => {
    e.preventDefault()

    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const onHandleMouseMove = e => {
    if (!dragStart) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const onHandleMouseUp = () => {
    setDragStart(null)
  }

  const onHandleWheelZoom = e => {
    e.preventDefault()

    const zoomStep = 0.1
    const minZoom = 1
    const maxZoom = 5

    const newScale = e.deltaY < 0 ? scale + zoomStep : scale - zoomStep

    setScale(Math.min(Math.max(newScale, minZoom), maxZoom))
  }

  useEffect(() => {
    if (loadingTimerRef.current) {
      window.clearInterval(loadingTimerRef.current)
      loadingTimerRef.current = null
    }

    setLoadProgress(1)
    setIsLoaded(false)

    loadingTimerRef.current = window.setInterval(() => {
      setLoadProgress(current => {
        if (current >= 95) return current

        const step = Math.max(1, Math.round((95 - current) * 0.14))
        return Math.min(95, current + step)
      })
    }, 120)

    return () => {
      if (loadingTimerRef.current) {
        window.clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
    }
  }, [file.path])

  const handleImageLoaded = () => {
    if (loadingTimerRef.current) {
      window.clearInterval(loadingTimerRef.current)
      loadingTimerRef.current = null
    }

    setLoadProgress(100)
    window.setTimeout(() => setIsLoaded(true), 120)
  }

  const imageStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    userSelect: 'none',
    transition: dragStart ? 'none' : 'transform 0.2s ease-out'
  }

  const imageClassName = `object-contain select-none transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`

  const topics = (file.topics || '').split('|')

  return (
    <div className=''>
      <div
        className='relative max-h-[50vh] min-h-[320px] overflow-hidden select-none flex items-center justify-center'
        ref={containerRef}
        onMouseDown={onHandleMouseDown}
        onMouseMove={onHandleMouseMove}
        onMouseUp={onHandleMouseUp}
        onWheel={onHandleWheelZoom}
        onMouseLeave={onHandleMouseUp}
      >
        {!isLoaded && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/80'>
            <div className='w-[min(280px,70%)] rounded-xl border border-[#D9D9D9] bg-white px-5 py-4 shadow-sm'>
              <div className='h-2 overflow-hidden rounded-full bg-[#F0F5FF]'>
                <div className='h-2 rounded-full bg-[#2F54EB] transition-all duration-150 ease-out' style={{ width: `${loadProgress}%` }} />
              </div>
              <p className='mt-3 text-center text-sm font-medium text-[#434343]'>Đang tải ảnh {loadProgress}%</p>
            </div>
          </div>
        )}
        {file.isGlobal ? (
          <img
            src={file.path}
            className={imageClassName}
            style={imageStyle}
            onLoad={handleImageLoaded}
            onError={handleImageLoaded}
          />
        ) : (
          <RenderFileToken
            noReRender={false}
            pathFile={file.path}
            isPrivate={isPrivate}
            Component={({ src }) => {
              return (
                <img
                  src={src}
                  className={imageClassName}
                  style={imageStyle}
                  onLoad={handleImageLoaded}
                  onError={handleImageLoaded}
                />
              )
            }}
          />
        )}
      </div>
      {ishowBtn && (
        <div className='mt-4'>
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
                    type='button'
                    onClick={onDownload(file)}
                    className='border border-[#D9D9D9] rounded-full flex items-center justify-center w-8 h-8'
                  >
                    <Download size={16} className='' />
                  </button>
                </>
              )}
              <div className='flex items-center gap-2 border border-[#D9D9D9] rounded-full px-2'>
                <button onClick={onZoomOut} className=''>
                  <ZoomOut size={16} className='' />
                </button>
                <p className='text-sm text-[#434343]'>
                  {Math.round(scale * 100)}%
                </p>
                <button onClick={onZoomeIn} className=''>
                  <ZoomIn size={16} className='' />
                </button>
              </div>
            </div>
            <Button variant='destructive' onClick={onClose}>
              <X size={16} className='mr-2' />
              Đóng
            </Button>
          </div>
        </div>
      )}

      {isShowInfo && !file.isGlobal && (
        <div className='left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9998] fixed bg-white border border-[#D9D9D9] rounded-md w-[400px] shadow-[0_4px_30px_rgba(0,0,0,0.10)]'>
          <button
            type='button'
            className='absolute top-[-8px] right-[-8px] shadow-[0_4px_30px_rgba(0,0,0,0.10)] z-[9998] w-6 h-6 rounded-full bg-white flex items-center justify-center'
            onClick={onInfo}
          >
            <X size={16} className='' />
          </button>
          <div className='flex-1 max-h-[90vh] px-6 py-2 flex flex-col overflow-y-auto'>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Mã số tệp tin
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.code}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Mã cơ quan lưu trữ
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.organizationCode}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Số lưu trữ</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.storageNumber}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Ký hiệu thông tin
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.informationSympol}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Tên sự kiện
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.eventName}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Lĩnh vực</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.fieldName}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Chủ đề</p>
              <div className='flex flex-wrap gap-x-1 gap-y-1'>
                {topics.map((topic, index) => {
                  return (
                    <div
                      key={`topic-item-${index}`}
                      className='py-1 px-2 border border-[#D9D9D9] bg-[#F5F5F5] rounded-full'
                    >
                      <p className='text-sm text-[#1F1F1F] font-semibold'>
                        {topic}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Tiêu đề tập tin
              </p>
              <p className='w-[calc(400px-200px)] text-sm text-[#1F1F1F] font-semibold break-words whitespace-normal'>
                {file.name}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Tác giả</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.author}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Địa điểm</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.location}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Thời gian chụp
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {moment(file.createdDate).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Ngôn ngữ</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.language}
              </p>
            </div>
            {/* <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
                            <div className='flex items-center py-2'>
                                <p className='text-sm text-[#434343] min-w-[140px]'>Thời lượng</p>
                                <p className='text-sm text-[#1F1F1F] font-semibold'>{file.duration}</p>
                            </div> */}
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Chế độ sử dụng
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.usageMode}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Chất lượng</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.quality}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>
                Tình trạng vật lý
              </p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.physicalStatus}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Từ khóa</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.hashTag}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Ghi chú</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.note}
              </p>
            </div>
            <div className='h-[1px] w-[100%] bg-[#F0F0F0]'></div>
            <div className='flex items-center py-2'>
              <p className='text-sm text-[#434343] min-w-[140px]'>Người đăng</p>
              <p className='text-sm text-[#1F1F1F] font-semibold'>
                {file.fullName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PreviewFileImage
