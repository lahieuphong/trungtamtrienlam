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
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import AvatarWithFrame from '../avatars/avatarFrame'
export default function FormAddGroup ({
  isOpen,
  onClose,
  onSave,
  currentChatUser = null
}) {
  const [groupName, setGroupName] = useState('')
  const [groupImage, setGroupImage] = useState(null)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [selectedTab, setSelectedTab] = useState('all')
  const [isInitialized, setIsInitialized] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const toast = useToast()
  const { userInfo } = useLoadLocalStorage()
  useEffect(() => {
    const loadUserOptions = async () => {
      try {
        const response = await fetchUsersDropdownForChats()

        if (response.status === 200 && response.data.data) {
          const options = response.data.data.users
            .filter(user => user.id !== userInfo?.userID)
            .map(user => ({
              value: user.id,
              label: user.fullName,
              roleName: user.roleName,
              departmentID: user.departmentID,
              avatar: user.avatar
            }))
          setUserOptions(options)

          // If there's a current chat user, add them to the selected members
          if (currentChatUser && isOpen && !isInitialized) {
            const userExists = options.find(
              user => user.value === currentChatUser.id
            )
            if (userExists) {
              setSelectedMembers(prev => {
                // Don't add if already in the list
                if (prev.includes(currentChatUser.id)) return prev
                return [...prev, currentChatUser.id]
              })
              setIsInitialized(true)
            }
          }
          // If there's a current chat user, add them to the selected members
          if (currentChatUser && isOpen && !isInitialized) {
            const userExists = options.find(
              user => user.value === currentChatUser.id
            )
            if (userExists) {
              setSelectedMembers(prev => {
                // Don't add if already in the list
                if (prev.includes(currentChatUser.id)) return prev
                return [...prev, currentChatUser.id]
              })
              setIsInitialized(true)
            }
          }
        }
      } catch (error) {
        console.error('Error loading user options:', error)
        setUserOptions([])
      }
    }

    loadUserOptions()
  }, [currentChatUser, isOpen, isInitialized])

  useEffect(() => {
    const loadDepartmentOptions = async () => {
      try {
        const response = await fetchDepartmentDropdown()
        if (response.status === 200 && response.data.data) {
          const options = response.data.data.departments.map(department => ({
            value: department.id,
            label: department.name
          }))
          // Thêm option "Tất cả" vào đầu danh sách
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
    if (!groupImage) {
      toast.error('Vui lòng chọn ảnh đại diện cho nhóm')
      return
    }
    if (groupImage && !(groupImage instanceof File)) {
      toast.error('Ảnh đại diện không hợp lệ')
      return
    }
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm')
      return
    }
    // Tính cả người tạo nhóm, nhóm phải có ít nhất 3 thành viên (người tạo + 2 người khác)
    if (selectedMembers.length < 2) {
      toast.error('Vui lòng chọn ít nhất 2 thành viên')
      return
    }

    const formData = new FormData()

    formData.append('Name', groupName)
    formData.append('Type', '2')

    // Avatar is now required
    formData.append('Avatar', groupImage)

    const chatUsers = selectedMembers.map(userId => ({
      UserID: userId
    }))

    formData.append('ChatUsers', JSON.stringify(chatUsers))

    onSave?.(formData)
    onClose?.()
  }

  const handleCancel = () => {
    setGroupName('')
    setGroupImage(null)
    setSelectedMembers([])
    setSearchTerm('')
    setSelectedTab('all')
    setIsInitialized(false)
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <h2 className='text-lg font-semibold text-gray-900'>Tạo nhóm mới</h2>
          <Button
            onClick={handleCancel}
            variant='ghost'
            className='p-2 hover:bg-gray-100 rounded-full'
          >
            <X size={20} className='text-gray-500' />
          </Button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {/* Group Image Upload */}
          <div className='mb-6'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Ảnh đại diện nhóm <span className='text-red-500'>*</span>
            </label>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleImageUpload}
                  className='absolute inset-0 opacity-0 cursor-pointer'
                />
                <div className='w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer'>
                  {groupImage ? (
                    <Image
                      src={
                        groupImage instanceof File
                          ? URL.createObjectURL(groupImage)
                          : groupImage
                      }
                      alt='Group'
                      width={64}
                      height={64}
                      className='w-full h-full object-cover rounded-lg'
                    />
                  ) : (
                    <Camera size={24} className='text-gray-400' />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div className='mb-6'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Tên nhóm <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder='Nhóm tăng trưởng định kỳ'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>

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
              <span className={`font-medium ${selectedMembers.length < 2 ? 'text-red-500' : 'text-green-600'}`}>
                {selectedMembers.length}/100
              </span>
              {selectedMembers.length < 2 && (
                <span className='text-xs text-red-500 block mt-1'>
                  ⚠️ Cần chọn ít nhất 2 thành viên để tạo nhóm
                </span>
              )}
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
                        <AvatarWithFrame
                          avatarPath={member.avatar}
                          altAvatar={member.label || 'User avatar'}
                          size={24}
                        />
                      </div>
                      <span className='font-medium'>{member.label}</span>
                      <button
                        onClick={() => toggleMember(memberId)}
                        className='w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 ml-1'
                      >
                        <X size={10} />
                      </button>
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
                   <AvatarWithFrame
                     avatarPath={user.avatar}
                     altAvatar={user.label || 'User avatar'}
                     size={40}
                   />
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
              disabled={selectedMembers.length < 2 || !groupName.trim() || !groupImage}
              className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selectedMembers.length < 2 || !groupName.trim() || !groupImage
                  ? 'text-gray-400 bg-gray-300 cursor-not-allowed'
                  : 'text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              ✓ Hoàn tất
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
