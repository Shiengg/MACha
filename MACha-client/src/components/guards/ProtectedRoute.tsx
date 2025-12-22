'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute component - Bảo vệ routes khỏi truy cập khi chưa đăng nhập
 * Nếu user chưa authenticate, redirect về /login
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            // Lưu lại URL hiện tại để redirect lại sau khi login
            // ✅ Không lưu returnUrl nếu đang ở profile page (vì sẽ là profile của người khác)
            const isProfilePage = pathname.startsWith('/profile/');
            const shouldSaveReturnUrl = pathname !== '/login' && !isProfilePage;
            const returnUrl = shouldSaveReturnUrl ? `?returnUrl=${encodeURIComponent(pathname)}` : '';
            router.push(`/login${returnUrl}`);
        }
    }, [isAuthenticated, loading, router, pathname]);

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

    // If not authenticated, show nothing (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    // If authenticated, render children
    return <>{children}</>;
}

