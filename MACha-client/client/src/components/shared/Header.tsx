'use client';

import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function Header() {
    const { user, isAuthenticated, loading } = useAuth();
    const pathname = usePathname();

    // Hide header on auth pages
    const authPages = ['/login', '/register', '/forgot-password'];
    const isAuthPage = authPages.includes(pathname);

    if (isAuthPage) {
        return null;
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    return <header className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <p>Hello, {user?.username}</p>
        </div>
    </header>;
}