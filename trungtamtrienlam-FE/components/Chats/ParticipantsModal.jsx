import React, { useState, useEffect } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import AvatarWithFrame from '../avatars/avatarFrame'
import { Button } from '../Form'
import { getReminderDetails } from '@/lib/api/chatsApi'

const normalizeUserList = value => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return Object.values(value).flat().filter(Boolean)
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).flat().filter(Boolean)
    }
  } catch (error) {
    console.error('Error parsing user data:', error, value)
  }

  return []
}

const pickUserField = (user, keys) => {
  for (const key of keys) {
    const value = user?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

const getUserId = user =>
  pickUserField(user, ['id', 'ID', 'userID', 'UserID', 'userId', 'UserId'])

const getUserName = user =>
  pickUserField(user, [
    'fullName',
    'FullName',
    'name',
    'Name',
    'displayName',
    'DisplayName',
    'userName',
    'UserName',
    'email',
    'Email'
  ]) || 'Người dùng'

const getUserAvatar = user =>
  pickUserField(user, [
    'avatar',
    'Avatar',
    'avatarPath',
    'AvatarPath',
    'senderAvatar',
    'SenderAvatar'
  ])

const getInitial = name => String(name || 'U').trim().charAt(0).toUpperCase() || 'U'

const ParticipantRow = ({ user }) => {
  const name = getUserName(user)
  const avatar = getUserAvatar(user)

  return (
    <div className='flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50'>
      {avatar ? (
        <AvatarWithFrame avatarPath={avatar} altAvatar={name} size={36} />
      ) : (
        <div className='w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0'>
          {getInitial(name)}
        </div>
      )}
      <div className='flex-1 min-w-0'>
        <div className='font-medium text-gray-900 text-sm truncate' title={name}>
          {name}
        </div>
      </div>
    </div>
  )
}

export default function ParticipantsModal ({
  isOpen,
  onClose,
  reminder,
  joinedCount = 0,
  declinedCount = 0
}) {
  const defaultTab = joinedCount > 0 ? 'joined' : 'declined'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [joinedUsers, setJoinedUsers] = useState([])
  const [notJoinedUsers, setNotJoinedUsers] = useState([])

  useEffect(() => {
    const fetchReminderDetails = async () => {
      if (!isOpen || !reminder?.id) return

      try {
        const res = await getReminderDetails(reminder.id)
        const data = res.data?.data

        const joinedUsersData = normalizeUserList(data?.userJoin)
        const notJoinedUsersData = normalizeUserList(data?.userNotJoin)

        setJoinedUsers(joinedUsersData)
        setNotJoinedUsers(notJoinedUsersData)

        if (joinedUsersData.length > 0) {
          setActiveTab('joined')
        } else if (notJoinedUsersData.length > 0) {
          setActiveTab('declined')
        }
      } catch (error) {
        console.error('Error fetching reminder details:', error)
        setJoinedUsers([])
        setNotJoinedUsers([])
      }
    }

    fetchReminderDetails()
  }, [isOpen, reminder])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-lg w-full max-w-sm shadow-xl overflow-hidden'>
        <div className='bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-200'>
          <Button
            onClick={onClose}
            variant='ghost'
            className='p-1 hover:bg-gray-100 rounded transition-colors'
          >
            <ArrowLeft size={16} className='text-gray-600' />
          </Button>
          <span className='font-medium text-gray-900'>Xác nhận</span>
          <div className='flex-1' />
          <Button
            variant='ghost'
            onClick={onClose}
            className='p-1 hover:bg-gray-100 rounded transition-colors'
          >
            <X size={16} className='text-gray-600' />
          </Button>
        </div>

        <div className='flex border-b border-gray-200'>
          <button
            onClick={() => setActiveTab('joined')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'joined'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tham gia
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs ${
                activeTab === 'joined'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {joinedUsers.length || joinedCount}
            </span>
            {activeTab === 'joined' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600' />
            )}
          </button>

          <button
            onClick={() => setActiveTab('declined')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'declined'
                ? 'text-gray-600 bg-gray-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Từ chối
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs ${
                activeTab === 'declined'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {notJoinedUsers.length || declinedCount}
            </span>
            {activeTab === 'declined' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600' />
            )}
          </button>
        </div>

        <div className='max-h-96 overflow-y-auto'>
          {activeTab === 'joined' && (
            <div className='p-4'>
              {joinedUsers.length > 0 ? (
                <div className='space-y-1'>
                  {joinedUsers.map((user, index) => (
                    <ParticipantRow key={getUserId(user) || index} user={user} />
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <div className='text-sm'>Chưa có ai tham gia</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'declined' && (
            <div className='p-4'>
              {notJoinedUsers.length > 0 ? (
                <div className='space-y-1'>
                  {notJoinedUsers.map((user, index) => (
                    <ParticipantRow key={getUserId(user) || index} user={user} />
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <div className='text-sm'>Chưa có ai từ chối</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
