'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { DEFAULT_TOAST_DURATION_MS } from '@/components/Toast/constants'

export default function LoginPage() {
    const [credentials, setCredentials] = useState({ username: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()
    const { login } = useAuth()
    const toast = useToast()

    useEffect(() => {
        if (sessionStorage.getItem('logoutSuccess') === 'true') {
            sessionStorage.removeItem('logoutSuccess')
            toast.success('Đăng xuất thành công!', { duration: DEFAULT_TOAST_DURATION_MS })
        }
    }, [toast])

    const handleChange = (e) => {
        const { name, value } = e.target
        setCredentials((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await login(credentials.username, credentials.password)
            toast.success('Đăng nhập thành công!', { duration: DEFAULT_TOAST_DURATION_MS })
            router.push('/')
        } catch {
            setError('Tài khoản hoặc mật khẩu không chính xác')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <div className="w-full flex items-center justify-center p-8">
                <div className="w-full">
                    <div className="flex justify-center mb-20">
                        <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={180}
                                height={180}
                                className="mx-auto mb-2"
                                priority
                            />
                            <div className="text-sm text-gray-600 mt-20">
                                <p className="font-bold text-5xl leading-[150%] uppercase tracking-[0%] text-center text-[#2146C7]">
                                    TRUNG TÂM BẢO TỒN VÀ PHÁT HUY
                                </p>
                                <p className="font-bold text-5xl leading-[150%] tracking-[0%] text-center text-[#2146C7]">
                                    Giá trị Lịch sử Văn Hóa Thành Phố Hồ Chí Minh
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-xl m-auto">
                        <h1 className="mb-4 font-semibold text-2xl leading-[140%] tracking-[0%]">Đăng nhập</h1>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">{error}</div>
                        )}

                        <form method="POST" onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal text-xl leading-[250%] tracking-[0%]"
                                    placeholder="Nhập tài khoản"
                                    required
                                />
                            </div>

                            <div className="mb-6 relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal text-xl leading-[250%] tracking-[0%] pr-10"
                                    placeholder="Nhập mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                </button>
                            </div>

                            <div className="flex justify-end mb-8">
                                <Link
                                    href="/forgot-password"
                                    className="text-blue-600 hover:underline font-normal text-lg leading-[140%] tracking-[0%] text-right"
                                >
                                    Quên mật khẩu
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#2146C7] text-white py-1/2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-70 font-normal text-[23px] leading-[200%] tracking-[0%]"
                            >
                                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
