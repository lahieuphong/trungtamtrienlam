'use client'
import { useState, useEffect } from 'react'
import { Search, X, Crown } from 'lucide-react'
import { Button, Input } from '../Form'
import AvatarWithFrame from '../avatars/avatarFrame'
import ConfirmationModal from '@/components/ConfirmationModal'

export default function ChooseNewLeaderModal ({
  isOpen,
  onClose,
  members,
  currentChat,
  userInfo,
  onChooseNewLeader
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [filteredMembers, setFilteredMembers] = useState([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  useEffect(() => {
    if (!members || !userInfo) return

    const filtered = members.filter(member => member.id !== userInfo.userID)
    setFilteredMembers(filtered)
  }, [members, userInfo])

  useEffect(() => {
    if (!members) return

    const filtered = members.filter(
      member =>
        member.userID !== userInfo?.userID &&
        (member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.userName?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredMembers(filtered)
  }, [searchTerm, members, userInfo])

  const handleClose = () => {
    setSelectedMemberId(null)
    setSearchTerm('')
    setShowConfirmation(false)
    onClose()
  }

  const handleConfirm = () => {
    if (selectedMemberId) {
      // Tìm thông tin thành viên được chọn
      const member = members.find(m => m.userID === selectedMemberId);
      setSelectedMember(member);
      // Hiển thị modal xác nhận thay vì gọi trực tiếp
      setShowConfirmation(true);
    }
  }
  
  // Xác nhận cuối cùng và gọi callback
  const handleFinalConfirm = () => {
    if (selectedMemberId) {
      onChooseNewLeader(currentChat?.id, selectedMemberId);
      setShowConfirmation(false);
      handleClose();
    }
  }

  const isConfirmDisabled = !selectedMemberId

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-[1000] flex items-center justify-center'>
      <div
        className='fixed inset-0 bg-black bg-opacity-30'
        onClick={handleClose}
      ></div>
      <div className='bg-white rounded-lg shadow-lg w-full max-w-md z-10 relative'>
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold'>
            Chọn trưởng nhóm mới trước khi rời
          </h2>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='text-gray-500 hover:text-gray-700'
          >
            <X size={20} />
          </Button>
        </div>

        {/* Search */}
        <div className='p-4 border-b border-gray-200'>
          <div className='relative'>
            <Search
              className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              size={18}
            />
            <Input
              type='text'
              placeholder='Tìm kiếm thành viên'
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Member List */}
        <div className='max-h-60 overflow-y-auto p-2'>
          {filteredMembers.length > 0 ? (
            filteredMembers.map(member => (
              <div
                key={member.id}
                className='flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer'
                onClick={() => setSelectedMemberId(member.userID)}
              >
                <div className='flex-shrink-0 mr-2'>
                  <input
                    type='radio'
                    name='leader'
                    checked={selectedMemberId === member.userID}
                    onChange={() => setSelectedMemberId(member.userID)}
                    className='form-radio h-4 w-4 text-blue-600'
                  />
                </div>
                <div className='flex-shrink-0 mr-3'>
                  <AvatarWithFrame
                    avatarPath={member.avatar || member.avatarPath}
                    altAvatar={member.name || member.fullName || 'User avatar'}
                    size={40}
                  />
                </div>
                <div className='flex flex-col'>
                  <span className='font-medium'>
                    {member.fullName || member.name}
                  </span>
                  <span className='text-sm text-gray-500'>Chức vụ</span>
                </div>
              </div>
            ))
          ) : (
            <div className='text-center py-4 text-gray-500'>
              Không tìm thấy thành viên
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex justify-end p-4 border-t border-gray-200'>
          <Button
            onClick={handleClose}
            className='mr-2 px-4 py-2 border border-gray-300 rounded-lg'
            variant='outline'
          >
            Đóng
          </Button>
          <Button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg ${
              isConfirmDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
            disabled={isConfirmDisabled}
          >
            Chọn và tiếp tục
          </Button>
        </div>
      </div>
      
      {/* Modal xác nhận chuyển quyền trưởng nhóm */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleFinalConfirm}
        title="Chuyển quyền trưởng nhóm"
        message={`Người dùng chọn sẽ trở thành trưởng nhóm và có quyền quản lý nhóm. Bạn sẽ không còn xem lại tin nhắn trong nhóm sau khi rời nhóm. Hành động này không thể phục hồi.`}
        confirmText="Tiếp tục"
        cancelText="Hủy"
        confirmButtonClass="bg-blue-500 hover:bg-blue-600 text-white"
        confirmIcon={<Crown className="w-5 h-5 mr-2" />}
      />
    </div>
  )
}
