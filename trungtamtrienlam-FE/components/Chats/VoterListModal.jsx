import React, { memo, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { getPollResults } from '@/lib/api/chatsApi'
import AvatarWithFrame from '../avatars/avatarFrame'

const LABELS = {
  title: 'Chi tiết bình chọn',
  loading: 'Đang tải dữ liệu...',
  emptyPoll: 'Không có dữ liệu bình chọn',
  emptyVoters: 'Không có dữ liệu người bình chọn chi tiết',
  close: 'Đóng',
  unknownUser: 'Người dùng không xác định',
  optionFallback: 'Lựa chọn',
  loadError: 'Không thể tải dữ liệu bình chọn'
}

const extractResultRows = response => {
  const candidates = [response?.data?.data, response?.data, response]
  return candidates.find(Array.isArray) || []
}

const EmptyState = ({ children }) => (
  <div className='px-4 py-4 text-center text-gray-500'>{children}</div>
)

const VoterRow = ({ voter }) => (
  <div className='px-4 py-2 flex items-center'>
    <div className='w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-100 flex-shrink-0'>
      {voter.avatar ? (
        <AvatarWithFrame
          avatarPath={voter.avatar}
          altAvatar={voter.fullName}
          size={40}
        />
      ) : (
        <div className='w-full h-full flex items-center justify-center bg-gray-200 text-gray-600'>
          {voter.fullName.trim().charAt(0).toUpperCase() ?? 'U'}
        </div>
      )}
    </div>
    <p className='text-sm text-gray-800 truncate'>{voter.fullName}</p>
  </div>
)

const OptionVoterSection = ({ option }) => (
  <div>
    <div className='px-4 py-2 font-medium'>
      {option.optionName} ({option.voters.length})
    </div>
    {option.voters.length > 0 ? (
      option.voters.map((voter, voterIndex) => (
        <VoterRow key={voter.id || voterIndex} voter={voter} />
      ))
    ) : (
      <div className='px-4 py-2 text-gray-500 italic'>
        {LABELS.emptyVoters}
      </div>
    )}
  </div>
)

const VoterListModal = ({ onClose, poll }) => {
  const [pollResults, setPollResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pollId = poll?.id

  useEffect(() => {
    if (!pollId) {
      setPollResults([])
      setLoading(false)
      setError('')
      return undefined
    }
    let isActive = true
    const fetchPollResults = async () => {
      setLoading(true)
      setError('')
      setPollResults([])
      try {
        const response = await getPollResults(pollId)
        if (isActive) setPollResults(extractResultRows(response))
      } catch (fetchError) {
        if (fetchError?.response?.status !== 404) {
          console.error('Error fetching poll results:', fetchError)
        }
        if (isActive) {
          setPollResults([])
          setError(fetchError?.response?.status === 404 ? '' : LABELS.loadError)
        }
      } finally {
        if (isActive) setLoading(false)
      }
    }
    fetchPollResults()

    return () => {
      isActive = false
    }
  }, [pollId])

  const options = useMemo(() => (pollId ? pollResults.map(option => {
    const voters = JSON.parse(option?.voters).map(voter => ({
      id: voter?.id || '',
      fullName: voter?.fullName || LABELS.unknownUser,
      avatar: voter?.avatar || ''
    }))
    return {
      id: option?.id || '',
      optionName: option?.optionName || LABELS.optionFallback,
      voters
    }
  }) : []), [pollId, pollResults])

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-md w-full max-w-md'>
        <div className='flex justify-between items-center p-4 border-b'>
          <h2 className='font-medium text-lg'>{LABELS.title}</h2>
          <button
            type='button'
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700'
            aria-label={LABELS.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className='max-h-[60vh] overflow-y-auto py-2'>
          {loading ? (
            <div className='px-4 py-8 text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-2' />
              <p className='text-gray-600'>{LABELS.loading}</p>
            </div>
          ) : error ? (
            <EmptyState>{error}</EmptyState>
          ) : options.length > 0 ? (
            options.map((option, index) => (
              <OptionVoterSection
                key={option.id || index}
                option={option}
              />
            ))
          ) : (
            <EmptyState>{LABELS.emptyPoll}</EmptyState>
          )}
        </div>
        <div className='border-t p-2 flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1 rounded-md border border-gray-200 flex items-center'
          >
            {LABELS.close}
          </button>
        </div>
      </div>
    </div>
  )
}
export default memo(VoterListModal)