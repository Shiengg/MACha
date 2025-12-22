'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SIGNUP_ROUTE } from '@/constants/api';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema';
import PublicRoute from '@/components/guards/PublicRoute';

function SignupPageContent() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: 'onBlur', // Validate khi blur khỏi field
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const { confirmPassword, ...signupData } = data; // Loại bỏ confirmPassword
            const res = await apiClient.post(
                SIGNUP_ROUTE,
                signupData,
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
                
                // Redirect về returnUrl nếu có, hoặc về trang chủ
                const returnUrl = searchParams.get('returnUrl') || '/';
                router.push(returnUrl);
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || "Signup failed. Please try again.";
            Swal.fire({
                title: 'Signup failed!',
                text: message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
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
                        
                        <form onSubmit={handleSubmit(onSubmit)}>
                        {/* Username Input */}
                        <div className="mb-6">
                            <label htmlFor="username" className="block text-gray-900 font-medium mb-2">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                {...register('username')}
                                placeholder="Username"
                                className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                    errors.username 
                                        ? 'border-red-500 focus:border-red-500' 
                                        : 'border-gray-300 focus:border-blue-500'
                                }`}
                                disabled={isSubmitting}
                            />
                            {errors.username && (
                                <p className="mt-2 text-sm text-red-600">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Email Input */}
                        <div className="mb-6">
                            <label htmlFor="email" className="block text-gray-900 font-medium mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                {...register('email')}
                                placeholder="Email"
                                className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                    errors.email 
                                        ? 'border-red-500 focus:border-red-500' 
                                        : 'border-gray-300 focus:border-blue-500'
                                }`}
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div className="mb-6">
                            <label htmlFor="password" className="block text-gray-900 font-medium mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                {...register('password')}
                                placeholder="Password"
                                className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                    errors.password 
                                        ? 'border-red-500 focus:border-red-500' 
                                        : 'border-gray-300 focus:border-blue-500'
                                }`}
                                disabled={isSubmitting}
                            />
                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password Input */}
                        <div className="mb-8">
                            <label htmlFor="confirmPassword" className="block text-gray-900 font-medium mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                {...register('confirmPassword')}
                                placeholder="Confirm Password"
                                className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                    errors.confirmPassword 
                                        ? 'border-red-500 focus:border-red-500' 
                                        : 'border-gray-300 focus:border-blue-500'
                                }`}
                                disabled={isSubmitting}
                            />
                            {errors.confirmPassword && (
                                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && (
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
                            <span>{isSubmitting ? 'Creating account...' : 'Create an account'}</span>
                        </button>
                        </form>
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

export default function SignupPage() {
    return (
        <PublicRoute>
            <SignupPageContent />
        </PublicRoute>
    );
}
