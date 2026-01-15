'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SIGNUP_ROUTE, SIGNUP_ORGANIZATION_ROUTE, VERIFY_SIGNUP_OTP_ROUTE } from '@/constants/api';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { registerSchema, organizationSignupSchema, type RegisterFormData, type OrganizationSignupFormData } from '@/schemas/auth.schema';
import PublicRoute from '@/components/guards/PublicRoute';
import { Suspense } from 'react';

function SignupPageContent() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOrganization, setIsOrganization] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: 'onBlur',
    });

    const orgForm = useForm<OrganizationSignupFormData>({
        resolver: zodResolver(organizationSignupSchema),
        mode: 'onBlur',
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const { confirmPassword, ...signupData } = data;
            const res = await apiClient.post(
                SIGNUP_ROUTE,
                signupData,
                { withCredentials: true }
            );
            const userId = res.data.user?.id;

            if (!userId) {
                throw new Error('Không lấy được thông tin tài khoản vừa đăng ký.');
            }

            const { value: otp } = await Swal.fire({
                title: 'Xác thực tài khoản',
                text: 'Vui lòng nhập mã OTP đã được gửi đến email của bạn để hoàn tất đăng ký.',
                input: 'text',
                inputPlaceholder: 'Nhập mã OTP',
                confirmButtonText: 'Xác thực',
                showCancelButton: true,
                cancelButtonText: 'Hủy',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Vui lòng nhập mã OTP';
                    }
                    return undefined;
                }
            });

            if (!otp) {
                return;
            }

            await apiClient.post(
                VERIFY_SIGNUP_OTP_ROUTE,
                { userId, otp },
                { withCredentials: true }
            );

            await login();

            Swal.fire({
                title: 'Đăng ký & xác thực thành công!',
                text: 'Tài khoản của bạn đã được xác thực thành công.',
                icon: 'success',
                confirmButtonText: 'OK'
            });

            const needsOnboarding = res.data.user?.onboarding_completed === false;

            if (needsOnboarding) {
                router.push('/onboarding/topics');
                return;
            }

            const returnUrl = searchParams.get('returnUrl') || '/';
            router.push(returnUrl);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || "Đăng ký hoặc xác thực thất bại. Vui lòng thử lại.";
            Swal.fire({
                title: 'Thao tác thất bại!',
                text: message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    const onOrganizationSubmit = async (data: OrganizationSignupFormData) => {
        try {
            const res = await apiClient.post(
                SIGNUP_ORGANIZATION_ROUTE,
                {
                    organization_name: data.organization_name,
                    username: data.username,
                    password: data.password,
                    confirm_password: data.confirm_password,
                    email: data.email || undefined,
                },
                { withCredentials: true }
            );

            await login();

            Swal.fire({
                title: 'Đăng ký tổ chức thành công!',
                text: 'Tài khoản tổ chức của bạn đã được tạo thành công.',
                icon: 'success',
                confirmButtonText: 'OK'
            });

            const returnUrl = searchParams.get('returnUrl') || '/';
            router.push(returnUrl);
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || "Đăng ký thất bại. Vui lòng thử lại.";
            Swal.fire({
                title: 'Thao tác thất bại!',
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
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Đăng ký</h2>
                        <p className="text-gray-600 mb-4">
                            Đã có tài khoản? <Link href="/login" className="text-blue-600 hover:text-blue-700">Đăng nhập</Link>
                        </p>

                        <div className="mb-6 flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOrganization(false);
                                    reset();
                                    orgForm.reset();
                                }}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    !isOrganization
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Cá nhân
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOrganization(true);
                                    reset();
                                    orgForm.reset();
                                }}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    isOrganization
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Tổ chức
                            </button>
                        </div>

                        {!isOrganization ? (
                            <form onSubmit={handleSubmit(onSubmit)}>
                            {/* Username Input */}
                            <div className="mb-6">
                                <label htmlFor="username" className="block text-gray-900 font-medium mb-2">
                                    Tên đăng nhập
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    {...register('username')}
                                    placeholder="Tên đăng nhập"
                                    className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${errors.username
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
                                    className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${errors.email
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
                                    Mật khẩu
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    {...register('password')}
                                    placeholder="Mật khẩu"
                                    className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${errors.password
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
                                    Xác nhận mật khẩu
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    {...register('confirmPassword')}
                                    placeholder="Xác nhận mật khẩu"
                                    className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${errors.confirmPassword
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
                                <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
                            </button>
                        </form>
                        ) : (
                            <form onSubmit={orgForm.handleSubmit(onOrganizationSubmit)}>
                                <div className="mb-6">
                                    <label htmlFor="org_name" className="block text-gray-900 font-medium mb-2">
                                        Tên tổ chức
                                    </label>
                                    <input
                                        id="org_name"
                                        type="text"
                                        {...orgForm.register('organization_name')}
                                        placeholder="Tên tổ chức"
                                        className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                            orgForm.formState.errors.organization_name
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                        disabled={orgForm.formState.isSubmitting}
                                    />
                                    {orgForm.formState.errors.organization_name && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {orgForm.formState.errors.organization_name.message}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="org_username" className="block text-gray-900 font-medium mb-2">
                                        Tên đăng nhập
                                    </label>
                                    <input
                                        id="org_username"
                                        type="text"
                                        {...orgForm.register('username')}
                                        placeholder="Tên đăng nhập"
                                        className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                            orgForm.formState.errors.username
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                        disabled={orgForm.formState.isSubmitting}
                                    />
                                    {orgForm.formState.errors.username && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {orgForm.formState.errors.username.message}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="org_email" className="block text-gray-900 font-medium mb-2">
                                        Email
                                    </label>
                                    <input
                                        id="org_email"
                                        type="email"
                                        {...orgForm.register('email')}
                                        placeholder="Email"
                                        className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                            orgForm.formState.errors.email
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                        disabled={orgForm.formState.isSubmitting}
                                    />
                                    {orgForm.formState.errors.email && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {orgForm.formState.errors.email.message}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="org_password" className="block text-gray-900 font-medium mb-2">
                                        Mật khẩu
                                    </label>
                                    <input
                                        id="org_password"
                                        type="password"
                                        {...orgForm.register('password')}
                                        placeholder="Mật khẩu"
                                        className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                            orgForm.formState.errors.password
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                        disabled={orgForm.formState.isSubmitting}
                                    />
                                    {orgForm.formState.errors.password && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {orgForm.formState.errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-8">
                                    <label htmlFor="org_confirm_password" className="block text-gray-900 font-medium mb-2">
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        id="org_confirm_password"
                                        type="password"
                                        {...orgForm.register('confirm_password')}
                                        placeholder="Xác nhận mật khẩu"
                                        className={`w-full px-6 py-4 border-2 rounded-full focus:outline-none transition-colors text-gray-900 ${
                                            orgForm.formState.errors.confirm_password
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                        disabled={orgForm.formState.isSubmitting}
                                    />
                                    {orgForm.formState.errors.confirm_password && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {orgForm.formState.errors.confirm_password.message}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={orgForm.formState.isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {orgForm.formState.isSubmitting && (
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
                                    <span>{orgForm.formState.isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản tổ chức'}</span>
                                </button>
                            </form>
                        )}

                        {/* Contact Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-600 mb-2">Cần hỗ trợ?</p>
                            <p className="text-sm text-gray-700">
                                Liên hệ: <a href="mailto:owner@gmail.com" className="text-blue-600 hover:text-blue-700 hover:underline">owner@gmail.com</a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Illustration */}
                <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center items-center">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight text-center">
                        Kết nối cộng đồng, gây quỹ minh bạch
                    </h1>
                    <p className="text-gray-600 text-lg mb-8 text-center max-w-md">
                        Tham gia nền tảng gây quỹ xã hội của chúng tôi và đóng góp cho những mục đích ý nghĩa.
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
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            }>
                <SignupPageContent />
            </Suspense>
        </PublicRoute>
    );
}
