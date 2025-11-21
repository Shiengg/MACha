'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        // TODO: Implement reset password logic
        console.log('Reset password for:', email);
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
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Forgot Password</h2>
                        <p className="text-gray-600 mb-8">
                            Enter your email address and we'll send you instructions to reset your password.
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
                            <span>{loading ? 'Đang gửi yêu cầu...' : 'Send Reset Link'}</span>
                        </button>

                        {/* Back to Login Link */}
                        <div className="text-center">
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
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Side - Illustration */}
                <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center items-center">
                    <h1 className="text-5xl font-bold text-gray-900 mb-8 leading-tight text-center">
                        Reset your password
                    </h1>
                    <p className="text-gray-600 text-lg mb-8 text-center max-w-md">
                        Don't worry! It happens. We'll help you get back to your account.
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