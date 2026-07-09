'use client'
import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  Edit3,
  ChevronRight,
  ChevronLeft,
  Users,
  Check,
  X,
  Search,
  Camera
} from 'lucide-react'
import AvatarWithFrame from '../avatars/avatarFrame'
import { Button, Input } from '../Form'
export default function ChatHeader ({
  currentChat,
  showGroupInfo,
  onToggleGroupInfo,
  onUpdateChatName,
  onUpdateChatAvatar,
  activeTab,
  isAI,
  onOpenSearch
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const inputRef = useRef(null)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleEditClick = () => {
    if (currentChat?.name) {
      setEditName(currentChat.name)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    const nextName = editName.trim()
    if (nextName && nextName !== currentChat?.name) {
      try {
        await onUpdateChatName?.(currentChat.id, nextName)
        setIsEditing(false)
      } catch (error) {
        console.error('Error updating chat name:', error)
      }
    } else {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditName('')
  }

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleAvatarChange = async e => {
    const file = e.target.files?.[0]

    if (!file || !currentChat?.id) return

    try {
      await onUpdateChatAvatar?.(currentChat.id, file)
    } catch (error) {
      console.error('Error updating chat avatar:', error)
    } finally {
      e.target.value = ''
    }
  }

  if (!currentChat) {
    return null
  }

  const canUpdateGroupAvatar =
    !isAI &&
    (currentChat?.type === 'group' || activeTab === 'groups') &&
    onUpdateChatAvatar

  return (
    <div className='p-4 border-b border-gray-200 bg-white'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Button className='p-2 hover:bg-gray-100 rounded-full lg:hidden'>
            <ArrowLeft size={20} />
          </Button>

          {isAI ? (
            <Image
              src='/TTBT_icon_anim_idle.gif'
              alt='Chatbot Icon'
              width={30}
              height={30}
              className='rounded-full'
              unoptimized={true}
            />
          ) : (
            <div className='relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-visible rounded-full'>
              {currentChat?.avatar ? (
                <AvatarWithFrame
                  avatarPath={currentChat?.avatar}
                  altAvatar={currentChat?.name || 'Avatar'}
                  size={40}
                />
              ) : (
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-sm font-semibold text-white'>
                  {currentChat?.name?.charAt(0)?.toUpperCase() || 'G'}
                </div>
              )}
              {canUpdateGroupAvatar && (
                <>
                  <input
                    ref={avatarInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleAvatarChange}
                  />
                  <button
                    type='button'
                    title='Đổi ảnh đại diện nhóm'
                    aria-label='Đổi ảnh đại diện nhóm'
                    onClick={() => avatarInputRef.current?.click()}
                    className='absolute -bottom-0.5 -right-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white p-0 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                  >
                    <Camera size={12} />
                  </button>
                </>
              )}
            </div>
          )}

          <div>
            <div className='flex items-center gap-2'>
              {isEditing ? (
                <div className='flex items-center gap-2'>
                  <Input
                    ref={inputRef}
                    type='text'
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleCancel}
                    className='font-semibold text-gray-900 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                  <Button
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleSave}
                    className='p-1 rounded text-gray-600'
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleCancel}
                    className='p-1 hover:bg-red-600 rounded text-red-600'
                  >
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <h2 className='font-semibold text-gray-900 flex items-center gap-2'>
                  {currentChat?.name}
                  {(currentChat?.type === 'group' ||
                    activeTab === 'groups') && (
                    <Button
                      onClick={handleEditClick}
                      className='p-1 hover:bg-gray-100 rounded'
                      variant='ghost'
                    >
                      <Edit3
                        size={14}
                        className='text-gray-400 hover:text-gray-600'
                      />
                    </Button>
                  )}
                </h2>
              )}
            </div>
            {/* Hiển thị thông tin khác nhau cho individual vs group */}
            <p className='text-sm text-gray-600 flex items-center gap-1'>
              {currentChat?.type === 'individual' ||
              activeTab === 'individual' ? (
                <span className='flex items-center gap-2'>
                  {!isAI && (
                    <>
                      {/* <span
                        className={`${
                          currentChat?.isOnline
                            ? 'text-green-500'
                            : 'text-gray-400'
                        }`}
                      >
                        ●
                      </span> */}
                      {/* <span className='text-xs'>
                        {currentChat?.isOnline
                          ? 'Đang hoạt động'
                          : 'Không hoạt động'}
                      </span> */}
                    </>
                  )}
                </span>
              ) : (
                <>
                  <Users size={14} className='text-gray-400' />
                  <span>{currentChat?.countUser} thành viên</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {currentChat && onOpenSearch && (
            <Button
              className='p-2 hover:bg-gray-100 rounded-full'
              onClick={onOpenSearch}
              variant='ghost'
            >
              <Search size={20} className='text-gray-600' />
            </Button>
          )}
          
          {currentChat && (
            <Button
              className='p-2 hover:bg-gray-100 rounded-full'
              onClick={onToggleGroupInfo}
              variant='ghost'
            >
              {showGroupInfo ? (
                <ChevronRight size={20} className='text-gray-600' />
              ) : (
                <ChevronLeft size={20} className='text-gray-600' />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
