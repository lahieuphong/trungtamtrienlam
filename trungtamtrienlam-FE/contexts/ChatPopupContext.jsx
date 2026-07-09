"use client"
import React, { createContext, useContext, useState, useCallback } from 'react'
import ChatPopup from '../components/Chats/ChatPopup'

const ChatPopupContext = createContext()

export const useChatPopup = () => {
  const context = useContext(ChatPopupContext)
  if (!context) {
    throw new Error('useChatPopup must be used within ChatPopupProvider')
  }
  return context
}

export const ChatPopupProvider = ({ children }) => {
  const [activeChats, setActiveChats] = useState([])
  const [onChatOpenCallbacks, setOnChatOpenCallbacks] = useState([])

  const openChatPopup = useCallback((chat) => {
    setActiveChats(prev => {
      const existing = prev.find(c => c.id === chat.id)
      if (existing) {
        return prev.map(c => 
          c.id === chat.id 
            ? { ...c, isMinimized: false, zIndex: Math.max(...prev.map(p => p.zIndex || 0)) + 1 }
            : c
        )
      } else {
        onChatOpenCallbacks.forEach(callback => callback(chat.id, chat.type))
      }
      
      const newChat = {
        ...chat,
        isMinimized: false,
        zIndex: Math.max(...prev.map(p => p.zIndex || 0), 0) + 1
      }
      
      return [...prev, newChat]
    })
  }, [onChatOpenCallbacks])

  const registerChatOpenCallback = useCallback((callback) => {
    setOnChatOpenCallbacks(prev => [...prev, callback])
    return () => {
      setOnChatOpenCallbacks(prev => prev.filter(cb => cb !== callback))
    }
  }, [])

  const closeChatPopup = useCallback((chatId) => {
    setActiveChats(prev => prev.filter(c => c.id !== chatId))
  }, [])

  const minimizeChatPopup = useCallback((chatId) => {
    setActiveChats(prev => 
      prev.map(c => 
        c.id === chatId ? { ...c, isMinimized: !c.isMinimized } : c
      )
    )
  }, [])

  const getPopupPosition = (index) => {
    const baseRight = 20
    const popupWidth = 320
    const gap = 10
    
    return {
      bottom: 20,
      right: baseRight + (index * (popupWidth + gap))
    }
  }

  return (
    <ChatPopupContext.Provider value={{
      activeChats,
      openChatPopup,
      closeChatPopup,
      minimizeChatPopup,
      registerChatOpenCallback
    }}>
      {children}
      
      {activeChats.map((chat, index) => (
        <ChatPopup
          key={chat.id}
          isOpen={true}
          chat={chat}
          isMinimized={chat.isMinimized}
          position={getPopupPosition(index)}
          onClose={() => closeChatPopup(chat.id)}
          onMinimize={() => minimizeChatPopup(chat.id)}
        />
      ))}
    </ChatPopupContext.Provider>
  )
}