'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  Phone,
  UserPlus,
  Eye,
  Download,
  PinIcon,
  Image,
  FileText,
  Link
} from 'lucide-react'
import FormAddGroup from '@/components/Chats/FormAddGroup'
import AvatarWithFrame from '../avatars/avatarFrame'
import { CreateChat } from '@/lib/api/chatsApi'
import RenderFileToken from '@/components/controls/renderFileTokens/RenderFileToken'
import SelectFileItem from '@/components/files/SelectFileItem'
import { ImageAdvanced } from '@/components/Form'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '../Form'
import { aggregateChatAttachments } from '@/helpers/chatAttachmentHelpers'

export default function IndividualInfoSidebar ({
  showInfo,
  currentChat,
  onPinChat,
  messages = []
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(2) // 2: 'photos', 4: 'documents', 3: 'links'
  const [photosList, setPhotosList] = useState([]) // Tab 2: photos
  const [documentsList, setDocumentsList] = useState([]) // Tab 4: documents
  const [linksList, setLinksList] = useState([]) // Tab 3: links
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const handleIsOpenFormAddGroup = () => {
    setIsOpen(true)
  }

  const handleCreateGroup = async formData => {
    try {
      const response = await CreateChat(formData)
      if (response?.status === 200) {
        toast.success('Tạo nhóm thành công!')
      } else {
        toast.error('Không thể tạo nhóm. Vui lòng thử lại!')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Đã xảy ra lỗi khi tạo nhóm!')
    }
  }

  const refreshAttachments = useCallback(() => {
    setIsLoading(true)
    const { photos, documents, links } = aggregateChatAttachments(messages)
    setPhotosList(photos)
    setDocumentsList(documents)
    setLinksList(links)
    setIsLoading(false)
  }, [messages])

  useEffect(() => {
    if (currentChat?.id) {
      refreshAttachments()
      return
    }
    setPhotosList([])
    setDocumentsList([])
    setLinksList([])
  }, [currentChat?.id, refreshAttachments])

  const onSelectFile = () => {}

  if (!showInfo) return null

  return (
    <>
      <div
        className={`w-80 border-l border-gray-200 bg-white transform transition-transform duration-300 ease-in-out ${
          showInfo ? 'translate-x-0' : 'translate-x-full'
        } ${showInfo ? 'flex' : 'hidden'} flex-col`}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <h3 className='text-lg font-semibold'>Thông tin hội thoại</h3>
        </div>

        <div className='flex-1 overflow-y-auto p-4'>
          <div className='flex flex-col items-center mb-6'>
            <AvatarWithFrame
              avatarPath={currentChat?.avatar}
              altAvatar={currentChat?.name || 'Avatar'}
              size={40}
            />
            <h4 className='text-lg font-semibold text-gray-900 mb-1'>
              {currentChat?.name || 'Nguyễn Thanh Sang'}
            </h4>
            <p className='text-sm text-gray-500'></p>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-around mb-6'>
            <Button
              className='flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg'
              variant='ghost'
              onClick={() => onPinChat(currentChat?.id)}
            >
              <div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center'>
                <PinIcon size={20} className='text-gray-600' />
              </div>
              <span className='text-xs text-gray-600'>Ghim hội thoại</span>
            </Button>
            <Button
              onClick={handleIsOpenFormAddGroup}
              className='flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg'
              variant='ghost'
            >
              <div className='w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center'>
                <UserPlus size={20} className='text-gray-600' />
              </div>
              <span className='text-xs text-gray-600'>Tạo nhóm</span>
            </Button>
          </div>

          {/* File Tabs */}
          <div className='mb-4'>
            {/* Tab Navigation */}
            <div className='flex justify-between items-center mb-3 border-b border-gray-200'>
              <button
                onClick={() => setActiveTab(2)}
                className={`flex items-center gap-1 text-sm font-medium py-2 px-3 border-b-2 transition-all ${
                  activeTab === 2
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-800'
                }`}
              >
                <Image size={16} />
                Hình ảnh
              </button>
              <button
                onClick={() => setActiveTab(4)}
                className={`flex items-center gap-1 text-sm font-medium py-2 px-3 border-b-2 transition-all ${
                  activeTab === 4
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-800'
                }`}
              >
                <FileText size={16} />
                Tài liệu
              </button>
              <button
                onClick={() => setActiveTab(3)}
                className={`flex items-center gap-1 text-sm font-medium py-2 px-3 border-b-2 transition-all ${
                  activeTab === 3
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-800'
                }`}
              >
                <Link size={16} />
                Link
              </button>
            </div>

            {/* Photos Tab Content */}
            {activeTab === 2 && !isLoading && (
              <div className='grid grid-cols-3 gap-1 mb-3'>
                {photosList.length > 0 ? (
                  photosList.map((photo, index) => (
                    <div
                      key={photo.id || index}
                      className='aspect-square bg-gray-200 rounded-lg overflow-hidden'
                    >
                      <RenderFileToken
                        pathFile={photo.file}
                        isPrivate={true}
                        Component={({ src }) => {
                          return (
                            <ImageAdvanced
                              src={src}
                              alt={photo.fullName}
                              type='avatar'
                              width={300}
                              height={400}
                              className='w-full h-full object-cover'
                              onError={() => setImgSrc('/placeholder.svg')}
                            />
                          )
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className='col-span-3 text-center py-3 text-gray-500'>
                    Không có hình ảnh nào
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab Content */}
            {activeTab === 4 && !isLoading && (
              <div className='space-y-3 mb-3'>
                {documentsList.length > 0 ? (
                  documentsList.map((doc, index) => (
                    <div
                      key={doc.id || index}
                      className='p-2 rounded-lg flex items-center w-full'
                    >
                      <SelectFileItem
                        file={doc}
                        isCandelete={false}
                        onSelectFile={d => () => {
                          onSelectFile(d)
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className='text-center py-3 text-gray-500'>
                    Không có tài liệu nào
                  </div>
                )}
              </div>
            )}

            {/* Links Tab Content */}
            {activeTab === 3 && !isLoading && (
              <div className='space-y-2 mb-3'>
                {linksList.length > 0 ? (
                  linksList.map((link, index) => (
                    <div
                      key={link.id || index}
                      className='p-2 border border-gray-200 rounded-lg'
                      onClick={() => window.open(link.file, '_blank')}
                    >
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3'>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='text-gray-600'
                          >
                            <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'></path>
                            <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'></path>
                          </svg>
                        </div>
                        <div className='flex-1'>
                          <p className='font-medium text-sm text-gray-800 truncate'>
                            {(() => {
                              const displayText =
                                link.file || link.url || `Link ${index + 1}`
                              const maxLength = 30
                              return displayText.length > maxLength
                                ? `${displayText.substring(0, maxLength)}...`
                                : displayText
                            })()}
                          </p>
                          <p className='text-xs text-gray-500'>
                            Chia sẻ ngày{' '}
                            {new Date(link.createdDate).toLocaleDateString(
                              'vi-VN'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-3 text-gray-500'>
                    Không có liên kết nào
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isOpen && (
        <FormAddGroup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleCreateGroup}
          currentChatUser={{
            id: currentChat?.userID,
            name: currentChat?.name
          }}
        />
      )}
    </>
  )
}
