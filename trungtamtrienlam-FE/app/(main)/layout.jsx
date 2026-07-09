'use client'

import { useEffect, useState } from 'react'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionProvider } from '@/contexts/PermissionContext'
import { LoadLocalStorageProvider, useLoadLocalStorage } from '@/contexts/LocalStorageContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { ProgressProvider } from '@/contexts/ProgressContext'
import { ChatAttachmentsProvider } from '@/contexts/ChatAttachmentsContext'
import { MaintenanceProvider } from '@/contexts/MaintenanceContext'
import { NotificationProvider } from '@/contexts/NotificationPushContext'
import { SignalRProvider } from '@/contexts/SignalRContext'
import { ChatPopupProvider } from '@/contexts/ChatPopupContext'
import AppGuard from '@/components/layout/AppGuard'
import MainShell from '@/components/layout/MainShell'

function RealtimeProviders({ children }) {
  const { userInfo } = useLoadLocalStorage()
  const [token, setToken] = useState(null)

  useEffect(() => {
    const syncToken = () => {
      setToken(localStorage.getItem('authToken') || null)
    }

    syncToken()
    window.addEventListener('storage', syncToken)
    window.addEventListener('authTokenUpdate', syncToken)
    window.addEventListener('localStorageUpdate', syncToken)
    return () => {
      window.removeEventListener('storage', syncToken)
      window.removeEventListener('authTokenUpdate', syncToken)
      window.removeEventListener('localStorageUpdate', syncToken)
    }
  }, [])

  useEffect(() => {
    const formatAxiosUrl = (config = {}) => {
      const baseURL = (config.baseURL || '').replace(/\/+$/, '')
      const url = config.url || ''
      if (/^https?:\/\//i.test(url)) return url
      return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
    }

    const handleUnhandledRejection = event => {
      const reason = event.reason
      if (reason?.isAxiosError && reason?.response?.status === 404) {
        console.warn(
          '[api:404:unhandled]',
          reason.config?.method?.toUpperCase(),
          formatAxiosUrl(reason.config),
          reason.response?.data
        )
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
    }
  }, [])

  return (
    <MaintenanceProvider>
      <NotificationProvider>
        <SignalRProvider user={userInfo} token={token}>
          <ChatPopupProvider>{children}</ChatPopupProvider>
        </SignalRProvider>
      </NotificationProvider>
    </MaintenanceProvider>
  )
}

export default function MainLayout({ children }) {
  return (
    <AuthProvider>
      <LoadLocalStorageProvider>
        <LoadingProvider>
          <ProgressProvider>
            <ChatAttachmentsProvider>
              <SidebarProvider>
                <PermissionProvider>
                  <RealtimeProviders>
                    <AppGuard>
                      <MainShell>{children}</MainShell>
                    </AppGuard>
                  </RealtimeProviders>
                </PermissionProvider>
              </SidebarProvider>
            </ChatAttachmentsProvider>
          </ProgressProvider>
        </LoadingProvider>
      </LoadLocalStorageProvider>
    </AuthProvider>
  )
}
