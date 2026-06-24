'use client'

import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'
import AppGuard from '@/components/layout/AppGuard'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function MainLayout({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <SidebarProvider>
          <AppGuard>
            <div className="flex h-screen overflow-hidden bg-gray-50">
              <Sidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                  {children}
                </main>
              </div>
            </div>
          </AppGuard>
        </SidebarProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
