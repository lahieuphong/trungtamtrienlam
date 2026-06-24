'use client'

import { AuthProvider } from '@/contexts/AuthContext'

export default function AuthLayout({ children }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </AuthProvider>
  )
}
