'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { FORGOT_PASSWORD_ROUTE } from '@/constants/api';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const handleResetPassword = async () => {
        try {
            const res = await apiClient.post(FORGOT_PASSWORD_ROUTE, {email}, {withCredentials: true})
            if (res.data.success) {
                Swal.fire({
                    title: 'Mật khẩu mới đã được gửi đến email của bạn',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
            Swal.fire({
                title: 'Lỗi',
                text: message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
        router.push('/login');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleResetPassword();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row max-w-6xl w-full overflow-hidden">
                {/* Left Side - Forgot Password Form */}
                <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center">
                    <div className="max-w-md w-full mx-auto">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Quên mật khẩu</h2>
                        <p className="text-gray-600 mb-8">
                            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi hướng dẫn để đặt lại mật khẩu.
                        </p>
                        
                        {/* Email Input */}
                        <div className="mb-8">
                            <label htmlFor="email" className="block text-gray-900 font-medium mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Email"
                                className="w-full px-6 py-4 border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                                disabled={loading}
                            />
                        </div>

                        {/* Reset Password Button */}
                        <button
                            onClick={handleResetPassword}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all disabled:bg-blue-400 disabled:cursor-not-allowed mb-6 flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <svg 
                                    className="animate-spin h-5 w-5 text-white" 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    fill="none" 
                                    viewBox="0 0 24 24"
                                >
                                    <circle 
                                        className="opacity-25" 
                                        cx="12" 
                                        cy="12" 
                                        r="10" 
                                        stroke="currentColor" 
                                        strokeWidth="4"
                                    ></circle>
                                    <path 
                                        className="opacity-75" 
                                        fill="currentColor" 
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            )}
                            <span>{loading ? 'Đang gửi yêu cầu...' : 'Gửi liên kết đặt lại'}</span>
                        </button>

                        {/* Back to Login Link */}
                        <div className="text-center mb-6">
                            <Link 
                                href="/login" 
                                className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-2"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-5 w-5" 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                >
                                    <path 
                                        fillRule="evenodd" 
                                        d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                                        clipRule="evenodd" 
                                    />
                                </svg>
                                Quay lại đăng nhập
                            </Link>
                        </div>

                        {/* Contact Section */}
                        <div className="pt-6 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-600 mb-2">Cần hỗ trợ?</p>
                            <p className="text-sm text-gray-700">
                                Liên hệ: <a href="mailto:owner@gmail.com" className="text-blue-600 hover:text-blue-700 hover:underline">owner@gmail.com</a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Illustration */}
                <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center items-center">
                    <h1 className="text-5xl font-bold text-gray-900 mb-8 leading-tight text-center">
                        Đặt lại mật khẩu của bạn
                    </h1>
                    <p className="text-gray-600 text-lg mb-8 text-center max-w-md">
                        Đừng lo lắng! Chúng tôi sẽ giúp bạn lấy lại quyền truy cập vào tài khoản.
                    </p>
                    <div className="w-full max-w-md">
                        <Image
                            src="/images/charity_icon 1.png"
                            alt="Password reset illustration"
                            width={400}
                            height={400}
                            className="w-full h-auto"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}