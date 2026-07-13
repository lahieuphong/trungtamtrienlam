import React, { memo, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Circle } from "lucide-react"
import moment from "moment"
import VotePollModal from "./VotePollModal"
import VoterListModal from "./VoterListModal"

const LABELS = {
  defaultTitle: "Bình chọn",
  multiChoice: "(Chọn nhiều)",
  voters: "người bình chọn",
  deadlinePrefix: "Kết thúc:",
  votes: "phiếu",
  voted: "Đã bình chọn",
  chooseOne: "Chọn một lựa chọn",
  chooseMultiple: "Có thể chọn nhiều lựa chọn",
  changeVote: "Đổi lựa chọn",
  vote: "Bình chọn",
  ended: "Đã kết thúc",
  quickVote: "Ch\u1ECDn",
  selected: "\u0110\u00E3 ch\u1ECDn"
}

const parseOptionList = optionLists => {
  if (Array.isArray(optionLists)) return optionLists
  if (typeof optionLists !== "string" || !optionLists.trim()) return []
  try {
    const parsed = JSON.parse(optionLists)
    if (Array.isArray(parsed)) return parsed
    if (typeof parsed === "string") return parseOptionList(parsed)
  } catch {
    return []
  }
  return []
}

const getPollValue = (poll, ...keys) => keys.reduce((value, key) => value ?? poll?.[key], undefined)

const getPollOptionLists = poll => getPollValue(poll, "optionLists", "OptionLists", "options", "Options")

const getPollDateEnd = poll => getPollValue(poll, "dateEnd", "DateEnd")

const isPollClosed = (poll, referenceTime = Date.now()) => {
  if (!poll) return false
  if (poll.isClosed || poll.IsClosed || poll.isExpired || poll.IsExpired || poll.isCompleted || poll.IsCompleted) return true
  const dateEnd = getPollDateEnd(poll)
  if (!dateEnd) return false
  const deadline = moment(dateEnd)
  return deadline.isValid() && deadline.valueOf() <= referenceTime
}

const PollOptionRow = ({ option, totalVotes, onSelect, disabled }) => {
  const percent = totalVotes ? Math.round(((option.voteCount || 0) / totalVotes) * 100) : 0
  const actionLabel = option.userVoted ? LABELS.selected : LABELS.quickVote

  return (
    <div className="relative mb-2 sm:mb-3">
      <button
        type="button"
        className={`w-full p-2 sm:p-2.5 md:p-3 rounded-md flex items-center justify-between relative z-10 transition-all duration-150 ${disabled ? "bg-white border border-transparent cursor-not-allowed opacity-80" : option.userVoted ? "bg-blue-100 border border-blue-300" : "bg-white hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200"}`}
        onClick={disabled ? undefined : onSelect}
        disabled={disabled}
      >
        <span className="flex items-center flex-1 min-w-0 mr-2 text-left">
          <span className={`w-5 h-5 mr-2 md:mr-3 flex-shrink-0 flex items-center justify-center ${option.userVoted ? "text-blue-500" : "text-gray-400"}`}>
            {option.userVoted ? (
              <CheckCircle2 size={18} />
            ) : (
              <Circle size={17} />
            )}
          </span>
          <span className="text-xs sm:text-sm truncate">{option.name}</span>
        </span>
        <span className="flex flex-col items-end text-right ml-1 sm:ml-2 md:ml-3 flex-shrink-0">
          <span className="text-xs sm:text-sm font-medium">
            {option.voteCount} {LABELS.votes}
          </span>
          {!disabled && (
            <span className={`text-[11px] leading-4 ${option.userVoted ? "text-blue-600" : "text-gray-500"}`}>
              {actionLabel}
            </span>
          )}
        </span>
      </button>
      <div
        className={`absolute top-0 left-0 h-full ${option.userVoted ? "bg-blue-200" : "bg-blue-100"} opacity-30 rounded-md transition-all duration-300`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
const PollCard = ({ poll, handleVote, onAddNewOption }) => {
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [showVoterListModal, setShowVoterListModal] = useState(false)
  const [deadlineTick, setDeadlineTick] = useState(Date.now())

  const safePoll = poll || {}
  const pollId = getPollValue(safePoll, "id", "ID")
  const chatId = getPollValue(safePoll, "chatID", "ChatID")
  const dateEnd = getPollDateEnd(safePoll)
  const options = useMemo(() => parseOptionList(getPollOptionLists(safePoll)).map((option, index) => {
    if (!option || typeof option !== "object") return null
    const voteCount = Number(getPollValue(option, "voteCount", "VoteCount") || 0)
    return {
      id: getPollValue(option, "id", "ID", "optionID", "OptionID") || `option-${index}`,
      name: getPollValue(option, "optionName", "OptionName", "name", "Name") || `Option ${index + 1}`,
      voteCount,
      userVoted: Boolean(getPollValue(option, "userVoted", "UserVoted", "isVoted", "IsVoted"))
    }
  }).filter(Boolean), [poll])
  const totalOptionVotes = options.reduce((sum, option) => sum + option.voteCount, 0)
  const voterCount = Number(getPollValue(safePoll, "countUserVote", "CountUserVote") || 0)
  const userHasVoted = options.some(option => option.userVoted)
  const selectedCount = options.filter(option => option.userVoted).length
  const isMultiChoice = Boolean(getPollValue(safePoll, "isMulti", "IsMulti"))
  const pollClosed = isPollClosed(safePoll, deadlineTick)

  useEffect(() => {
    if (!dateEnd || pollClosed) return undefined
    const deadline = moment(dateEnd)
    if (!deadline.isValid()) return undefined
    const delay = deadline.valueOf() - Date.now()
    if (delay <= 0) {
      setDeadlineTick(Date.now())
      return undefined
    }
    const timer = window.setTimeout(() => setDeadlineTick(Date.now()), Math.min(delay + 1000, 2147483647))
    return () => window.clearTimeout(timer)
  }, [dateEnd, pollClosed])

  const handleQuickVote = option => {
    if (pollClosed || !option?.id || !pollId) return
    const selectedOptionIds = options.filter(item => item.userVoted).map(item => item.id)
    let optionIds = []
    if (isMultiChoice) {
      optionIds = option.userVoted
        ? selectedOptionIds.filter(id => id !== option.id)
        : Array.from(new Set([...selectedOptionIds, option.id]))
    } else if (!option.userVoted) {
      optionIds = [option.id]
    }
    handleVote?.({
      VoteID: pollId,
      OptionIDs: optionIds,
      ChatID: chatId
    })
  }

  if (!poll) return null

  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden bg-blue-50 w-full max-w-[500px] mb-4">
      <div className="p-3 sm:p-4 border-b border-blue-100">
        <div className="font-medium text-gray-800 mb-2 text-sm sm:text-base">
          {getPollValue(safePoll, "voteName", "VoteName") || LABELS.defaultTitle}
        </div>
        <div className="text-xs sm:text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
          <div>
            <button
              type="button"
              onClick={() => setShowVoterListModal(true)}
              className="hover:underline hover:text-blue-600 transition-colors"
            >
              <span>{voterCount} {LABELS.voters}</span>
            </button>
            {isMultiChoice && (
              <span className="ml-2 text-xs sm:text-sm text-blue-500">{LABELS.multiChoice}</span>
            )}
          </div>
          {dateEnd && (
            <div className="text-xs sm:text-sm text-gray-500 truncate max-w-full sm:max-w-[200px] sm:ml-4">
              {moment(dateEnd).format("DD/MM/YYYY - HH:mm")}
            </div>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="max-h-[150px] overflow-y-auto pr-1">
          {options.map(option => (
            <PollOptionRow
              key={option.id}
              option={option}
              totalVotes={totalOptionVotes}
              onSelect={() => handleQuickVote(option)}
              disabled={pollClosed}
            />
          ))}
        </div>
      </div>
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-blue-100 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {isMultiChoice ? (
            <div className="flex items-center">
              <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center mr-1 ${selectedCount > 0 ? "bg-blue-500" : "bg-gray-300"}`}>
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
          className={`text-xs sm:text-sm font-medium py-1 sm:py-1.5 px-3 sm:px-4 rounded-md transition-all duration-150 border border-transparent ${pollClosed ? "text-gray-400 cursor-not-allowed bg-gray-50" : "text-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200"}`}
          onClick={() => {
            if (!pollClosed) setShowVoteModal(true)
          }}
          disabled={pollClosed}
        >
          {pollClosed ? LABELS.ended : userHasVoted ? LABELS.changeVote : LABELS.vote}
        </button>

        {showVoteModal && !pollClosed && (
          <VotePollModal
            onClose={() => setShowVoteModal(false)}
            poll={poll}
            onVote={handleVote}
            onAddNewOption={onAddNewOption}
          />
        )}

        {showVoterListModal && (
          <VoterListModal
            onClose={() => setShowVoterListModal(false)}
            poll={poll}
          />
        )}
      </div>
    </div>
  )
}
export default memo(PollCard)
