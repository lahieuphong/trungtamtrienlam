'use client'
import React, { useState, useEffect } from 'react'
import { Search, X, ArrowLeft, Calendar } from 'lucide-react'

const SearchInGroupModal = ({ isOpen, onClose, currentChat, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterType, setFilterType] = useState('all') // all, images, files, links

  // Dummy data for demonstration
  const dummyResults = [
    {
      id: 1,
      content: 'Chào mọi người, mình vừa gửi báo cáo',
      sender: 'Nguyễn Văn A',
      timestamp: '2023-09-20T09:30:00',
      type: 'text'
    },
    {
      id: 2,
      content: 'Đây là file báo cáo tháng 9',
      sender: 'Trần Thị B',
      timestamp: '2023-09-20T10:15:00',
      type: 'file',
      fileName: 'bao-cao-thang9.pdf'
    },
    {
      id: 3,
      content: 'Link đến tài liệu tham khảo',
      sender: 'Lê Văn C',
      timestamp: '2023-09-21T08:45:00',
      type: 'link',
      url: 'https://example.com/docs'
    },
    {
      id: 4,
      content: 'Ảnh cuộc họp',
      sender: 'Phạm Thị D',
      timestamp: '2023-09-22T14:20:00',
      type: 'image',
      imageUrl: '/avatar.png'
    }
  ]

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    
    // Simulate API call for searching messages
    setTimeout(() => {
      const filtered = dummyResults.filter(result => {
        if (filterType !== 'all' && result.type !== filterType) return false
        return result.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
               result.sender.toLowerCase().includes(searchTerm.toLowerCase())
      })
      setSearchResults(filtered)
      setIsLoading(false)
    }, 500)
    
    // In a real application, you would make an API call here
    // const searchMessages = async () => {
    //   try {
    //     const response = await fetch(`/api/chats/${currentChat.id}/search?query=${searchTerm}&type=${filterType}`)
    //     const data = await response.json()
    //     setSearchResults(data.results)
    //   } catch (error) {
    //     console.error('Error searching messages:', error)
    //   } finally {
    //     setIsLoading(false)
    //   }
    // }
    // searchMessages()
  }, [searchTerm, filterType])

  if (!isOpen) return null

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-[999999] flex items-start justify-end">
      <div className="w-[420px] h-full bg-white flex flex-col shadow-xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
          <button onClick={onClose} className="p-1">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 bg-gray-100 rounded-full px-3 py-2 flex items-center">
            <Search size={16} className="text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent w-full outline-none text-sm"
              placeholder="Tìm kiếm trong nhóm..."
              autoFocus
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-1">
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setFilterType('all')} 
            className={`flex-1 py-2 text-sm font-medium ${filterType === 'all' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setFilterType('image')} 
            className={`flex-1 py-2 text-sm font-medium ${filterType === 'image' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            Hình ảnh
          </button>
          <button 
            onClick={() => setFilterType('file')} 
            className={`flex-1 py-2 text-sm font-medium ${filterType === 'file' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            Tài liệu
          </button>
          <button 
            onClick={() => setFilterType('link')} 
            className={`flex-1 py-2 text-sm font-medium ${filterType === 'link' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            Liên kết
          </button>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : searchTerm ? (
            searchResults.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {searchResults.map((result) => (
                  <div key={result.id} className="p-3 hover:bg-gray-50 cursor-pointer">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">{result.sender}</span>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar size={12} className="mr-1" />
                        <span>{formatDate(result.timestamp)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {result.type === 'file' && '📄 '}
                      {result.type === 'link' && '🔗 '}
                      {result.type === 'image' && '🖼️ '}
                      {result.content}
                    </p>
                    {result.type === 'image' && (
                      <div className="mt-2 h-32 bg-gray-100 rounded overflow-hidden">
                        <img 
                          src={result.imageUrl} 
                          alt={result.content}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p>Không tìm thấy kết quả phù hợp</p>
              </div>
            )
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>Nhập từ khóa để tìm kiếm</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchInGroupModal