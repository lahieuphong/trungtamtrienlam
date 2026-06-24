'use client'

import { useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import authApi from '@/lib/api/authApi'

function ResetPasswordForm() {
    const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    const handleChange = (e) => {
        const { name, value } = e.target
        setPasswords((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (passwords.password !== passwords.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp')
            return
        }
        if (!token) {
            setError('Token không hợp lệ hoặc đã hết hạn')
            return
        }

        setLoading(true)
        try {
            await authApi.resetPassword(token, email, passwords.password)
            setSuccess(true)
            setTimeout(() => router.push('/login'), 3000)
        } catch {
            setError('Không thể đặt lại mật khẩu. Token có thể đã hết hạn hoặc không hợp lệ.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <div className="flex justify-center mb-8">
                    <div className="text-center">
                        <Image src="/logo.png" alt="Logo" width={80} height={80} className="mx-auto mb-2" />
                        <div className="text-sm text-gray-600">
                            <p className="font-medium text-[#2146C7]">TRUNG TÂM BẢO TỒN VÀ PHÁT HUY</p>
                            <p className="font-medium text-[#2146C7]">Giá trị Lịch sử Văn Hóa Thành Phố Hồ Chí Minh</p>
                        </div>
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-6">Đặt lại mật khẩu</h1>

                {success ? (
                    <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6">
                        <p>Mật khẩu của bạn đã được đặt lại thành công.</p>
                        <p>Bạn sẽ được chuyển hướng đến trang đăng nhập trong vài giây...</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">{error}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-6 relative">
                                <label htmlFor="password" className="block mb-2 font-medium">
                                    Mật khẩu mới
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={passwords.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập mật khẩu mới"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-[42px] text-gray-500 hover:text-blue-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="mb-6 relative">
                                <label htmlFor="confirmPassword" className="block mb-2 font-medium">
                                    Xác nhận mật khẩu
                                </label>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={passwords.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập lại mật khẩu mới"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-[42px] text-gray-500 hover:text-blue-600 focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#2146C7] text-white py-3 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-70 mb-4"
                            >
                                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                            </button>
                        </form>
                    </>
                )}

                <div className="text-center mt-4">
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Quay lại trang đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}
