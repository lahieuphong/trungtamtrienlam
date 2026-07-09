import React from 'react'
import Image from 'next/image'
import AvatarWithFrame from '@/components/avatars/avatarFrame'
import { XIcon } from 'lucide-react'
const UserRequestsModal = ({
  isOpen,
  onClose,
  userRequests = [],
  onAccept,
  onReject
}) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col'>
        <div className='flex items-center justify-between p-4 border-b'>
          <h2 className='text-lg font-semibold'>Danh sách chờ</h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700'
          >
            <XIcon className='w-5 h-5' />
          </button>
        </div>

        <div className='overflow-y-auto p-2 flex-grow'>
          {userRequests.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              Không có yêu cầu nào
            </div>
          ) : (
            <div className='space-y-3'>
              {userRequests.map(request => (
                <div
                  key={request.id}
                  className='flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg'
                >
                  <div className='flex items-center'>
                    {request.senderAvatar ? (
                      <AvatarWithFrame
                        avatarPath={request.senderAvatar}
                        altAvatar={request.senderName || 'Avatar'}
                        size={40}
                      />
                    ) : (
                      <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3'>
                        <span className='text-blue-500 font-semibold'>
                          {(request.senderName || 'User')
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className='ml-2 font-medium'>
                        {request.senderName || request.id || request.userID}
                      </div>
                      {/* <div className='text-xs text-gray-500'>
                        Được {request.addedByName || 'ai đó'} thêm vào
                      </div> */}
                    </div>
                  </div>
                  <div className='flex space-x-2'>
                    <button
                      onClick={() => onReject(request.id)}
                      className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm'
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => onAccept(request.id)}
                      className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm'
                    >
                      Duyệt
                    </button>
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

export default UserRequestsModal
