'use client'

import { AuthProvider } from '@/contexts/AuthContext'

export default function AuthLayout({ children }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}
