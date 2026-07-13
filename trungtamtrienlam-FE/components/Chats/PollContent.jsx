import React, { memo } from "react"
import PollCard from "./PollCard"
/**
 * Poll Content wrapper component
 * This component provides appropriate spacing and wrapping for the poll card when displayed within the chat interface
 */
const PollContent = ({ poll, handleVote, handleAddNewOption }) => {
  if (!poll) return null

  return (
    <div className="mt-2 flex justify-center w-full px-1 sm:px-0 max-h-[300px] overflow-y-auto">
      <PollCard
        poll={poll}
        handleVote={handleVote}
        onAddNewOption={handleAddNewOption}
      />
    </div>
  )
}
export default memo(PollContent)