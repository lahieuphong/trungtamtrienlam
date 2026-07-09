'use client'
import React, { createContext, useContext, useState } from 'react'

const ChatAttachmentsContext = createContext()

export const useChatAttachments = () => {
  const context = useContext(ChatAttachmentsContext)
  if (!context) {
    throw new Error('useChatAttachments must be used within ChatAttachmentsProvider')
  }
  return context
}

export const ChatAttachmentsProvider = ({ children }) => {
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const [lastUpdatedChat, setLastUpdatedChat] = useState(null)

  // Hàm để trigger reload attachments cho một chat cụ thể
  const triggerReloadAttachments = (chatId, messageType = null) => {
    setLastUpdatedChat({ chatId, messageType, timestamp: Date.now() })
    setReloadTrigger(prev => prev + 1)
  }

  // Hàm để reset trigger
  const resetReloadTrigger = () => {
    setReloadTrigger(0)
    setLastUpdatedChat(null)
  }

  const value = {
    reloadTrigger,
    lastUpdatedChat,
    triggerReloadAttachments,
    resetReloadTrigger
  }

  return (
    <ChatAttachmentsContext.Provider value={value}>
      {children}
    </ChatAttachmentsContext.Provider>
  )
}