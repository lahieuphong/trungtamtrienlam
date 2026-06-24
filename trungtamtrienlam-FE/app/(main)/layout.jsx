import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionProvider } from '@/contexts/PermissionContext'
import AppGuard from '@/components/layout/AppGuard'
import MainShell from '@/components/layout/MainShell'

export default function MainLayout({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <SidebarProvider>
          <PermissionProvider>
            <AppGuard>
              <MainShell>
                {children}
              </MainShell>
            </AppGuard>
          </PermissionProvider>
        </SidebarProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
