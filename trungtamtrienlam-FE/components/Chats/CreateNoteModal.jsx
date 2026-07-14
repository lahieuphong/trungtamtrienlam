'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { Button } from '../Form'

export default function CreateNoteModal({ isOpen, onClose, onSubmit, currentChat }) {
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  if (!isOpen || typeof document === 'undefined') return null

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!content.trim()) {
      return
    }

    if (typeof onSubmit !== 'function') {
      console.error('CreateNoteModal requires an onSubmit function')
      return
    }

    const noteData = {
      note: content.trim(),
      isPinned: isPinned,
      chatId: currentChat?.id || null,
      createdAt: new Date().toISOString()
    }

    onSubmit(noteData)
    
    // Reset form
    setContent('')
    setIsPinned(false)
  }

  const handleClose = () => {
    setContent('')
    setIsPinned(false)
    onClose()
  }

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10001] bg-white rounded-lg w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Tạo ghi chú</h2>
          <Button 
            onClick={handleClose}
            variant="ghost"
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung mới"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={6}
              required
            />
          </div>

          {/* Pin Option */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Ghim lên đầu trò chuyện</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
            >
              <X size={20} className='mr-2'/>  Đóng
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <Check size={20} className='mr-2'/>  Hoàn tất
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
