'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ConfigConstants } from '@/constants/configConstants'

const AuthTokenContext = createContext({ token: '' })

export const AuthTokenProvider = ({ children }) => {
  const [token, setToken] = useState('')

  useEffect(() => {
    const sync = () => setToken(localStorage.getItem(ConfigConstants.localstorageTokenKey) || '')
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('authTokenUpdate', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('authTokenUpdate', sync)
    }
  }, [])

  const value = useMemo(() => ({ token }), [token])
  return <AuthTokenContext.Provider value={value}>{children}</AuthTokenContext.Provider>
}

export const useLoadAuthToken = () => useContext(AuthTokenContext)
