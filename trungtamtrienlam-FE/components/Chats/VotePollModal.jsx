import React, { memo, useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { getPollResults } from '@/lib/api/chatsApi'
import AvatarWithFrame from '../avatars/avatarFrame'

const LABELS = {
  defaultTitle: 'Bình chọn',
  multiChoiceHint: 'Bạn có thể chọn nhiều lựa chọn',
  chooseRequired: 'Vui lòng chọn ít nhất một lựa chọn',
  addOptionSuccess: 'Đã thêm lựa chọn mới thành công',
  addOptionError: 'Không thể thêm lựa chọn mới',
  loadResultsError: 'Không thể tải kết quả bình chọn',
  missingPoll: 'Không tìm thấy bình chọn',
  addOption: 'Thêm bình chọn',
  addOptionPlaceholder: 'Nhập lựa chọn mới',
  adding: 'Đang thêm...',
  add: 'Thêm',
  cancel: 'Hủy',
  vote: 'Bình chọn',
  ended: 'Bình chọn đã kết thúc',
  close: 'Đóng',
  unknownUser: 'Người dùng'
}

const parseOptions = optionLists => {
  if (Array.isArray(optionLists)) return optionLists
  if (typeof optionLists !== 'string' || !optionLists.trim()) return []
  try {
    const parsed = JSON.parse(optionLists)
    if (Array.isArray(parsed)) return parsed
    if (typeof parsed === 'string') return parseOptions(parsed)
  } catch {
    return []
  }
  return []
}

const isPollClosed = (poll, referenceTime = Date.now()) => {
  if (!poll) return false
  if (poll.isClosed || poll.isExpired || poll.isCompleted) return true
  if (!poll.dateEnd) return false
  const deadline = Date.parse(poll.dateEnd)
  return Number.isFinite(deadline) && deadline <= referenceTime
}

const VoterStack = ({ voters }) => {
  if (!voters.length) return null
  return (
    <span className='flex items-center'>
      <span className='flex -space-x-2'>
        {voters.slice(0, 3).map((voter, index) => (
          <span
            key={voter.id || index}
            className='w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gray-200'
            style={{ zIndex: voters.length - index }}
          >
            {voter.avatar ? (
              <AvatarWithFrame
                avatarPath={voter.avatar}
                altAvatar={voter.fullName}
                size={20}
              />
            ) : (
              <span className='w-full h-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-medium'>
                {voter.fullName.trim().charAt(0).toUpperCase() ?? 'U'}
              </span>
            )}
          </span>
        ))}
      </span>
      <span className='text-xs text-gray-500 ml-2'>{voters.length}</span>
    </span>
  )
}

const OptionRow = ({ option, selected, voters, onToggle, disabled }) => (
  <button
    type='button'
    className={`w-full flex items-center justify-between border border-gray-200 rounded-lg p-3 text-left ${disabled ? 'cursor-not-allowed opacity-75' : 'hover:border-blue-300 cursor-pointer'}`}
    onClick={disabled ? undefined : () => onToggle(option.id)}
    disabled={disabled}
  >
    <span className='flex items-center min-w-0 mr-3'>
      <span
        className={`w-5 h-5 border rounded mr-3 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
      >
        {selected && <Check size={14} className='text-white' />}
      </span>
      <span className='text-sm truncate'>{option.name}</span>
    </span>
    <VoterStack voters={voters} />
  </button>
)

const AddOptionForm = ({ adding, value, onCancel, onChange, onSubmit }) => (
  <div className='border border-gray-200 rounded-lg p-3 bg-gray-50'>
    <div className='flex items-center gap-2 mb-3'>
      <input
        type='text'
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={LABELS.addOptionPlaceholder}
        className='flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
        onKeyDown={event => {
          if (event.key === 'Enter') onSubmit()
        }}
        autoFocus
      />
    </div>
    <div className='flex items-center justify-end gap-2'>
      <button
        type='button'
        onClick={onCancel}
        className='px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded'
      >
        {LABELS.cancel}
      </button>
      <button
        type='button'
        onClick={onSubmit}
        disabled={!value.trim() || adding}
        className='px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1'
      >
        {adding ? (
          <>
            <Loader2 size={12} className='animate-spin' />
            {LABELS.adding}
          </>
        ) : (
          LABELS.add
        )}
      </button>
    </div>
  </div>
)

const VotePollModal = ({ onClose, poll, onVote, onAddNewOption }) => {
  const { error: showError, success: showSuccess } = useToast()
  const [selectedOptions, setSelectedOptions] = useState([])
  const [pollResults, setPollResults] = useState([])
  const [addingOption, setAddingOption] = useState(false)
  const [showAddOption, setShowAddOption] = useState(false)
  const [newOptionName, setNewOptionName] = useState('')
  const [deadlineTick, setDeadlineTick] = useState(Date.now())
  const pollId = poll?.id
  const pollTitle = poll?.voteName || LABELS.defaultTitle
  const chatId = poll?.chatID
  const isMultiChoice = Boolean(poll?.isMulti)
  const pollClosed = isPollClosed(poll, deadlineTick)
  const options = useMemo(() => parseOptions(poll?.optionLists).map((option, index) => {
    if (!option || typeof option !== 'object') return null
    return {
      id: String(option.id || `option-${index}`),
      name: option.optionName || `Option ${index + 1}`,
      voteCount: Number(option.voteCount || 0),
      userVoted: Boolean(option.userVoted)
    }
  }).filter(Boolean), [poll])
  const resultsByOptionId = useMemo(() => {
    const resultMap = new Map()
    pollResults.map(result => ({
      id: String(result.id || ''),
      voters: JSON.parse(result.voters).map(voter => ({
        id: voter.id || '',
        fullName: voter.fullName || LABELS.unknownUser,
        avatar: voter.avatar || ''
      }))
    })).forEach(result => { resultMap.set(result.id, result.voters) })
    return resultMap
  }, [pollResults])

  useEffect(() => {
    if (!pollId) {
      setPollResults([])
      return undefined
    }
    let isActive = true
    const fetchPollResults = async () => {
      setPollResults([])
      try {
        const response = await getPollResults(pollId)
        const candidates = [
          response?.data?.data,
          response?.data,
          response
        ]
        if (isActive) setPollResults(candidates.find(Array.isArray) || [])
      } catch (error) {
        if (error?.response?.status !== 404) {
          console.error('Error fetching poll results:', error)
        }
        if (isActive) setPollResults([])
      }
    }

    fetchPollResults()

    return () => {
      isActive = false
    }
  }, [pollId])

  useEffect(() => {
    setSelectedOptions(options.filter(option => option.userVoted).map(option => option.id))
  }, [options])

  useEffect(() => {
    setShowAddOption(false)
    setNewOptionName('')
  }, [pollId])

  useEffect(() => {
    if (!poll?.dateEnd || pollClosed) return undefined
    const deadline = Date.parse(poll.dateEnd)
    if (!Number.isFinite(deadline)) return undefined
    const delay = deadline - Date.now()
    if (delay <= 0) {
      setDeadlineTick(Date.now())
      return undefined
    }
    const timer = window.setTimeout(() => setDeadlineTick(Date.now()), Math.min(delay + 1000, 2147483647))
    return () => window.clearTimeout(timer)
  }, [poll?.dateEnd, pollClosed])

  const handleToggleOption = optionId => {
    if (pollClosed) return
    setSelectedOptions(prev => {
      if (!isMultiChoice) return [optionId]
      if (prev.includes(optionId)) return prev.filter(id => id !== optionId)
      return [...prev, optionId]
    })
  }

  const handleSubmitVote = () => {
    if (pollClosed) {
      showError(LABELS.ended)
      return
    }
    if (!pollId) {
      showError(LABELS.missingPoll)
      return
    }
    if (selectedOptions.length === 0) {
      showError(LABELS.chooseRequired)
      return
    }
    onVote?.({
      VoteID: pollId,
      OptionIDs: selectedOptions,
      ChatID: chatId
    })
    onClose?.()
  }

  const handleAddNewOption = async () => {
    if (pollClosed) {
      showError(LABELS.ended)
      return
    }
    const optionName = newOptionName.trim()
    if (!optionName) return
    if (!onAddNewOption) {
      showError(LABELS.addOptionError)
      return
    }
    if (!pollId) {
      showError(LABELS.missingPoll)
      return
    }
    const payload = {
      ID: pollId,
      VoteName: pollTitle,
      ChatID: chatId,
      Options: [{ OptionName: optionName }],
      IsMulti: isMultiChoice,
      RemindVote: Boolean(poll.remindVote)
    }
    if (poll.dateEnd) payload.DateEnd = poll.dateEnd
    try {
      setAddingOption(true)
      await onAddNewOption(payload)
      setNewOptionName('')
      setShowAddOption(false)
      showSuccess(LABELS.addOptionSuccess)
      onClose?.()
    } catch (error) {
      console.error('Error adding poll option:', error)
      showError(LABELS.addOptionError)
    } finally {
      setAddingOption(false)
    }
  }

  if (!poll) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'>
      <div className='bg-white rounded-lg w-full max-w-md p-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-medium'>{pollTitle}</h3>
          <button
            type='button'
            onClick={onClose}
            className='p-1 hover:bg-gray-100 rounded'
            aria-label={LABELS.close}
          >
            <X size={18} className='text-gray-500' />
          </button>
        </div>

        <div className='mb-4 space-y-2'>
          {isMultiChoice && (
            <div className='text-xs text-blue-500 mb-3'>
              ({LABELS.multiChoiceHint})
            </div>
          )}
          {options.map(option => (
            <OptionRow
              key={option.id}
              option={option}
              selected={selectedOptions.includes(option.id)}
              voters={resultsByOptionId.get(option.id) || []}
              onToggle={handleToggleOption}
              disabled={pollClosed}
            />
          ))}
          {pollClosed && (
            <div className='text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3'>
              {LABELS.ended}
            </div>
          )}
          {!pollClosed && !showAddOption ? (
            <button
              type='button'
              onClick={() => setShowAddOption(true)}
              className='w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-3 text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors'
            >
              <Plus size={16} />
              {LABELS.addOption}
            </button>
          ) : !pollClosed ? (
            <AddOptionForm
              adding={addingOption}
              value={newOptionName}
              onCancel={() => {
                setShowAddOption(false)
                setNewOptionName('')
              }}
              onChange={setNewOptionName}
              onSubmit={handleAddNewOption}
            />
          ) : null}
        </div>

        <div className='flex justify-end gap-2 pt-3 border-t border-gray-100'>
          <button
            type='button'
            className='px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
            onClick={onClose}
          >
            {LABELS.cancel}
          </button>
          <button
            type='button'
            className='px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50'
            disabled={pollClosed || !pollId || selectedOptions.length === 0}
            onClick={handleSubmitVote}
          >
            {pollClosed ? LABELS.ended : LABELS.vote}
          </button>
        </div>
      </div>
    </div>
  )
}
export default memo(VotePollModal)
