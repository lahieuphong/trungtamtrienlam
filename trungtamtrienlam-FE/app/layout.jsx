import './globals.css'
import { ToastProvider } from '@/contexts/ToastContext'

export const metadata = {
  title: 'Trung tâm triển lãm',
  description: 'Hệ thống quản lý trung tâm triển lãm',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
