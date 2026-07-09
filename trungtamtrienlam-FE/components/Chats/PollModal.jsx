import React, { memo, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, PlusCircle, X } from 'lucide-react'
import moment from 'moment'
import { getPollResults } from '@/lib/api/chatsApi'
import VoterListModal from './VoterListModal'

const LABELS = {
  title: 'Bình chọn',
  createdBy: 'Tạo bởi',
  user: 'Người dùng',
  today: 'Hôm nay',
  multiChoice: 'Chọn nhiều',
  deadlinePrefix: 'Kết thúc:',
  votes: 'phiếu',
  voters: 'người đã bình chọn',
  voterList: 'Người đã bình chọn:',
  moreVoters: 'người khác',
  emptyOption: '(Không có nội dung)',
  addOption: 'Thêm lựa chọn',
  close: 'Đóng',
  voted: 'Đã bình chọn',
  chooseOne: 'Chọn một lựa chọn',
  chooseMultiple: 'Có thể chọn nhiều lựa chọn',
  ended: 'Bình chọn đã kết thúc'
}

const extractResultRows = response => {
  const candidates = [response?.data?.data, response?.data, response]
  return candidates.find(Array.isArray) || []
}

const isPollClosed = (poll, referenceTime = Date.now()) => {
  if (!poll) return false
  if (poll.isClosed || poll.isExpired || poll.isCompleted) return true
  if (!poll.dateEnd) return false
  const deadline = moment(poll.dateEnd)
  return deadline.isValid() && deadline.valueOf() <= referenceTime
}

const PollModal = ({ onClose, poll, handleVote }) => {
  const [pollResults, setPollResults] = useState([])
  const [showVoterListModal, setShowVoterListModal] = useState(false)
  const [deadlineTick, setDeadlineTick] = useState(Date.now())
  const pollId = poll?.id
  const options = useMemo(() => JSON.parse(poll?.optionLists).map((option, index) => ({
    id: String(option?.id || `option-${index}`),
    text: option?.optionName || LABELS.emptyOption,
    voteCount: Number(option?.voteCount || 0),
    selected: Boolean(option?.userVoted),
    voters: []
  })), [poll])
  const resultsByOptionId = useMemo(() => {
    const resultMap = new Map()
    pollResults.map(result => ({
      id: String(result?.id || ''),
      voters: JSON.parse(result?.voters).map(voter => ({
        id: voter?.id || '',
        fullName: voter?.fullName || LABELS.user,
        avatar: voter?.avatar || ''
      }))
    })).forEach(result => {
      resultMap.set(result.id, result.voters)
    })
    return resultMap
  }, [pollResults])

  useEffect(() => {
    if (!pollId) {
      setPollResults([])
      return undefined
    }
    let isActive = true
    const fetchPollResults = async () => {
      try {
        const response = await getPollResults(pollId)
        if (isActive) setPollResults(extractResultRows(response))
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

  const pollClosed = isPollClosed(poll, deadlineTick)

  useEffect(() => {
    if (!poll?.dateEnd || pollClosed) return undefined
    const deadline = moment(poll.dateEnd)
    if (!deadline.isValid()) return undefined
    const delay = deadline.valueOf() - Date.now()
    if (delay <= 0) {
      setDeadlineTick(Date.now())
      return undefined
    }
    const timer = window.setTimeout(() => setDeadlineTick(Date.now()), Math.min(delay + 1000, 2147483647))
    return () => window.clearTimeout(timer)
  }, [poll?.dateEnd, pollClosed])

  if (!poll) return null

  const isMultiChoice = Boolean(poll.isMulti)
  const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0)
  const selectedCount = options.filter(option => option.selected).length
  const userHasVoted = selectedCount > 0
  const voterCount = Number(poll.countUserVote || 0)
  const createdTime = poll.createdDate ? moment(poll.createdDate).format('DD/MM/YYYY - HH:mm') : LABELS.today
  const deadlineText = poll.dateEnd ? `${LABELS.deadlinePrefix} ${moment(poll.dateEnd).format('DD/MM/YYYY - HH:mm')}` : ''

  const handleOptionVote = option => {
    if (pollClosed || !pollId || !option?.id) return
    const selectedOptionIds = options.filter(item => item.selected).map(item => item.id)
    let optionIds = []
    if (isMultiChoice) {
      optionIds = option.selected
        ? selectedOptionIds.filter(id => id !== option.id)
        : Array.from(new Set([...selectedOptionIds, option.id]))
    } else if (!option.selected) {
      optionIds = [option.id]
    }
    handleVote?.({
      VoteID: pollId,
      OptionIDs: optionIds,
      ChatID: poll.chatID
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white rounded-md w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{LABELS.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label={LABELS.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-lg font-medium mb-1">{poll.voteName || LABELS.title}</p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <p className="text-sm text-gray-500">
              {LABELS.createdBy} {poll.createdBy || LABELS.user} - {createdTime}
            </p>
            {isMultiChoice && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                {LABELS.multiChoice}
              </span>
            )}
            {deadlineText && (
              <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {deadlineText}
              </p>
            )}
          </div>
          <div className="space-y-3 mb-4">
            {options.map(option => {
              const voters = resultsByOptionId.get(option.id) || option.voters
              const percent = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0
              return (
                <div key={option.id} className="relative border rounded-md">
                  <button
                    type="button"
                    className={`w-full p-2 flex items-center justify-between relative z-10 text-left ${pollClosed ? 'bg-white cursor-not-allowed opacity-80' : option.selected ? 'bg-blue-100 border border-blue-300' : 'bg-white hover:bg-blue-50 border-transparent'}`}
                    onClick={pollClosed ? undefined : () => handleOptionVote(option)}
                    disabled={pollClosed}
                  >
                    <span className="flex items-center flex-1 mr-2 min-w-0">
                      {option.selected && (
                        <CheckCircle2
                          size={16}
                          className="text-blue-500 mr-2 flex-shrink-0"
                        />
                      )}
                      <span className="flex-1 text-sm truncate">{option.text}</span>
                    </span>
                    <span className="text-sm text-gray-700 font-medium ml-2 flex-shrink-0">
                      {option.voteCount} {LABELS.votes}
                    </span>
                  </button>
                  <div
                    className={`absolute top-0 left-0 h-full ${option.selected ? 'bg-blue-200' : 'bg-blue-100'} opacity-30 rounded-md transition-all duration-300`}
                    style={{ width: `${percent}%` }}
                  />
                  {voters.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 px-2 pb-1">
                      <p className="text-xs text-gray-500 mb-1">{LABELS.voterList}</p>
                      <div className="flex flex-wrap gap-1">
                        {voters.slice(0, 5).map((voter, voterIndex) => (
                          <span
                            key={voter.id || voterIndex}
                            className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700"
                            title={voter.fullName}
                          >
                            {voter.fullName}
                          </span>
                        ))}
                        {voters.length > 5 && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                            +{voters.length - 5} {LABELS.moreVoters}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {pollClosed && (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
              {LABELS.ended}
            </div>
          )}

          <button
            type="button"
            className="flex items-center text-blue-400 font-medium text-sm mt-4 mb-2 opacity-50 cursor-not-allowed"
            disabled
          >
            <PlusCircle size={16} className="mr-1" />
            {LABELS.addOption}
          </button>

          <div className="flex items-center justify-between border-t pt-3 mt-3 text-xs text-gray-500">
            <div className="flex items-center">
              {isMultiChoice ? (
                <div className="flex items-center">
                  <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center mr-1 ${userHasVoted ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    {selectedCount}
                  </span>
                  {pollClosed ? LABELS.ended : userHasVoted ? LABELS.voted : LABELS.chooseMultiple}
                </div>
              ) : (
                <span>{pollClosed ? LABELS.ended : userHasVoted ? LABELS.voted : LABELS.chooseOne}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowVoterListModal(true)}
              className="hover:underline hover:text-blue-600 transition-colors"
            >
              <span>{voterCount} {LABELS.voters}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            {LABELS.close}
          </button>
        </div>
      </div>

      {showVoterListModal && (
        <VoterListModal
          onClose={() => setShowVoterListModal(false)}
          poll={poll}
        />
      )}
    </div>
  )
}
export default memo(PollModal)
