'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import RenderFileTokenUtil from '@/utils/renderFileTokenUtil'
import { UserFileConstants } from '@/constants/userConstants'
import { useToast } from '@/contexts/ToastContext'
import ConfirmationModal from '@/components/ConfirmationModal'
import { compareSignStaff, compareStamp } from '@/lib/api/documentationApi'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'

// Utility functions for signature blocking
const isSignatureBlocked = (userId) => {
  if (typeof window !== 'undefined') {
    const blockingData = localStorage.getItem(`signatureBlocked_${userId}`)
    if (blockingData) {
      const { isBlocked, timestamp } = JSON.parse(blockingData)
      // Check if blocking is still valid (within 24 hours)
      const now = new Date().getTime()
      const blockTime = new Date(timestamp).getTime()
      const hoursDiff = (now - blockTime) / (1000 * 60 * 60)
      
      if (hoursDiff < 24 && isBlocked) {
        return true
      } else if (hoursDiff >= 24) {
        // Auto-reset after 24 hours
        localStorage.removeItem(`signatureBlocked_${userId}`)
        localStorage.removeItem(`signatureFailedAttempts_${userId}`)
        return false
      }
    }
  }
  return false
}

let pdfjs = null
const cloneU8 = u8 => (u8 ? u8.slice(0) : u8)

export default function PdfSignatureViewer ({
  src,
  staffFiles,
  signatureList = [],
  onCommit,
  onPlacementsChange,
  onLockChange,
  onAddSignature,
  isEnabled = false,
  isMobile = false
}) {
  const containerRef = useRef(null)
  const toast = useToast()
  const { userInfo } = useLoadLocalStorage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [docProxy, setDocProxy] = useState(null)
  const pdfDataRef = useRef(null)
  const historyRef = useRef([])
  const [pages, setPages] = useState([])
  const canvasRefs = useRef([])
  const overlayRefs = useRef([])
  const renderTasksRef = useRef([])
  const [placements, setPlacements] = useState([])
  const [draggingId, setDraggingId] = useState(null)
  const [resizingId, setResizingId] = useState(null)
  const [resizeHandle, setResizeHandle] = useState(null) // 'se', 'sw', 'ne', 'nw'
  const dragOffsetRef = useRef({ dx: 0, dy: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragOver, setIsDragOver] = useState(false)
  const [historyLength, setHistoryLength] = useState(0)
  const canUndo = historyLength > 0
  const [containerHeight, setContainerHeight] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640 
      ? 'calc(100vh - 60px)' 
      : 'calc(100vh - 120px)'
  )
  const [savedFileInfo, setSavedFileInfo] =  useState(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isSignatureLocked, setIsSignatureLocked] = useState(false)
  const [scaleFactor, setScaleFactor] = useState(1) // For responsive scaling
  const placementsRef = useRef(placements)
  const draggingIdRef = useRef(draggingId)
  const resizingIdRef = useRef(resizingId)

  useEffect(() => {
    placementsRef.current = placements
  }, [placements])

  useEffect(() => {
    onPlacementsChange?.(placements)
  }, [placements, onPlacementsChange])

  useEffect(() => {
    draggingIdRef.current = draggingId
  }, [draggingId])

  useEffect(() => {
    resizingIdRef.current = resizingId
  }, [resizingId])

  // Handle responsive scaling
  useEffect(() => {
    const updateScale = () => {
      if (isMobile && containerRef.current && pages.length > 0) {
        const containerWidth = containerRef.current.clientWidth - 24 // padding
        const maxPageWidth = Math.max(...pages.map(p => p.widthPx))
        if (maxPageWidth > 0 && containerWidth > 0) {
          const newScale = Math.min(1, containerWidth / maxPageWidth)
          setScaleFactor(newScale)
          addDebugLog(`📱 Mobile scale updated: ${newScale.toFixed(2)}, container: ${containerWidth}px, maxPage: ${maxPageWidth}px`)
        }
      } else {
        setScaleFactor(1)
      }
    }

    // Delay update to ensure container is ready
    const timeoutId = setTimeout(updateScale, 100)
    
    window.addEventListener('resize', updateScale)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateScale)
    }
  }, [pages, isMobile])

  // Đồng bộ pdfBytes -> pdfDataRef (dùng clone để tránh bị detach)
  useEffect(() => {
    if (pdfBytes && pdfBytes.length > 0) {
      if (
        !pdfDataRef.current ||
        pdfDataRef.current.length !== pdfBytes.length
      ) {
        pdfDataRef.current = cloneU8(pdfBytes)
        addDebugLog(
          `🔄 Synced pdfDataRef với pdfBytes: ${pdfBytes.length} bytes`
        )
      }
    }
  }, [pdfBytes])

  // Debug logs
  const [debugLogs, setDebugLogs] = useState([])
  const addDebugLog = msg => {
    setDebugLogs(prev => [msg, ...prev.slice(0, 9)])
  }

  // === DOWNLOAD CURRENT PDF ===
  const downloadCurrentPdf = () => {
    const data = cloneU8(
      pdfBytes && pdfBytes.length ? pdfBytes : pdfDataRef.current
    )
    if (!data || data.length === 0) {
      toast.error('Chưa có dữ liệu PDF để tải')
      return
    }
    try {
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'signed_document.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Đã tải PDF hiện tại')
    } catch (e) {
      toast.error('Không thể tải PDF. Vui lòng thử lại sau.')
    }
  }

  // === Drag handlers ===
  const onDragging = useCallback(e => {
    const currentDraggingId = draggingIdRef.current
    if (!currentDraggingId) return
    e.preventDefault()
    e.stopPropagation()

    const currentPlacements = placementsRef.current
    const pIndex = currentPlacements.findIndex(x => x.id === currentDraggingId)
    if (pIndex < 0) return

    const pCur = currentPlacements[pIndex]
    const overlay = overlayRefs.current[pCur.pageIndex]
    if (!overlay) return

    const rect = overlay.getBoundingClientRect()
    const pointerX = e.touches?.[0]?.clientX ?? e.clientX
    const pointerY = e.touches?.[0]?.clientY ?? e.clientY

    let newX = pointerX - rect.left - dragOffsetRef.current.dx
    let newY = pointerY - rect.top - dragOffsetRef.current.dy
    newX = Math.max(0, Math.min(newX, rect.width - pCur.wPx))
    newY = Math.max(0, Math.min(newY, rect.height - pCur.hPx))

    setPlacements(prev => {
      const copy = [...prev]
      const index = copy.findIndex(x => x.id === currentDraggingId)
      if (index >= 0) copy[index] = { ...copy[index], xPx: newX, yPx: newY }
      return copy
    })
  }, [])

  const endDrag = useCallback(() => {
    const currentDraggingId = draggingIdRef.current
    addDebugLog(`Kết thúc kéo: id=${currentDraggingId}`)
    setDraggingId(null)
    
    // Khôi phục scroll trên mobile
    if (isMobile && document.body) {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    
    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', endDrag)
    document.removeEventListener('touchmove', onDragging)
    document.removeEventListener('touchend', endDrag)
  }, [onDragging, isMobile])

  // === Resize handlers ===
  const onResizing = useCallback(
    e => {
      const currentResizingId = resizingIdRef.current
      if (!currentResizingId || !resizeHandle) return
      e.preventDefault()
      e.stopPropagation()

      const currentPlacements = placementsRef.current
      const pIndex = currentPlacements.findIndex(
        x => x.id === currentResizingId
      )
      if (pIndex < 0) return

      const pCur = currentPlacements[pIndex]
      const overlay = overlayRefs.current[pCur.pageIndex]
      if (!overlay) return

      const rect = overlay.getBoundingClientRect()
      const pointerX = e.touches?.[0]?.clientX ?? e.clientX
      const pointerY = e.touches?.[0]?.clientY ?? e.clientY

      const relativeX = pointerX - rect.left
      const relativeY = pointerY - rect.top

      let newX = pCur.xPx
      let newY = pCur.yPx
      let newW = pCur.wPx
      let newH = pCur.hPx

      switch (resizeHandle) {
        case 'se':
          newW = Math.max(20, relativeX - pCur.xPx)
          newH = Math.max(20, relativeY - pCur.yPx)
          break
        case 'sw':
          newW = Math.max(20, pCur.xPx + pCur.wPx - relativeX)
          newH = Math.max(20, relativeY - pCur.yPx)
          newX = Math.min(pCur.xPx + pCur.wPx - 20, Math.max(0, relativeX))
          break
        case 'ne':
          newW = Math.max(20, relativeX - pCur.xPx)
          newH = Math.max(20, pCur.yPx + pCur.hPx - relativeY)
          newY = Math.min(pCur.yPx + pCur.hPx - 20, Math.max(0, relativeY))
          break
        case 'nw':
          newW = Math.max(20, pCur.xPx + pCur.wPx - relativeX)
          newH = Math.max(20, pCur.yPx + pCur.hPx - relativeY)
          newX = Math.min(pCur.xPx + pCur.wPx - 20, Math.max(0, relativeX))
          newY = Math.min(pCur.yPx + pCur.hPx - 20, Math.max(0, relativeY))
          break
      }

      newX = Math.max(0, Math.min(newX, rect.width - newW))
      newY = Math.max(0, Math.min(newY, rect.height - newH))
      newW = Math.min(newW, rect.width - newX)
      newH = Math.min(newH, rect.height - newY)

      setPlacements(prev => {
        const copy = [...prev]
        const index = copy.findIndex(x => x.id === currentResizingId)
        if (index >= 0)
          copy[index] = {
            ...copy[index],
            xPx: newX,
            yPx: newY,
            wPx: newW,
            hPx: newH
          }
        return copy
      })
    },
    [resizeHandle]
  )

  const endResize = useCallback(() => {
    const currentResizingId = resizingIdRef.current
    addDebugLog(`Kết thúc resize: id=${currentResizingId}`)
    setResizingId(null)
    setResizeHandle(null)
    
    // Khôi phục scroll trên mobile
    if (isMobile && document.body) {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    
    document.removeEventListener('mousemove', onResizing)
    document.removeEventListener('mouseup', endResize)
    document.removeEventListener('touchmove', onResizing)
    document.removeEventListener('touchend', endResize)
  }, [onResizing, isMobile])

  const startResize = useCallback(
    (e, id, handle) => {
      // Kiểm tra nếu đã khóa
      if (isSignatureLocked) {
        toast.warning(
          'Tài liệu đã được ký và khóa. Không thể thay đổi kích thước chữ ký/con dấu.'
        )
        return
      }

      e.preventDefault()
      e.stopPropagation()
      const p = placements.find(x => x.id === id)
      if (!p) return

      // Ngăn scroll trên mobile khi đang resize
      if (isMobile && document.body) {
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
      }

      // Cleanup listeners
      document.removeEventListener('mousemove', onDragging)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchmove', onDragging)
      document.removeEventListener('touchend', endDrag)
      document.removeEventListener('mousemove', onResizing)
      document.removeEventListener('mouseup', endResize)
      document.removeEventListener('touchmove', onResizing)
      document.removeEventListener('touchend', endResize)

      setResizingId(id)
      setResizeHandle(handle)
      const overlay = overlayRefs.current[p.pageIndex]
      const rect = overlay?.getBoundingClientRect()
      if (!rect) return

      resizeStartRef.current = {
        x: p.xPx,
        y: p.yPx,
        width: p.wPx,
        height: p.hPx
      }

      document.addEventListener('mousemove', onResizing, { passive: false })
      document.addEventListener('mouseup', endResize)
      document.addEventListener('touchmove', onResizing, { passive: false })
      document.addEventListener('touchend', endResize)
    },
    [placements, onResizing, endResize, onDragging, endDrag, isSignatureLocked, isMobile]
  )

  // Anti-scroll khi mobile drag & drop
  useEffect(() => {
    const handleTouchMove = (e) => {
      // Ngăn scroll khi đang trong mobile drag mode
      if (window.mobileDragData?.isDragging) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Add listener with passive: false to allow preventDefault
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Khôi phục scroll khi component unmount
  useEffect(() => {
    return () => {
      // Khôi phục scroll khi component unmount
      if (isMobile && document.body) {
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
      }
      
      document.removeEventListener('mousemove', onDragging)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchmove', onDragging)
      document.removeEventListener('touchend', endDrag)
      document.removeEventListener('mousemove', onResizing)
      document.removeEventListener('mouseup', endResize)
      document.removeEventListener('touchmove', onResizing)
      document.removeEventListener('touchend', endResize)
      renderTasksRef.current.forEach(task => {
        if (task && !task._internalRenderTask?.cancelled) task.cancel()
      })
      renderTasksRef.current = []
    }
  }, [onDragging, endDrag, onResizing, endResize, isMobile])

  // Khôi phục scroll khi isDragOver thay đổi
  useEffect(() => {
    if (!isDragOver && isMobile && document.body) {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isDragOver, isMobile])

  // Dynamically import PDF.js
  useEffect(() => {
    async function loadPdfJs () {
      try {
        const pdfjsLib = await import('pdfjs-dist/webpack')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-sw.js'
        pdfjs = pdfjsLib
        addDebugLog('PDF.js loaded successfully')
      } catch (err) {
        console.error('Failed to load PDF.js:', err)
        setError('Không thể tải thư viện PDF.js. Vui lòng thử lại sau.')
      }
    }
    if (typeof window !== 'undefined') {
      loadPdfJs()
      const updateHeight = () => {
        const isMobileView = window.innerWidth < 640
        if (isMobileView) {
          // On mobile, use a larger portion of viewport and account for mobile browsers
          setContainerHeight(`calc(100vh - 60px)`)
        } else {
          setContainerHeight(`calc(100vh - 120px)`)
        }
      }
      updateHeight()
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
  }, [])

  // Load initial bytes
  useEffect(() => {
    let aborted = false
    const load = async () => {
      if (!src) {
        return
      }
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(src)
        addDebugLog(
          `📡 Fetch response: ${response.status} ${response.statusText}`
        )
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        const arrayBuffer = await response.arrayBuffer()
        if (aborted) return
        const uint8Data = Uint8Array.from(new Uint8Array(arrayBuffer))
        if (uint8Data.length < 4) throw new Error('File PDF quá ngắn')
        const header = new TextDecoder().decode(uint8Data.slice(0, 4))
        if (!header.startsWith('%PDF'))
          toast.error('File không phải là PDF hợp lệ')
        pdfDataRef.current = cloneU8(uint8Data)
        setPdfBytes(cloneU8(uint8Data))
        historyRef.current = []
        setHistoryLength(0)
      } catch (e) {
        if (!aborted) {
          console.error('PDF Load Error:', e)
          addDebugLog(`❌ Lỗi load PDF: ${e.message}`)
          setError(e?.message || 'Không thể tải PDF')
        }
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => {
      aborted = true
    }
  }, [src])

  // Open with pdfjs + measure pages (data must be clone)
  useEffect(() => {
    let aborted = false
    const openAndMeasure = async () => {
      if (!pdfBytes || !pdfjs) return
      setLoading(true)
      try {
        const loadingTask = pdfjs.getDocument({ data: cloneU8(pdfBytes) })
        const pdf = await loadingTask.promise
        if (aborted) return
        setDocProxy(pdf)

        const containerW = containerRef.current?.clientWidth || 900
        const nextPages = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport1 = page.getViewport({ scale: 1 })
          const pageWidth = viewport1.width
          const pageHeight = viewport1.height
          const scale = Math.min(2, (containerW - 40) / pageWidth)
          const widthPx = Math.round(pageWidth * scale)
          const heightPx = Math.round(pageHeight * scale)
          nextPages.push({
            pageIndex: i - 1,
            pageWidth,
            pageHeight,
            widthPx,
            heightPx,
            scale
          })
        }
        if (aborted) return
        setPages(nextPages)
        addDebugLog(`📊 Pages loaded: ${nextPages.length}, Mobile: ${window.innerWidth < 640}, Container: ${containerW}px`)
      } catch (e) {
        if (!aborted) {
          console.error(e)
          setError(e?.message || 'Không thể mở PDF')
        }
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    openAndMeasure()
    return () => {
      aborted = true
    }
  }, [pdfBytes, pdfjs])

  // Render canvases
  useEffect(() => {
    let aborted = false
    const renderAll = async () => {
      if (!docProxy || pages.length === 0) return

      renderTasksRef.current.forEach(task => {
        if (task && !task._internalRenderTask?.cancelled) task.cancel()
      })
      renderTasksRef.current = []

      try {
        for (const pg of pages) {
          if (aborted) return
          const page = await docProxy.getPage(pg.pageIndex + 1)
          const viewport = page.getViewport({ scale: pg.scale })
          const canvas = canvasRefs.current[pg.pageIndex]
          if (!canvas) continue
          const ctx = canvas.getContext('2d', { alpha: false })
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Mobile-responsive canvas sizing
          const isMobileView = window.innerWidth < 640
          if (isMobileView) {
            const containerWidth = containerRef.current?.clientWidth || window.innerWidth
            const availableWidth = containerWidth - 48 // accounting for padding
            const mobileScale = Math.min(pg.scale, availableWidth / viewport.width)
            const mobileViewport = page.getViewport({ scale: mobileScale })
            canvas.width = mobileViewport.width
            canvas.height = mobileViewport.height
            canvas.style.width = '100%'
            canvas.style.height = 'auto'
            const renderTask = page.render({ canvasContext: ctx, viewport: mobileViewport })
            renderTasksRef.current.push(renderTask)
            await renderTask.promise
            addDebugLog(`📱 Mobile canvas rendered: page ${pg.pageIndex + 1}, scale: ${mobileScale.toFixed(2)}`)
          } else {
            canvas.width = viewport.width
            canvas.height = viewport.height
            canvas.style.width = `${pg.widthPx}px`
            canvas.style.height = `${pg.heightPx}px`
            const renderTask = page.render({ canvasContext: ctx, viewport })
            renderTasksRef.current.push(renderTask)
            await renderTask.promise
            addDebugLog(`🖥️ Desktop canvas rendered: page ${pg.pageIndex + 1}`)
          }
          if (aborted) return
        }
      } catch (e) {
        if (!aborted && !e.message?.includes('cancelled')) {
          console.error(e)
          setError(e?.message || 'Lỗi render PDF')
        }
      }
    }
    renderAll()
    return () => {
      aborted = true
      renderTasksRef.current.forEach(task => {
        if (task && !task._internalRenderTask?.cancelled) task.cancel()
      })
      renderTasksRef.current = []
    }
  }, [docProxy, pages])

  // Hit-test page by pointer
  const findPageByClientPoint = useCallback((clientX, clientY) => {
    for (let i = 0; i < overlayRefs.current.length; i++) {
      const el = overlayRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return {
          pageIndex: i,
          overlayRect: rect,
          xPx: clientX - rect.left,
          yPx: clientY - rect.top
        }
      }
    }
    return null
  }, [])

  // DnD container
  const handleDragOverContainer = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
    
    // Ngăn scroll khi drag over trên mobile
    if (isMobile && document.body) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }
  }
  const handleDragLeaveContainer = e => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
      
      // Khôi phục scroll khi drag leave trên mobile
      if (isMobile && document.body) {
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
      }
    }
  }

  // Validate signature before allowing drop
  const validateSignatureBeforeDrop = async (item, type) => {
    try {
      // Kiểm tra nếu user bị chặn do sai quá 3 lần
      if (userInfo?.id && isSignatureBlocked(userInfo.id)) {
        toast.error('Bạn đã bị chặn ký tài liệu do nhập sai chữ ký 3 lần. Vui lòng liên hệ admin.')
        return false
      }

      if (!userInfo?.id) {
        toast.error('Không xác định được thông tin người dùng')
        return false
      }

      let result
      if (type === 'signature') {
        result = await compareSignStaff(
          item.File,
          userInfo.id,
          false // isPrivate = false for existing signatures from staffFiles
        )
      } else if (type === 'stamp') {
        // result = await compareStamp(
        //   item.File,
        //   userInfo.id,
        //   false // isPrivate = false for existing stamps from staffFiles
        // )
        // Tạm thời bỏ qua validation cho stamp
        result = { status: 200 }
      }

      if (result.status === 200) {
        toast.success(`${type === 'signature' ? 'Chữ ký' : 'Con dấu'} đã được xác thực thành công`)
        return true
      } else {
        toast.error(`${type === 'signature' ? 'Chữ ký' : 'Con dấu'} không khớp với hồ sơ của bạn`)
        return false
      }
    } catch (error) {
      console.error('Error validating signature/stamp:', error)
      toast.error(`Lỗi khi kiểm tra ${type === 'signature' ? 'chữ ký' : 'con dấu'}. Vui lòng thử lại.`)
      return false
    }
  }

  // Mobile tap-to-place handler - DISABLED, use drag & drop only
  const handleMobileTapToPlace = async (e) => {
    // Không sử dụng mobile tap-to-place, chỉ dùng drag & drop
    return
  }

  const handleDropContainer = async e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    // Khôi phục scroll sau khi drop trên mobile
    if (isMobile && document.body) {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }

    // Kiểm tra nếu user bị chặn ký do sai quá 3 lần
    if (userInfo?.id && isSignatureBlocked(userInfo.id)) {
      toast.error('Bạn đã bị chặn ký tài liệu do nhập sai chữ ký 3 lần. Vui lòng liên hệ admin.')
      return
    }

    // Kiểm tra nếu đã khóa
    if (isSignatureLocked) {
      toast.warning(
        'Tài liệu đã được ký và khóa. Không thể thêm chữ ký/con dấu mới.'
      )
      return
    }

    let type, signatureFile, signatureType, signatureId, evidenceJws
    
    // Handle mobile drop vs desktop drop
    if (e.dataTransfer) {
      // Desktop drag & drop
      type = e.dataTransfer.getData('text/plain') // 'signature' | 'stamp' | 'hand-signature-{id}'
      signatureFile = e.dataTransfer.getData('signature-file')
      signatureType = e.dataTransfer.getData('signature-type')
      signatureId = e.dataTransfer.getData('signature-id')
      evidenceJws = e.dataTransfer.getData('evidence-jws')
    } else {
      // Mobile touch drop - get data from global mobileDragData
      if (window.mobileDragData) {
        type = window.mobileDragData.type
        signatureFile = window.mobileDragData.signatureFile
        signatureId = window.mobileDragData.signatureId
        evidenceJws = window.mobileDragData.evidenceJws
        
        // Check if it's a hand signature
        if (type && type.startsWith('hand-signature-')) {
          signatureType = 'hand-signature'
        }
        
      }
    }

    // Xử lý chữ ký tay
    if (signatureType === 'hand-signature' && signatureFile) {
      const hit = findPageByClientPoint(e.clientX, e.clientY)
      if (!hit) {
        toast.error('Không xác định được trang tại vị trí thả.')
        return
      }

      try {
        const token = await RenderFileTokenUtil.getPublicToken()
        const imageUrl = RenderFileTokenUtil.generateUrl(
          signatureFile,
          token,
          false
        ) // isPrivate = true cho chữ ký tay
        const wPx = 120 // Kích thước chữ ký tay
        const hPx = 60
        const xPx = Math.max(
          0,
          Math.round(e.clientX - hit.overlayRect.left - wPx / 2)
        )
        const yPx = Math.max(
          0,
          Math.round(e.clientY - hit.overlayRect.top - hPx / 2)
        )

        // Validation để đảm bảo các giá trị hợp lệ
        if (isNaN(xPx) || isNaN(yPx) || isNaN(wPx) || isNaN(hPx)) {
          console.error('Invalid placement coordinates:', {
            xPx,
            yPx,
            wPx,
            hPx
          })
          toast.error('Lỗi tọa độ chữ ký')
          return
        }
        
        const placement = {
          id: `hand-sign-${Date.now()}`,
          pageIndex: hit.pageIndex,
          xPx: xPx,
          yPx: yPx,
          wPx: wPx,
          hPx: hPx,
          imageUrl,
          type: 'hand-signature',
          signatureId,
          evidenceJws
        }

        setPlacements(prev => [...prev, placement])
        toast.success('Đã thêm chữ ký tay vào tài liệu')
      } catch (error) {
        console.error('Error adding hand signature:', error)
        toast.error('Lỗi khi thêm chữ ký tay')
      }
      return
    }

    // Logic cũ cho signature và stamp
    if (!type || (type !== 'signature' && type !== 'stamp')) return
    if (!staffFiles || !Array.isArray(staffFiles)) {
      toast.error('Không có dữ liệu chữ ký/con dấu')
      return
    }

    const hit = findPageByClientPoint(e.clientX, e.clientY)
    if (!hit) {
      toast.error('Không xác định được trang tại vị trí thả.')
      return
    }

    const item = staffFiles.find(
      f =>
        f.TypeFile ===
        (type === 'signature'
          ? UserFileConstants.typeFile.Sign
          : UserFileConstants.typeFile.Stamp)
    )
    if (!item?.File) {
      toast.error(
        `Không tìm thấy ${type === 'signature' ? 'chữ ký' : 'con dấu'}`
      )
      return
    }

    // Validate signature before allowing drop
    const isValid = await validateSignatureBeforeDrop(item, type)
    if (!isValid) {
      return // Stop if validation fails
    }

    try {
      const token = await RenderFileTokenUtil.getPublicToken()
      const imageUrl = RenderFileTokenUtil.generateUrl(item.File, token, false)
      const wPx = type === 'signature' ? 120 : 80
      const hPx = type === 'signature' ? 60 : 80
      const xPx = Math.max(
        0,
        Math.min(hit.xPx - wPx / 2, hit.overlayRect.width - wPx)
      )
      const yPx = Math.max(
        0,
        Math.min(hit.yPx - hPx / 2, hit.overlayRect.height - hPx)
      )

      const placement = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        pageIndex: hit.pageIndex,
        xPx,
        yPx,
        wPx,
        hPx,
        imageUrl,
        type
      }
      setPlacements(prev => [...prev, placement])
      addDebugLog(`Đã thêm ${type} tại x=${xPx}, y=${yPx}`)
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi thêm chữ ký/con dấu. Vui lòng thử lại.')
    }
  }

  const startDragPlacement = useCallback(
    (e, id) => {
      // Kiểm tra nếu đã khóa
      if (isSignatureLocked) {
        toast.warning(
          'Tài liệu đã được ký và khóa. Không thể di chuyển chữ ký/con dấu.'
        )
        return
      }

      e.preventDefault()
      e.stopPropagation()
      const p = placements.find(x => x.id === id)
      if (!p) return

      // Ngăn scroll trên mobile khi đang drag
      if (isMobile && document.body) {
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
      }

      // Cleanup listeners
      document.removeEventListener('mousemove', onDragging)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchmove', onDragging)
      document.removeEventListener('touchend', endDrag)
      document.removeEventListener('mousemove', onResizing)
      document.removeEventListener('mouseup', endResize)
      document.removeEventListener('touchmove', onResizing)
      document.removeEventListener('touchend', endResize)

      setDraggingId(id)
      const overlay = overlayRefs.current[p.pageIndex]
      const rect = overlay?.getBoundingClientRect()
      if (!rect) return

      const pointerX = e.touches?.[0]?.clientX ?? e.clientX
      const pointerY = e.touches?.[0]?.clientY ?? e.clientY
      dragOffsetRef.current = {
        dx: pointerX - (rect.left + p.xPx),
        dy: pointerY - (rect.top + p.yPx)
      }

      addDebugLog(`Bắt đầu kéo: id=${id}, x=${p.xPx}, y=${p.yPx}`)
      document.addEventListener('mousemove', onDragging, { passive: false })
      document.addEventListener('mouseup', endDrag)
      document.addEventListener('touchmove', onDragging, { passive: false })
      document.addEventListener('touchend', endDrag)
    },
    [placements, onDragging, endDrag, onResizing, endResize, isSignatureLocked, isMobile]
  )

  const removePlacement = id => {
    if (isSignatureLocked) {
      toast.warning(
        'Tài liệu đã được ký và khóa. Không thể xóa chữ ký/con dấu.'
      )
      return
    }
    setPlacements(prev => prev.filter(x => x.id !== id))
  }
  const clearOverlays = () => {
    if (isSignatureLocked) {
      toast.warning(
        'Tài liệu đã được ký và khóa. Không thể xóa chữ ký/con dấu.'
      )
      return
    }
    setPlacements([])
  }

  // Function to automatically add signature to the first page
  const addSignatureAutomatically = useCallback(
    async signatureFile => {
      if (isSignatureLocked) {
        toast.warning('Tài liệu đã được ký và khóa. Không thể thêm chữ ký mới.')
        return
      }

      if (pages.length === 0) {
        toast.error('Chưa có trang nào để thêm chữ ký')
        return
      }

      try {
        const token = await RenderFileTokenUtil.getPublicToken()
        const imageUrl = RenderFileTokenUtil.generateUrl(
          signatureFile,
          token,
          false 
        )

        const firstPage = pages[0]
        const pageWidth = firstPage.widthPx
        const pageHeight = firstPage.heightPx

        const wPx = 120 
        const hPx = 60

        const xPx = Math.max(0, pageWidth - wPx - 20) 
        const yPx = Math.max(0, pageHeight - hPx - 20) 

        const placement = {
          id: `auto-hand-sign-${Date.now()}`,
          pageIndex: 0, // First page
          xPx,
          yPx,
          wPx,
          hPx,
          imageUrl,
          type: 'hand-signature'
        }

        setPlacements(prev => [...prev, placement])
        toast.success('Đã thêm chữ ký vào tài liệu tự động')

        return placement
      } catch (error) {
        console.error('Error adding signature automatically:', error)
        toast.error('Lỗi khi thêm chữ ký tự động')
      }
    },
    [pages, isSignatureLocked, toast]
  )

  useEffect(() => {
    if (onAddSignature) {
      onAddSignature(addSignatureAutomatically)
    }
  }, [onAddSignature, addSignatureAutomatically])

  // Commit overlays (embed images)
  const commitOverlays = async () => {
    if (placements.length === 0 || pages.length === 0) {
      toast.error('Không có chữ ký/con dấu để lưu.')
      return
    }
    if (!pdfBytes && !src) {
      toast.error('Không có dữ liệu PDF để xử lý.')
      return
    }

    try {
      setLoading(true)
      let currentData

      // Ưu tiên lấy từ state
      if (pdfBytes && pdfBytes.length > 100) {
        currentData = cloneU8(pdfBytes)
      }
      // Fallback ref
      if (
        !currentData &&
        pdfDataRef.current &&
        pdfDataRef.current.length > 100
      ) {
        const header = new TextDecoder().decode(pdfDataRef.current.slice(0, 4))
        if (!header.startsWith('%PDF'))
          throw new Error(`Header không hợp lệ: "${header}"`)
        currentData = cloneU8(pdfDataRef.current)
      }
      // Fallback reload
      if (!currentData && src) {
        const response = await fetch(src)
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        const arrayBuffer = await response.arrayBuffer()
        currentData = cloneU8(new Uint8Array(arrayBuffer))
        pdfDataRef.current = cloneU8(currentData)
        setPdfBytes(cloneU8(currentData))
      }

      if (!currentData || currentData.length < 100)
        throw new Error(
          `Không thể lấy dữ liệu PDF hợp lệ. Size: ${
            currentData?.length || 0
          } bytes`
        )

      historyRef.current.push(cloneU8(currentData))
      setHistoryLength(historyRef.current.length)

      const pdfDocLib = await PDFDocument.load(currentData)
      const imageCache = new Map()

      for (const p of placements) {
        const page = pdfDocLib.getPages()[p.pageIndex]
        if (!page) continue
        const { pageWidth, pageHeight, scale } = pages[p.pageIndex]
        const x = p.xPx / scale
        const y = pageHeight - p.yPx / scale - p.hPx / scale
        const w = p.wPx / scale
        const h = p.hPx / scale

        // Validation để đảm bảo không có NaN
        if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
          console.error('NaN detected in placement calculation:', {
            x,
            y,
            w,
            h,
            placement: p
          })
          continue // Bỏ qua placement này
        }

        let img = imageCache.get(p.imageUrl)
        if (!img) {
          try {
            const imgBytes = await fetch(p.imageUrl).then(r => r.arrayBuffer())
            const lower = p.imageUrl.toLowerCase()
            try {
              img = lower.includes('.png', '.jpg')
                ? await pdfDocLib.embedPng(imgBytes)
                : await pdfDocLib.embedJpg(imgBytes)
            } catch {
              img = await pdfDocLib.embedPng(imgBytes)
            }
            imageCache.set(p.imageUrl, img)
          } catch (imgError) {
            console.error('Image embed error:', imgError)
            continue
          }
        }
        page.drawImage(img, { x, y, width: w, height: h })
      }

      const newBytes = await pdfDocLib.save()
      const finalData = cloneU8(new Uint8Array(newBytes))
      if (finalData.length < 4)
        throw new Error('PDF data quá ngắn sau khi xử lý')
      const header = new TextDecoder().decode(finalData.slice(0, 4))
      if (!header.startsWith('%PDF'))
        throw new Error('PDF data không hợp lệ sau khi xử lý')

      pdfDataRef.current = cloneU8(finalData)
      setPdfBytes(cloneU8(finalData))
      setPlacements([])
      setIsSignatureLocked(true)
      onLockChange?.(true)
      const signatureCount = placements.filter(
        p => p.type === 'signature'
      ).length
      const stampCount = placements.filter(p => p.type === 'stamp').length
      try {
        const blob = new Blob([finalData], { type: 'application/pdf' })
        let hashHex = ''
        if (window.crypto?.subtle) {
          const digest = await window.crypto.subtle.digest(
            'SHA-256',
            finalData.buffer
          )
          hashHex = Array.from(new Uint8Array(digest))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        }
        const objectUrl = URL.createObjectURL(blob)
        onCommit?.({
          bytes: finalData, // Uint8Array
          blob, // Blob PDF
          url: objectUrl, // ObjectURL xem/preview
          counts: { signature: signatureCount, stamp: stampCount },
          placementsBeforeCommit: placementsRef.current, // vị trí ảnh vừa ghi
          hashSha256: hashHex,
          committedAt: new Date().toISOString()
        })
      } catch (e) {
        console.error('onCommit callback error:', e)
      }
      let message = 'Đã lưu '
      if (signatureCount > 0) message += `${signatureCount} chữ ký`
      if (signatureCount > 0 && stampCount > 0) message += ' và '
      if (stampCount > 0) message += `${stampCount} con dấu`
      message += ' vào PDF. Chức năng kéo thả đã được khóa.'
      toast.success(message)
      try {
        if (pdfjs) {
          const loadingTask = pdfjs.getDocument({ data: cloneU8(finalData) })
          const newPdf = await loadingTask.promise
          setDocProxy(newPdf)
          const containerW = containerRef.current?.clientWidth || 900
          const nextPages = []
          for (let i = 1; i <= newPdf.numPages; i++) {
            const page = await newPdf.getPage(i)
            const viewport1 = page.getViewport({ scale: 1 })
            const pageWidth = viewport1.width
            const pageHeight = viewport1.height
            const scale = Math.min(2, (containerW - 40) / pageWidth)
            const widthPx = Math.round(pageWidth * scale)
            const heightPx = Math.round(pageHeight * scale)
            nextPages.push({
              pageIndex: i - 1,
              pageWidth,
              pageHeight,
              widthPx,
              heightPx,
              scale
            })
          }
          setPages(nextPages)
        }
      } catch (reloadErr) {
        console.error('Reload error:', reloadErr)
      }
    } catch (e) {
      console.error(e)
      toast.error('Lỗi khi lưu PDF. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Hàm xử lý khi click nút "Xác nhận lưu"
  const handleConfirmSave = () => {
    if (placements.length === 0) {
      toast.error('Không có chữ ký/con dấu để lưu.')
      return
    }
    if (isSignatureLocked) {
      toast.warning('Tài liệu đã được ký và khóa. Không thể thêm chữ ký mới.')
      return
    }
    setIsConfirmModalOpen(true)
  }

  // Hàm xử lý xác nhận từ modal
  const handleModalConfirm = () => {
    setIsConfirmModalOpen(false)
    commitOverlays()
  }

  // Hàm xử lý hủy modal
  const handleModalCancel = () => {
    setIsConfirmModalOpen(false)
  }

  const undoCommit = async () => {
    if (historyRef.current.length === 0) {
      toast.error('Không có lịch sử để hoàn tác')
      return
    }
    try {
      setLoading(true)
      const prev = historyRef.current.pop()
      setHistoryLength(historyRef.current.length)
      if (!prev || prev.length < 100)
        throw new Error(
          `Dữ liệu history không hợp lệ: ${prev?.length || 0} bytes`
        )
      const restoredData = cloneU8(prev)
      pdfDataRef.current = cloneU8(restoredData)
      setPdfBytes(cloneU8(restoredData))
      setPlacements([])

      setIsSignatureLocked(false)
      addDebugLog(`✅ Đã hoàn tác: ${restoredData.length} bytes`)
      toast.success('Đã hoàn tác thành công. Có thể chỉnh sửa lại.')
    } catch (e) {
      console.error('Restore error:', e)
      toast.error('Không thể khôi phục phiên bản trước đó. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Lưu PDF (mock)
  const savePdfToServer = async () => {
    if (
      (!pdfBytes || pdfBytes.length === 0) &&
      (!pdfDataRef.current || pdfDataRef.current.length === 0) &&
      src
    ) {
      try {
        const response = await fetch(src)
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        const arrayBuffer = await response.arrayBuffer()
        const uint8Data = cloneU8(new Uint8Array(arrayBuffer))
        if (uint8Data.length > 0) {
          pdfDataRef.current = cloneU8(uint8Data)
          setPdfBytes(cloneU8(uint8Data))
        } else {
          throw new Error('File PDF rỗng sau khi reload')
        }
      } catch (reloadError) {
        toast.error('Không thể tải lại PDF. Vui lòng thử lại.')
        return
      }
    }

    let dataToSave = null
    if (pdfBytes && pdfBytes.length > 0) {
      dataToSave = cloneU8(pdfBytes)
    } else if (pdfDataRef.current && pdfDataRef.current.length > 0) {
      dataToSave = cloneU8(pdfDataRef.current)
    } else {
      toast.error('Không có dữ liệu PDF để lưu')
      return
    }
    if (dataToSave.length === 0) {
      toast.error('Dữ liệu PDF rỗng')
      return
    }

    setLoading(true)
    const formData = new FormData()
    const blob = new Blob([dataToSave], { type: 'application/pdf' })
    formData.append('file', blob, 'signed_document.pdf')
    onSubmit(formData)
  }

  if (loading && !docProxy)
    return (
      <div className='flex items-center justify-center h-full text-gray-600'>
        Đang tải PDF...
      </div>
    )
  if (error)
    return (
      <div className='flex items-center justify-center h-full text-red-500'>
        Lỗi: {error}
      </div>
    )
  if (!src)
    return (
      <div className='flex items-center justify-center h-full text-gray-500'>
        Không có file PDF để hiển thị
      </div>
    )

  return (
    <div className='w-full h-full flex flex-col max-h-screen min-h-[50vh] sm:min-h-0'>
      {isEnabled && (
        <div className='px-2 sm:px-3 py-2 bg-blue-50 border border-blue-200 rounded flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs sm:text-sm mb-3 flex-shrink-0'>
          <div className='text-blue-700 flex-1'>
            {isSignatureLocked
              ? 'Tài liệu đã được ký và khóa. Không thể thêm chữ ký/con dấu mới.'
              : 'Kéo chữ ký / con dấu từ panel bên phải và thả trực tiếp lên trang PDF.'}
          </div>
          <div className='flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end'>
            {/* Nút Tải PDF hiện tại */}
            {/* <button
              className='px-2 sm:px-3 py-1 rounded bg-green-600 text-white hover:opacity-90 disabled:opacity-50 text-xs sm:text-sm'
              onClick={downloadCurrentPdf}
              disabled={loading || (!pdfBytes && !pdfDataRef.current)}
              title='Tải xuống file PDF hiện tại (đã commit chữ ký/con dấu nếu có)'
            >
              Tải PDF
            </button> */}

            <button
              className={`px-2 sm:px-3 py-1 rounded text-white hover:opacity-90 disabled:opacity-50 text-xs sm:text-sm ${
                isSignatureLocked
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#2F54EB]'
              }`}
              onClick={handleConfirmSave}
              disabled={
                placements.length === 0 ||
                (!pdfBytes && !pdfDataRef.current && !src) ||
                isSignatureLocked
              }
              title={
                isSignatureLocked
                  ? 'Tài liệu đã được ký và khóa'
                  : placements.length === 0
                  ? 'Chưa có overlay để lưu'
                  : 'Ghi chữ ký/con dấu vào PDF'
              }
            >
              {isSignatureLocked ? 'Đã khóa' : 'Xác nhận'}
            </button>

            {/* <button
              className='px-3 py-1 rounded bg-red-600 text-white hover:opacity-90 disabled:opacity-50'
              onClick={savePdfToServer}
            >
              Lưu
            </button> */}

            {/* Nút Undo chỉ hiển thị khi có lịch sử */}
            {/* {canUndo && (
              <button
                className='px-3 py-1 rounded bg-orange-600 text-white hover:opacity-90 disabled:opacity-50'
                onClick={undoCommit}
                disabled={loading}
                title='Hoàn tác về trạng thái trước đó'
              >
                Hoàn tác
              </button>
            )} */}
          </div>
        </div>
      )}

      {savedFileInfo && (
        <div className='px-2 sm:px-3 py-2 bg-green-50 border border-green-200 rounded flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs sm:text-sm mb-3 flex-shrink-0'>
          <div className='text-green-700 flex-1'>
            ✅ PDF đã được lưu vĩnh viễn: {savedFileInfo.filename} (lúc{' '}
            {savedFileInfo.savedAt})
          </div>
          <a
            href={savedFileInfo.url}
            target='_blank'
            rel='noopener noreferrer'
            className='px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 self-end sm:self-auto'
          >
            Xem file
          </a>
        </div>
      )}

      <div
        data-pdf-container="true"
        ref={containerRef}
        className={`flex-1 overflow-auto rounded-lg ${
          isDragOver ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white'
        }`}
        onDragOver={handleDragOverContainer}
        onDragEnter={handleDragOverContainer}
        onDragLeave={handleDragLeaveContainer}
        onDrop={handleDropContainer}
        onTouchStart={(e) => {
          // Ngăn scroll khi bắt đầu touch trên container (khi có drag đang diễn ra)
          if (isDragOver && isMobile) {
            e.preventDefault()
            if (document.body) {
              document.body.style.overflow = 'hidden'
              document.body.style.touchAction = 'none'
            }
          }
        }}
        onTouchEnd={(e) => {
          // Khôi phục scroll khi kết thúc touch
          if (isMobile && document.body) {
            document.body.style.overflow = ''
            document.body.style.touchAction = ''
          }
        }}
        style={{
          height: containerHeight,
          maxHeight: containerHeight,
          padding: isMobile ? 6 : 12
        }}
      >
        {pages.map(pg => (
          <div
            key={pg.pageIndex}
            className='mb-2 sm:mb-4 bg-white border rounded-lg shadow-sm overflow-hidden'
            style={{ 
              width: '100%',
              maxWidth: isMobile ? '100%' : `${pg.widthPx}px`
            }}
          >
            <div className='px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-600 bg-gray-50 border-b sticky top-0 z-10'>
              Trang {pg.pageIndex + 1}/{pages.length}
            </div>
            <div
              className='relative'
              style={{
                width: isMobile ? '100%' : pg.widthPx,
                height: isMobile ? 'auto' : pg.heightPx,
                margin: '0 auto',
                aspectRatio: isMobile ? `${pg.widthPx} / ${pg.heightPx}` : 'auto',
                transform: isMobile ? `scale(${scaleFactor})` : 'none',
                transformOrigin: 'center top'
              }}
            >
              <canvas
                ref={el => (canvasRefs.current[pg.pageIndex] = el)}
                className='block w-full h-auto'
                style={{
                  width: isMobile ? '100%' : pg.widthPx,
                  height: isMobile ? 'auto' : pg.heightPx,
                  userSelect: 'none',
                  maxWidth: '100%'
                }}
              />
              <div
                ref={el => (overlayRefs.current[pg.pageIndex] = el)}
                className='absolute inset-0 pointer-events-auto'
                style={{ 
                  touchAction: 'none',
                  width: '100%',
                  height: '100%'
                }}
              >
                {placements
                  .filter(p => p.pageIndex === pg.pageIndex)
                  .map(p => (
                    <div
                      key={p.id}
                      data-placement-id={p.id}
                      className={`absolute group ${
                        draggingId === p.id || resizingId === p.id
                          ? 'opacity-90 z-50'
                          : 'opacity-100 z-40'
                      }`}
                      style={{
                        transform: `translate(${p.xPx}px, ${p.yPx}px)`,
                        width: p.wPx,
                        height: p.hPx,
                        willChange: 'transform',
                        left: 0,
                        top: 0,
                        cursor: isSignatureLocked ? 'not-allowed' : 'move',
                        boxShadow:
                          draggingId === p.id || resizingId === p.id
                            ? '0 0 10px rgba(0,0,255,0.5)'
                            : 'none',
                        border: `1px dashed ${
                          resizingId === p.id
                            ? 'rgba(0,0,255,0.5)'
                            : p.type === 'signature'
                            ? 'rgba(0,0,255,0.3)'
                            : p.type === 'hand-signature'
                            ? 'rgba(0,255,0,0.3)'
                            : 'rgba(255,0,0,0.3)'
                        }`,
                        backgroundColor: isSignatureLocked
                          ? 'rgba(128,128,128,0.1)'
                          : 'rgba(255,255,255,0.1)',
                        opacity: isSignatureLocked ? 0.7 : 1
                      }}
                      onMouseDown={e =>
                        !isSignatureLocked && startDragPlacement(e, p.id)
                      }
                      onTouchStart={e => {
                        if (!isSignatureLocked) {
                          // Ngăn scroll ngay khi touch bắt đầu
                          e.preventDefault()
                          if (isMobile && document.body) {
                            document.body.style.overflow = 'hidden'
                            document.body.style.touchAction = 'none'
                          }
                          startDragPlacement(e, p.id)
                        }
                      }}
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.type}
                        draggable={false}
                        className='w-full h-full object-contain select-none pointer-events-none rounded'
                        title={
                          isSignatureLocked
                            ? `${
                                p.type === 'signature'
                                  ? 'Chữ ký'
                                  : p.type === 'hand-signature'
                                  ? 'Chữ ký tay'
                                  : 'Con dấu'
                              } - Đã khóa`
                            : p.type === 'signature'
                            ? 'Chữ ký - Kéo để di chuyển, Resize tại góc'
                            : p.type === 'hand-signature'
                            ? 'Chữ ký tay - Kéo để di chuyển, Resize tại góc'
                            : 'Con dấu - Kéo để di chuyển, Resize tại góc'
                        }
                        loading='lazy'
                      />
                      {!isSignatureLocked && (
                        <div className='absolute opacity-0 group-hover:opacity-100 transition'>
                          {/* Nút xóa cho signature có resize - đặt ở giữa trên */}
                          {(p.type === 'signature' ||
                            p.type === 'hand-signature') && (
                            <button
                              className='absolute -top-3 left-1/2 transform -translate-x-1/2 px-2 py-1 sm:px-1.5 sm:py-0.5 text-xs rounded bg-red-500 text-white shadow hover:bg-red-600 z-50 touch-manipulation min-w-[24px] min-h-[24px] sm:min-w-auto sm:min-h-auto'
                              onClick={e => {
                                e.stopPropagation()
                                removePlacement(p.id)
                              }}
                              title={`Xoá ${
                                p.type === 'signature' ? 'chữ ký' : 'chữ ký tay'
                              }`}
                            >
                              ✕
                            </button>
                          )}
                          {/* Nút xóa cho stamp - đặt ở góc trên phải như cũ */}
                          {p.type === 'stamp' && (
                            <button
                              className='absolute -top-2 -right-2 px-2 py-1 sm:px-1.5 sm:py-0.5 text-xs rounded bg-red-500 text-white shadow hover:bg-red-600 touch-manipulation min-w-[24px] min-h-[24px] sm:min-w-auto sm:min-h-auto'
                              onClick={e => {
                                e.stopPropagation()
                                removePlacement(p.id)
                              }}
                              title='Xoá con dấu'
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                      {(p.type === 'signature' ||
                        p.type === 'hand-signature') &&
                        !isSignatureLocked && (
                          <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                            <div
                              className='absolute -top-1 -left-1 w-4 h-4 sm:w-3 sm:h-3 bg-blue-500 rounded-full cursor-nw-resize border border-white shadow touch-manipulation'
                              onMouseDown={e => startResize(e, p.id, 'nw')}
                              onTouchStart={e => {
                                // Ngăn scroll ngay khi touch bắt đầu resize
                                e.preventDefault()
                                if (isMobile && document.body) {
                                  document.body.style.overflow = 'hidden'
                                  document.body.style.touchAction = 'none'
                                }
                                startResize(e, p.id, 'nw')
                              }}
                              title={`Resize ${
                                p.type === 'hand-signature'
                                  ? 'chữ ký tay'
                                  : 'chữ ký'
                              }`}
                            />
                            <div
                              className='absolute -top-1 -right-1 w-4 h-4 sm:w-3 sm:h-3 bg-blue-500 rounded-full cursor-ne-resize border border-white shadow touch-manipulation'
                              onMouseDown={e => startResize(e, p.id, 'ne')}
                              onTouchStart={e => {
                                // Ngăn scroll ngay khi touch bắt đầu resize
                                e.preventDefault()
                                if (isMobile && document.body) {
                                  document.body.style.overflow = 'hidden'
                                  document.body.style.touchAction = 'none'
                                }
                                startResize(e, p.id, 'ne')
                              }}
                              title={`Resize ${
                                p.type === 'hand-signature'
                                  ? 'chữ ký tay'
                                  : 'chữ ký'
                              }`}
                            />
                            <div
                              className='absolute -bottom-1 -left-1 w-4 h-4 sm:w-3 sm:h-3 bg-blue-500 rounded-full cursor-sw-resize border border-white shadow touch-manipulation'
                              onMouseDown={e => startResize(e, p.id, 'sw')}
                              onTouchStart={e => {
                                // Ngăn scroll ngay khi touch bắt đầu resize
                                e.preventDefault()
                                if (isMobile && document.body) {
                                  document.body.style.overflow = 'hidden'
                                  document.body.style.touchAction = 'none'
                                }
                                startResize(e, p.id, 'sw')
                              }}
                              title={`Resize ${
                                p.type === 'hand-signature'
                                  ? 'chữ ký tay'                          
                                  : 'chữ ký'
                              }`}
                            />
                            {/* Resize handle removed - functionality disabled */}
                          </div>
                        )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title='Xác nhận lưu chữ ký'
        message={`Bạn có chắc chắn muốn thêm ${
          placements.filter(p => p.type === 'signature').length > 0
            ? placements.filter(p => p.type === 'signature').length + ' chữ ký'
            : ''
        }${
          placements.filter(p => p.type === 'signature').length > 0 &&
          placements.filter(p => p.type === 'stamp').length > 0
            ? ' và '
            : ''
        }${
          placements.filter(p => p.type === 'stamp').length > 0
            ? placements.filter(p => p.type === 'stamp').length + ' con dấu'
            : ''
        } vào tài liệu không?\n\nSau khi xác nhận, bạn sẽ không thể thay đổi hay thêm chữ ký/con dấu mới.`}
        confirmText='Xác nhận'
        cancelText='Hủy'
        confirmButtonClass='bg-blue-500 hover:bg-blue-600 text-white'
        confirmIcon={<span className='mr-2'>✓</span>}
        onConfirm={handleModalConfirm}
        onClose={handleModalCancel}
        fontBold={true}
      />
    </div>
  )
}
