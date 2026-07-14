'use client'
import React, { useEffect, useState } from 'react'
import {
  X,
  UserPlus,
  Crown,
  MoreVertical,
  ArrowLeft,
  KeyRound,
  UserMinus
} from 'lucide-react'
import AvatarWithFrame from '../avatars/avatarFrame'
import { Button, Input } from '../Form'
import { useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { ChatUserConstants } from '@/constants/chatConstants'
import ConfirmationModal from '@/components/ConfirmationModal'

const normalizeId = value => {
  if (value === null || value === undefined) return ''
  return String(value)
}

export default function GroupMembersList ({
  isOpen,
  onClose,
  members = [],
  currentChat,
  onAddMember,
  onRemoveMember,
  onPromoteToAdmin,
  onRemoveViceLeader,
  onTransferLeader
}) {
  const { userInfo } = useLoadLocalStorage()
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

  const memberList = Array.isArray(members) ? members : []
  const currentUserId = normalizeId(userInfo?.userID || userInfo?.id)
  const creatorId = normalizeId(currentChat?.createdBy)

  const getMemberId = member =>
    normalizeId(member?.userID || member?.UserID || member?.id || member?.ID)

  const getMemberName = member =>
    member?.fullName ||
    member?.FullName ||
    member?.name ||
    member?.Name ||
    member?.userName ||
    member?.UserName ||
    getMemberId(member)

  const getMemberEmail = member => member?.email || member?.Email || ''

  const isMemberSelf = member => getMemberId(member) === currentUserId

  const isMemberCreator = member => {
    const memberId = getMemberId(member)
    return Boolean(member?.isCreator || member?.IsCreator || (creatorId && memberId === creatorId))
  }

  const isMemberAdmin = member =>
    isMemberCreator(member) ||
    Number(member?.role || member?.Role) === ChatUserConstants.Role.Leader

  const currentUserMember = memberList.find(member => isMemberSelf(member))
  const currentUserIsLeader = isMemberAdmin(currentUserMember)
  const currentUserCanManage =
    currentUserIsLeader ||
    Number(currentUserMember?.role || currentUserMember?.Role) ===
      ChatUserConstants.Role.ViceLeader

  const canAddMember = currentUserIsLeader
  const canTransferLeader = currentUserIsLeader
  const canRemoveViceLeader = currentUserIsLeader

  const filteredMembers = memberList
    .filter(member => {
      const keyword = searchTerm.trim().toLowerCase()
      if (!keyword) return true

      return (
        getMemberName(member).toLowerCase().includes(keyword) ||
        getMemberEmail(member).toLowerCase().includes(keyword)
      )
    })
    .sort((a, b) => {
      if (isMemberCreator(a) !== isMemberCreator(b)) {
        return isMemberCreator(a) ? -1 : 1
      }

      if (isMemberSelf(a) !== isMemberSelf(b)) {
        return isMemberSelf(a) ? -1 : 1
      }

      const roleA = Number(a?.role || a?.Role || ChatUserConstants.Role.Member)
      const roleB = Number(b?.role || b?.Role || ChatUserConstants.Role.Member)
      if (roleA !== roleB) return roleA - roleB

      return getMemberName(a).localeCompare(getMemberName(b), 'vi')
    })

  useEffect(() => {
    const handleClickOutside = event => {
      if (showDropdown && !event.target.closest('.member-dropdown')) {
        setShowDropdown(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  const getActionConfig = action => {
    switch (action) {
      case 'transfer':
        return {
          title: 'Xác nhận nhượng quyền trưởng nhóm',
          description:
            'Người này sẽ trở thành trưởng nhóm mới và có toàn quyền quản lý nhóm.',
          confirmText: 'Nhượng quyền',
          confirmButtonClass: 'bg-blue-500 hover:bg-blue-600 text-white',
          confirmIcon: <KeyRound className='w-5 h-5 mr-2' />
        }
      case 'promote':
        return {
          title: 'Xác nhận thêm phó nhóm',
          description:
            'Người này sẽ có quyền hỗ trợ quản lý thành viên và một số thao tác trong nhóm.',
          confirmText: 'Thêm phó nhóm',
          confirmButtonClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
          confirmIcon: <Crown className='w-5 h-5 mr-2' />
        }
      case 'demote':
        return {
          title: 'Xác nhận xóa quyền phó nhóm',
          description: 'Người này sẽ trở lại vai trò thành viên thường trong nhóm.',
          confirmText: 'Xóa quyền',
          confirmButtonClass: 'bg-orange-500 hover:bg-orange-600 text-white',
          confirmIcon: <UserMinus className='w-5 h-5 mr-2' />
        }
      case 'remove':
      default:
        return {
          title: 'Xác nhận xóa khỏi nhóm',
          description:
            'Người này sẽ bị xóa khỏi nhóm và không còn truy cập cuộc trò chuyện nhóm.',
          confirmText: 'Xóa khỏi nhóm',
          confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
          confirmIcon: <X className='w-5 h-5 mr-2' />
        }
    }
  }

  const handleAction = (action, member) => {
    setPendingAction({
      action,
      memberId: getMemberId(member),
      memberName: getMemberName(member)
    })
    setShowDropdown(null)
  }

  const handleConfirmAction = () => {
    if (!pendingAction) return

    const { action, memberId } = pendingAction

    switch (action) {
      case 'remove':
        onRemoveMember?.(currentChat?.id, memberId)
        break
      case 'promote':
        onPromoteToAdmin?.(currentChat?.id, memberId)
        break
      case 'demote':
        onRemoveViceLeader?.(currentChat?.id, memberId)
        break
      case 'transfer':
        onTransferLeader?.(currentChat?.id, memberId)
        break
      default:
        break
    }

    setPendingAction(null)
  }

  const renderMemberDropdown = member => {
    const memberId = getMemberId(member)
    if (showDropdown !== memberId || !currentUserCanManage || isMemberCreator(member)) {
      return null
    }
    const memberRole = Number(member?.role || member?.Role)
    const memberIsLeader = isMemberAdmin(member)

    return (
      <div className='member-dropdown absolute right-0 top-10 z-50 w-56 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5'>
        {canTransferLeader && !memberIsLeader && (
          <button
            onClick={() => handleAction('transfer', member)}
            className='flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
          >
            <KeyRound className='mr-2 h-4 w-4 text-blue-500' />
            Nhượng quyền trưởng nhóm
          </button>
        )}
        {canRemoveViceLeader &&
          !memberIsLeader &&
          memberRole === ChatUserConstants.Role.ViceLeader && (
            <button
              onClick={() => handleAction('demote', member)}
              className='flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
            >
              <UserMinus className='mr-2 h-4 w-4 text-orange-500' />
              Xóa quyền phó nhóm
            </button>
          )}
        {!memberIsLeader && memberRole !== ChatUserConstants.Role.ViceLeader && (
          <button
            onClick={() => handleAction('promote', member)}
            className='flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100'
          >
            <Crown className='mr-2 h-4 w-4 text-yellow-500' />
            Thêm phó nhóm
          </button>
        )}
        <button
          onClick={() => handleAction('remove', member)}
          className='flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100'
        >
          <X className='mr-2 h-4 w-4' />
          Xóa khỏi nhóm
        </button>
      </div>
    )
  }

  return (
    <>
      {(() => {
        if (!pendingAction) return null

        const actionConfig = getActionConfig(pendingAction.action)

        return (
          <ConfirmationModal
            isOpen={Boolean(pendingAction)}
            onClose={() => setPendingAction(null)}
            onConfirm={handleConfirmAction}
            title={actionConfig.title}
            content={
              <div className='space-y-3 text-sm leading-6 text-gray-700'>
                <p>
                  Bạn có chắc chắn muốn thực hiện thao tác này với{' '}
                  <span className='font-semibold text-gray-900'>
                    {pendingAction.memberName}
                  </span>
                  ?
                </p>
                <p className='rounded-lg bg-gray-50 px-3 py-2 text-gray-600'>
                  {actionConfig.description}
                </p>
              </div>
            }
            confirmText={actionConfig.confirmText}
            cancelText='Hủy'
            confirmButtonClass={actionConfig.confirmButtonClass}
            confirmIcon={actionConfig.confirmIcon}
          />
        )
      })()}

      {isOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/30'
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex items-center justify-between border-b p-4'>
          <h3 className='text-lg font-semibold'>Thành viên nhóm</h3>
          <Button
            onClick={onClose}
            variant='ghost'
            className='rounded-full p-1 hover:bg-gray-100'
            aria-label='Đóng'
            title='Đóng'
          >
            <X size={20} />
          </Button>
        </div>

        <div className='border-b border-gray-100 px-4 py-2'>
          <Button
            onClick={onClose}
            variant='ghost'
            className='flex items-center text-blue-600 hover:text-blue-700'
          >
            <ArrowLeft size={16} className='mr-1' />
            <span>Quay lại</span>
          </Button>
        </div>

        <div className='border-b p-4'>
          <Input
            type='text'
            placeholder='Tìm kiếm thành viên...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          {canAddMember && (
            <Button
              onClick={() => onAddMember?.()}
              className='mt-3 flex w-full items-center justify-center gap-2'
            >
              <UserPlus size={16} />
              Thêm thành viên
            </Button>
          )}
        </div>

        <div className='flex-1 overflow-y-auto p-2'>
          {filteredMembers.length === 0 ? (
            <div className='py-8 text-center text-gray-500'>
              {searchTerm
                ? 'Không tìm thấy thành viên nào'
                : 'Chưa có thành viên nào'}
            </div>
          ) : (
            <div className='space-y-2'>
              {filteredMembers.map(member => {
                const memberId = getMemberId(member)
                const memberName = getMemberName(member)
                const memberRole = Number(member?.role || member?.Role)
                const memberIsCreator = isMemberCreator(member)
                const memberIsAdmin = isMemberAdmin(member)
                const memberIsSelf = isMemberSelf(member)

                return (
                  <div
                    key={member?.id || member?.ID || memberId}
                    className='relative flex items-center justify-between rounded-lg p-2 hover:bg-gray-50'
                  >
                    <div className='flex min-w-0 items-center gap-3'>
                      <AvatarWithFrame
                        avatarPath={member?.avatar || member?.Avatar}
                        altAvatar={memberName || 'Avatar'}
                        size={35}
                      />
                      <div className='min-w-0'>
                        <div className='flex min-w-0 flex-wrap items-center gap-1.5 font-medium'>
                          <span className='max-w-[130px] truncate'>
                            {memberIsSelf ? 'Bạn' : memberName}
                          </span>
                          {memberIsAdmin && (
                            <span
                              className='inline-flex rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800'
                              title={memberIsCreator ? 'Người tạo nhóm' : undefined}
                            >
                              Quản trị viên
                            </span>
                          )}
                          {!memberIsAdmin &&
                            memberRole === ChatUserConstants.Role.ViceLeader && (
                              <span className='inline-flex rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600'>
                                Phó nhóm
                              </span>
                            )}
                        </div>
                        {memberIsCreator && (
                          <p className='mt-0.5 text-xs text-gray-500'>
                            Người tạo nhóm
                          </p>
                        )}
                      </div>
                    </div>

                    {currentUserCanManage && !memberIsSelf && !memberIsCreator && (
                      <Button
                        onClick={event => {
                          event.stopPropagation()
                          setShowDropdown(showDropdown === memberId ? null : memberId)
                        }}
                        variant='ghost'
                        className='rounded-full p-1 hover:bg-gray-200'
                        aria-label='Tùy chọn thành viên'
                        title='Tùy chọn thành viên'
                      >
                        <MoreVertical size={16} />
                      </Button>
                    )}

                    {renderMemberDropdown(member)}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
