'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LOGIN_ROUTE } from '@/constants/api';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { loginSchema, type LoginFormData } from '@/schemas/auth.schema';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', 
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await apiClient.post(
        LOGIN_ROUTE,
        data,
        { withCredentials: true }
      );
      if (res.data.success || res.data.user?.id) {
        await login();
        Swal.fire({
          title: 'Login successful!',
          text: 'You are logged in',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        router.push('/');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
      Swal.fire({
        title: 'Login failed!',
        text: message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row max-w-6xl w-full overflow-hidden">
        {/* Left Side - Illustration */}
        <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center items-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-8 leading-tight">
            Join our charity<br />
            fundraiser social<br />
            network
          </h1>
          <div className="w-full max-w-md">
            <Image
              src="/images/charity_icon 1.png"
              alt="Charity illustration"
              width={400}
              height={400}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="lg:w-1/2 bg-white p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">Log in</h2>
            
            <form onSubmit={handleSubmit(onSubmit)}>
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
            <div className="mb-4">
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

            {/* Forgot Password Link */}
            <div className="mb-6 text-left">
              <Link href="/forgot-password" className="text-blue-500 hover:text-blue-600 transition-colors">
                Forgot password ?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all disabled:bg-blue-400 disabled:cursor-not-allowed mb-12 flex items-center justify-center gap-2"
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
              <span>{isSubmitting ? 'Logging in...' : 'Log in'}</span>
            </button>
            </form>

            {/* Sign Up Section */}
            <div className="text-center w-full">
              <h3 className="text-3xl font-bold text-gray-900 mb-4 text-left">Sign up</h3>
              <p className="text-gray-600 mb-6 text-left">Don't have an account ? Sign up</p>
              <Link
                href="/register"
                className="block w-full border-2 border-blue-600 text-blue-600 font-semibold py-4 rounded-2xl hover:bg-blue-50 transition-colors text-center"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

