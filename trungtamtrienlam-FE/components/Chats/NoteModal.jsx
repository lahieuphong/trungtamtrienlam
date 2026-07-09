import React, { useState, useEffect } from 'react'
import { X, Pencil } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'
import { getNotesByNoteID, updateNote } from '@/lib/api/chatsApi'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { Button } from '../Form'
export default function NoteModal ({ isOpen, onClose, eventID, onUpdate }) {
  const [listNote, setListNote] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const { userInfo } = useLoadLocalStorage()
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        if (eventID) {
          const response = await getNotesByNoteID(eventID)
          setListNote(response.data.data || [])
          setContent(response.data.data?.note || '')
        }
      } catch (error) {
        console.error(`Error fetching data for ${eventID}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [eventID])

  if (!isOpen) return null

  const handleUpdateNote = async () => {
    setIsUpdating(true)
    const noteData = {
      ID: eventID,
      note: content
    }
    onUpdate(noteData)
    setIsUpdating(false)
    onClose()
  }

  const formatDate = dateString => {
    if (!dateString) return 'Hôm nay'
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) return 'Hôm nay'

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const noteDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )

      if (noteDate.getTime() === today.getTime()) {
        return `Hôm nay, ${format(date, 'HH:mm')}`
      } else {
        return format(date, 'dd/MM/yyyy, HH:mm', { locale: vi })
      }
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Hôm nay'
    }
  }

  return (
    <div className='fixed inset-0 bg-black/30 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='flex justify-between items-center border-b p-4'>
          <h3 className='text-lg font-medium'>Ghi chú</h3>
          <Button
            variant='ghost'
            className='text-2xl text-gray-500 hover:text-gray-700'
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className='p-4 overflow-auto flex-1'>
          <p className='text-sm text-gray-500 mb-2'>
            Tạo bởi {listNote.createdName || ''} -{' '}
            {formatDate(listNote.createdDate)}
          </p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder='Nhập nội dung mới'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
            rows={6}
            required
            disabled={
              isLoading || isUpdating || listNote.createdBy !== userInfo.userID
            }
          />
        </div>

        {/* Footer */}
        <div className='border-t p-3 flex justify-end'>
          <Button
            variant='ghost'
            className='px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 mr-2'
            onClick={onClose}
          >
            <X size={20} /> Đóng
          </Button>
          {listNote.createdBy === userInfo.userID && (
            <Button    
              className='px-4 py-2 bg-[#597EF7] border border-gray-300 rounded-md hover:bg-blue-400 flex items-center gap-2'
              onClick={handleUpdateNote}
              disabled={isLoading || isUpdating}
            >
              <Pencil size={18} />
              {isUpdating ? 'Đang cập nhật...' : 'Lưu'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
