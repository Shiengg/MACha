'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            const isProfilePage = pathname.startsWith('/profile/');
            const shouldSaveReturnUrl = pathname !== '/login' && !isProfilePage;
            const returnUrl = shouldSaveReturnUrl ? `?returnUrl=${encodeURIComponent(pathname)}` : '';
            router.push(`/login${returnUrl}`);
            return;
        }

        if (
            !loading &&
            isAuthenticated &&
            user &&
            user.role === 'user' &&
            user.onboarding_completed === false &&
            !pathname.startsWith('/onboarding')
        ) {
            router.push('/onboarding/topics');
        }
    }, [isAuthenticated, loading, router, pathname, user]);

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

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

