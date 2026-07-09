'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { X, Search, MessageCircle, Image, FileText, LinkIcon } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import AvatarWithFrame from '../avatars/avatarFrame'

const normalizeSearchText = value =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const getMessageId = message => message?.id || message?.ID

const parseArrayField = value => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getMessageFiles = message =>
  parseArrayField(message?.chatFiles || message?.ChatFiles || message?.files).map(file => ({
    name: file?.FileName || file?.fileName || file?.name || '',
    extension: file?.Extension || file?.extension || '',
    type: file?.fileType || file?.type || ''
  }))

const getMessageLinks = message => {
  const value = message?.chatLinks || message?.ChatLinks || ''
  if (!value) return []
  if (Array.isArray(value)) return value.map(link => String(link))
  return String(value)
    .split(/[\s,]+/)
    .filter(link => /^https?:\/\//i.test(link))
}

const getMessageContent = message =>
  message?.content || message?.Content || message?.message || ''

const getSenderName = message =>
  message?.senderName || message?.SenderName || 'Người dùng'

const getSenderAvatar = message =>
  message?.senderAvatar || message?.SenderAvatar || ''

const getCreatedDate = message =>
  message?.createdDate || message?.CreatedDate || message?.timestamp || ''

const getResultType = message => {
  const files = getMessageFiles(message)
  if (files.some(file => file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name))) {
    return { label: 'Hình ảnh', icon: Image }
  }

  if (files.length > 0) {
    return { label: 'Tệp', icon: FileText }
  }

  if (getMessageLinks(message).length > 0) {
    return { label: 'Liên kết', icon: LinkIcon }
  }

  return { label: 'Tin nhắn', icon: MessageCircle }
}

const getSearchableText = message =>
  [
    getMessageContent(message),
    getSenderName(message),
    ...getMessageFiles(message).map(file => `${file.name} ${file.extension}`),
    ...getMessageLinks(message)
  ].join(' ')

export default function SearchModal ({
  isOpen,
  onClose,
  chatId,
  messages = [],
  allMessages = [],
  onSelectMessage
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredResults, setFilteredResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceSearch = useDebounce(searchTerm, 500)
  const localSearchSource = useMemo(
    () => (allMessages.length > 0 ? allMessages : messages),
    [allMessages, messages]
  )

  // Clear search term when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setFilteredResults([])
    }
  }, [isOpen])

  useEffect(() => {
    if (!debounceSearch.trim() || !chatId) {
      setFilteredResults([])
      setIsLoading(false)
      return
    }

    const keyword = normalizeSearchText(debounceSearch)
    const localResults = localSearchSource
      .filter(message => normalizeSearchText(getSearchableText(message)).includes(keyword))
      .sort((a, b) => new Date(getCreatedDate(b) || 0) - new Date(getCreatedDate(a) || 0))

    setFilteredResults(localResults)
    setIsLoading(false)
  }, [debounceSearch, chatId, localSearchSource])

  if (!isOpen) return null

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end'
      style={{ zIndex: 99999 }}
    >
      <div
        className='w-[420px] h-full bg-white flex flex-col shadow-2xl'
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200 bg-white'>
          <h3 className='text-lg font-medium text-gray-900'>
            Tìm kiếm tin nhắn
          </h3>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 rounded-full transition-colors'
          >
            <X size={20} className='text-gray-600' />
          </button>
        </div>

        {/* Search Input */}
        <div className='p-4 border-b border-gray-200'>
          <div className='relative'>
            <Search
              size={18}
              className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
            />
            <input
              type='text'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all text-sm placeholder-gray-500'
              placeholder='Nhập từ khóa vào ô tìm kiếm để tìm tin nhắn, tệp, hình ảnh hoặc liên kết trong cuộc trò chuyện này'
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-auto'>
          {!searchTerm.trim() ? (
            <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                <Search size={24} className='text-gray-400' />
              </div>
              <h4 className='text-lg font-medium text-gray-900 mb-2'>
                Tìm kiếm tin nhắn
              </h4>
              <p className='text-sm text-gray-500 max-w-xs'>
                Nhập từ khóa vào ô tìm kiếm để tìm tin nhắn, tệp, hình ảnh hoặc
                liên kết trong cuộc trò chuyện này
              </p>
            </div>
          ) : isLoading ? (
            <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
              <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4'></div>
              <p className='text-sm text-gray-500'>Đang tìm kiếm...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                <MessageCircle size={24} className='text-gray-400' />
              </div>
              <h4 className='text-lg font-medium text-gray-900 mb-2'>
                Không tìm thấy kết quả
              </h4>
              <p className='text-sm text-gray-500 max-w-xs'>
                Thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả
              </p>
            </div>
          ) : (
            <div className='p-4 space-y-3'>
              {filteredResults.map((message, index) => (
                <div
                  key={getMessageId(message) || index}
                  className='border-b border-gray-100 pb-3 hover:bg-gray-50 p-2 rounded transition-colors cursor-pointer'
                  onClick={() =>
                    onSelectMessage && onSelectMessage(getMessageId(message), message)
                  }
                >
                  <div className='flex items-start gap-3'>
                    {getSenderAvatar(message) ? (
                        <AvatarWithFrame
                          avatarPath={getSenderAvatar(message)}
                          altAvatar={getSenderName(message)}
                          size={40}
                        />
                    ) : (
                      <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0'>
                        {getSenderName(message)?.charAt(0) || 'A'}
                      </div>
                    )}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-sm font-medium text-gray-900'>
                          {getSenderName(message)}
                        </span>
                        <span className='text-xs text-gray-500'>
                          {getCreatedDate(message)
                            ? new Date(getCreatedDate(message)).toLocaleString(
                                'vi-VN',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }
                              )
                            : ''}
                        </span>
                      </div>
                      <p className='text-sm text-gray-700 mb-2 line-clamp-3'>
                        {getMessageContent(message) ||
                          getMessageFiles(message)[0]?.name ||
                          getMessageLinks(message)[0] ||
                          'Tin nhắn có tệp đính kèm'}
                      </p>
                      <div className='mb-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
                        {(() => {
                          const type = getResultType(message)
                          const Icon = type.icon
                          return (
                            <>
                              <Icon size={12} />
                              <span>{type.label}</span>
                            </>
                          )
                        })()}
                      </div>
                      {getMessageFiles(message).length > 0 && (
                        <div className='flex flex-wrap gap-2'>
                          {getMessageFiles(message).map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className='inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs'
                            >
                              {file.type?.startsWith('image/') ? (
                                <Image size={12} />
                              ) : file.type?.includes('pdf') ||
                                file.extension?.toLowerCase() === 'pdf' ? (
                                <FileText size={12} className='text-red-500' />
                              ) : (
                                <FileText size={12} />
                              )}
                              <span className='truncate max-w-32'>
                                {file.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
