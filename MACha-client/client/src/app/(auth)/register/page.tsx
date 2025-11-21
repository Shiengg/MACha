'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SIGNUP_ROUTE } from '@/constants/api';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function SignupPage() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false);
    const {login, user} = useAuth();
    const router = useRouter();

    const validateSignup = () => {
        if (!username || !email || !password || !confirmPassword) {
            Swal.fire({
                title: 'Signup failed!',
                text: 'Please fill all fields',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return false;
        }
        if (password !== confirmPassword) {
            Swal.fire({
                title: 'Signup failed!',
                text: 'Passwords do not match',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return false;
        }
        return true;
    }

    const handleSignup = async () => {
        if (!validateSignup()) {
            return;
        }
        try {
            setLoading(true);
            const res = await apiClient.post(
                SIGNUP_ROUTE,
                { username, email, password },
                { withCredentials: true }
            );
            if (res.data.user?.id) {
                await login();
                Swal.fire({
                    title: 'Signup successful!',
                    text: 'You are signed up',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                router.push('/');
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || "Signup failed. Please try again.";
            Swal.fire({
                title: 'Signup failed!',
                text: message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setLoading(false);
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleSignup();
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row max-w-6xl w-full overflow-hidden">
                {/* Left Side - Sign Up Form */}
                <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center">
                    <div className="max-w-md w-full mx-auto">
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Sign up</h2>
                        <p className="text-gray-600 mb-8">
                            Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-700">Log in</Link>
                        </p>
                        
                        {/* Username Input */}
                        <div className="mb-6">
                            <label htmlFor="username" className="block text-gray-900 font-medium mb-2">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Username"
                                className="w-full px-6 py-4 border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                                disabled={loading}
                            />
                        </div>

                        {/* Email Input */}
                        <div className="mb-6">
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

                        {/* Password Input */}
                        <div className="mb-6">
                            <label htmlFor="password" className="block text-gray-900 font-medium mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Password"
                                className="w-full px-6 py-4 border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                                disabled={loading}
                            />
                        </div>

                        {/* Confirm Password Input */}
                        <div className="mb-8">
                            <label htmlFor="confirmPassword" className="block text-gray-900 font-medium mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Confirm Password"
                                className="w-full px-6 py-4 border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                                disabled={loading}
                            />
                        </div>

                        {/* Sign Up Button */}
                        <button
                            onClick={handleSignup}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                            <span>{loading ? 'Đang tạo tài khoản...' : 'Create an account'}</span>
                        </button>
                    </div>
                </div>

                {/* Right Side - Illustration */}
                <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center items-center">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight text-center">
                        Connect communities raise transparent funds
                    </h1>
                    <p className="text-gray-600 text-lg mb-8 text-center max-w-md">
                        Join our platform for social fundraising and contribute to meaningful cause.
                    </p>
                    <div className="w-full max-w-md">
                        <Image
                            src="/images/charity_signup 1.png"
                            alt="Charity signup illustration"
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

