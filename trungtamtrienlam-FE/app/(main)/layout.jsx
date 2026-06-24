import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'
import AppGuard from '@/components/layout/AppGuard'
import MainShell from '@/components/layout/MainShell'

export default function MainLayout({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <SidebarProvider>
          <AppGuard>
            <MainShell>
              {children}
            </MainShell>
          </AppGuard>
        </SidebarProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
