import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionProvider } from '@/contexts/PermissionContext'
import AppGuard from '@/components/layout/AppGuard'
import MainShell from '@/components/layout/MainShell'

export default function MainLayout({ children }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <PermissionProvider>
          <AppGuard>
            <MainShell>
              {children}
            </MainShell>
          </AppGuard>
        </PermissionProvider>
      </SidebarProvider>
    </AuthProvider>
  )
}
