'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import authApi from '@/lib/api/authApi'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!email.trim()) {
            setError('Vui lòng nhập địa chỉ email.')
            return
        }
        if (!isValidEmail(email)) {
            setError('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.')
            return
        }

        setLoading(true)
        try {
            await authApi.forgotPassword(email)
            setSuccess(true)
        } catch {
            setError('Không thể gửi yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau.')
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

                <h1 className="text-2xl font-bold mb-6">Quên mật khẩu</h1>

                {success ? (
                    <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6">
                        <p>Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">{error}</div>
                        )}

                        <p className="text-gray-600 mb-6">
                            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn hướng dẫn để đặt lại mật khẩu.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <label htmlFor="email" className="block mb-2 font-medium">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập địa chỉ email"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#2146C7] text-white py-3 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-70 mb-4"
                            >
                                {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
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
