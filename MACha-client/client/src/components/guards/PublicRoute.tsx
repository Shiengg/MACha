'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface PublicRouteProps {
    children: React.ReactNode;
}

/**
 * PublicRoute component - Dành cho các trang như login/register
 * Nếu user đã authenticate, redirect về trang chủ hoặc returnUrl
 */
export default function PublicRoute({ children }: PublicRouteProps) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            // Lấy returnUrl từ query params nếu có
            const returnUrl = searchParams.get('returnUrl') || '/';
            router.push(returnUrl);
        }
    }, [isAuthenticated, loading, router, searchParams]);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // If authenticated, show nothing (will redirect)
    if (isAuthenticated) {
        return null;
    }

    // If not authenticated, render children (login/register page)
    return <>{children}</>;
}

