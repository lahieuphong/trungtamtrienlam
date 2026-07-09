'use client'
import React, { useState, useEffect } from 'react'
import { X, Camera, Search } from 'lucide-react'
import Image from 'next/image'
import {
  fetchDepartmentDropdown,
  fetchUsersDropdownForChats
} from '@/lib/api/dropdownApi'
import { Button, ImageAdvanced } from '@/components/Form'
import RenderFileToken from '@/components/controls/renderFileTokens/RenderFileToken'
import { useToast } from '@/contexts/ToastContext'
import AvatarWithFrame from '@/components/avatars/avatarFrame'
export default function FormAddMem ({ isOpen, onClose, onSave, currentChat, existingMembers = [] }) {
  const [groupName, setGroupName] = useState('')
  const [groupImage, setGroupImage] = useState(null)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const toast = useToast()
  useEffect(() => {
    const loadUserOptions = async () => {
      try {
        const response = await fetchUsersDropdownForChats()

        if (response.status === 200 && response.data.data) {
          const options = response.data.data.users.map(user => ({
            value: user.id,
            label: user.fullName,
            roleName: user.roleName,
            departmentID: user.departmentID,
            avatar: user.avatar
          }))
          setUserOptions(options)
        }
      } catch (error) {
        console.error('Error loading user options:', error)
        setUserOptions([])
      }
    }

    loadUserOptions()
  }, [])

  useEffect(() => {
    const loadDepartmentOptions = async () => {
      try {
        const response = await fetchDepartmentDropdown()
        if (response.status === 200 && response.data.data) {
          const options = response.data.data.departments.map(department => ({
            value: department.id,
            label: department.name
          }))
          setDepartmentOptions([{ value: 'all', label: 'Tất cả' }, ...options])
        }
      } catch (error) {
        console.error('Error loading department options:', error)
        setDepartmentOptions([])
      }
    }

    loadDepartmentOptions()
  }, [])

  const getDepartmentId = departmentName => {
    if (departmentName.includes('Hành Chính')) return 'hanh-chinh'
    if (departmentName.includes('Lập Hồ Sơ')) return 'lap-ho-so'
    if (departmentName.includes('Quản Lý')) return 'quan-ly'
    return 'all'
  }

  // Filter users based on selected tab and search term
  const filteredUsers = userOptions.filter(user => {
    const matchesSearch = user.label
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())

    // Lọc bỏ những thành viên đã có trong nhóm
    const isExistingMember = existingMembers.some(
      member => member.userID === user.value || member.id === user.value
    )

    if (isExistingMember) {
      return false
    }

    if (selectedTab === 'all') {
      return matchesSearch
    }

    // Lọc theo departmentID
    return matchesSearch && user.departmentID === selectedTab
  })

  const handleImageUpload = e => {
    const file = e.target.files[0]
    if (file) {
      // Lưu file object để gửi FormData
      setGroupImage(file)
    }
  }

  const toggleMember = userId => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  const handleSave = () => {
    if (selectedMembers.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thành viên')
      return
    }
    const formData = new FormData()
    formData.append('chatID', currentChat?.id)
    selectedMembers.forEach(id => formData.append('userIDs', id))

    onSave?.(formData)
    onClose?.()
  }

  const handleCancel = () => {
    setGroupName('')
    setGroupImage(null)
    setSelectedMembers([])
    setSearchTerm('')
    setSelectedTab('all')
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Thêm thành viên
          </h2>
          <Button
            onClick={handleCancel}
            variabt='ghost'
            className='p-2 hover:bg-gray-100 rounded-full'
          >
            <X size={20} className='text-gray-500' />
          </Button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {/* Department Tabs */}
          <div className='mb-4'>
            <div className='border-b border-gray-200 overflow-x-auto'>
              <nav className='flex min-w-max space-x-8'>
                {departmentOptions.map(dept => (
                  <button
                    key={dept.value}
                    onClick={() => setSelectedTab(dept.value)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${
                      selectedTab === dept.value
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {dept.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Selected Members Count */}
          <div className='flex items-center justify-between mb-3'>
            <div className='text-sm text-gray-600'>
              Đã chọn:{' '}
              <span className='font-medium'>{selectedMembers.length}/100</span>
            </div>
          </div>

          {/* Selected Members List */}
          {selectedMembers.length > 0 && (
            <div className='mb-4 p-3 bg-gray-50 rounded-lg'>
              <div className='flex flex-wrap gap-2'>
                {selectedMembers.map(memberId => {
                  const member = userOptions.find(
                    user => user.value === memberId
                  )
                  if (!member) return null

                  return (
                    <div
                      key={memberId}
                      className='flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-sm'
                    >
                      <div className='w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden'>
                        {/* <RenderFileToken
                          pathFile={member.avatar}
                          isPrivate={false}
                          Component={({ src }) => {
                            return (
                              <ImageAdvanced
                                src={src}
                                alt={member?.label}
                                type='avatar'
                                width={300}
                                height={300}
                                className='w-full h-full object-cover'
                                onError={() => setImgSrc('/placeholder.svg')}
                              />
                            )
                          }}
                        /> */}
                        <AvatarWithFrame
                          avatarPath={member?.avatar}
                          altAvatar={member?.label || 'Avatar'}
                          size={24}
                        />
                      </div>
                      <span className='font-medium'>{member.label}</span>
                      <Button
                        variant='ghost'
                        onClick={() => toggleMember(memberId)}
                        className='w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 ml-1'
                      >
                        <X size={10} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <div className='mb-4'>
            <div className='relative'>
              <Search
                size={16}
                className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              />
              <input
                type='text'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder='Tìm kiếm thành viên...'
                className='w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
          </div>

          {/* Members List */}
          <div className='space-y-3 max-h-80 overflow-y-auto'>
            {filteredUsers.map((user, index) => (
              <div
                key={`${user.value}-${user.departmentID}-${index}`}
                className='flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg'
              >
                <label className='flex items-center gap-3 flex-1 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={selectedMembers.includes(user.value)}
                    onChange={() => toggleMember(user.value)}
                    className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                  />
                  <div className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden'>
                    {/* <RenderFileToken
                      pathFile={user.avatar}
                      isPrivate={false}
                      Component={({ src }) => {
                        return (
                          <ImageAdvanced
                            src={src}
                            alt={user?.fullName}
                            type='avatar'
                            width={300}
                            height={300}
                            className='w-full h-full object-cover'
                            onError={() => setImgSrc('/placeholder.svg')}
                          />
                        )
                      }}
                    /> */}
                    <AvatarWithFrame
                      avatarPath={user?.avatar}
                      altAvatar={user?.fullName || 'Avatar'}
                      size={40}
                    />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-sm font-medium text-gray-900 truncate'>
                      {user.label}
                    </div>
                    <div className='text-xs text-gray-500 truncate'>
                      {user.roleName}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='border-t p-4'>
          <div className='flex items-center justify-end gap-3'>
            <Button
              variant='outline'
              onClick={handleCancel}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            >
              <X size={16} className='inline mr-1' />
              Đóng
            </Button>
            <Button
              onClick={handleSave}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            >
              ✓ Hoàn tất
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
