'use client';

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageCircle } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import NotificationDropdown from "./NotificationDropdown";
import SearchHistoryDropdown from "./SearchHistoryDropdown";
import { saveSearchHistory } from "@/services/search.service";

export default function Header() {
    const { user, isAuthenticated, loading, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

    // Hide header on auth pages, admin pages, and owner pages
    const authPages = ['/login', '/register', '/forgot-password'];
    const isAuthPage = authPages.includes(pathname);
    const isAdminPage = pathname.startsWith('/admin');
    const isOwnerPage = pathname.startsWith('/owner');

    if (isAuthPage || isAdminPage || isOwnerPage) {
        return null;
    }

    if (loading) {
        return (
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="animate-pulse flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                            <div className="w-32 h-8 bg-gray-200 rounded"></div>
                            <div className="flex-1 max-w-lg h-10 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-8 bg-gray-200 rounded"></div>
                            <div className="w-20 h-8 bg-gray-200 rounded"></div>
                            <div className="w-28 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </header>
        );
    }

    const handleSearch = async (query?: string) => {
        const queryToSearch = query || searchQuery.trim();
        if (queryToSearch) {
            if (isAuthenticated) {
                try {
                    await saveSearchHistory(queryToSearch);
                } catch (error) {
                    console.error('Failed to save search history:', error);
                }
            }

            if (queryToSearch.startsWith('#')) {
                const hashtagName = queryToSearch.substring(1).trim().toLowerCase();
                if (hashtagName) {
                    router.push(`/hashtag/${encodeURIComponent(hashtagName)}`);
                }
            } else {
                const normalizedQuery = queryToSearch.toLowerCase();
                router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
            }
            setSearchQuery("");
            setIsSearchDropdownOpen(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchDropdownOpen(false);
        handleSearch();
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-500">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex items-center justify-between gap-8">
                    {/* Left side: Logo and Search */}
                    <div className="flex items-center gap-6 flex-1">
                        {/* Logo */}
                        <button
                            onClick={() => {
                                if (user?.role === 'owner') {
                                    router.push('/owner/dashboard');
                                    return;
                                }
                                
                                if (pathname === '/') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    window.dispatchEvent(new CustomEvent('refreshPosts'));
                                } else {
                                    router.push('/');
                                    setTimeout(() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }, 100);
                                }
                            }}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <Image
                                src="/logo/MACha_Logo_header.svg"
                                alt="MACha Logo"
                                width={222}
                                height={47}
                                className="h-8 w-auto"
                                priority
                            />
                        </button>

                        {/* Search Bar */}
                        <div className="flex-1 max-w-lg relative">
                            <form onSubmit={handleSearchSubmit}>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm chiến dịch, quỹ..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => isAuthenticated && setIsSearchDropdownOpen(true)}
                                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
                                    />
                                </div>
                            </form>
                            {isAuthenticated && (
                                <SearchHistoryDropdown
                                    isOpen={isSearchDropdownOpen}
                                    onClose={() => setIsSearchDropdownOpen(false)}
                                    onSearch={handleSearch}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right side: Navigation buttons and user menu */}
                    <div className="flex items-center gap-3">
                        {/* Navigation Links */}
                        <button
                            onClick={() => router.push('/events')}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all hidden md:block font-inter"
                        >
                            Sự kiện
                        </button>

                        <button
                            onClick={() => router.push('/discover')}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all hidden md:block font-inter"
                        >
                            Khám phá
                        </button>

                        <button
                            onClick={() => router.push('/map')}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all hidden md:block font-inter"
                        >
                            Bản đồ
                        </button>


                        {/* Create Campaign Button - Highlighted */}
                        <button
                            onClick={() => router.push('/create-campaign')}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hidden sm:block font-inter"
                        >
                            Tạo chiến dịch
                        </button>

                        {/* Icon Buttons */}
                        <button
                            onClick={() => router.push('/messages')}
                            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all relative"
                            aria-label="Messages"
                        >
                            <MessageCircle className="w-5 h-5" />
                            {/* Notification badge example */}
                            {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span> */}
                        </button>

                        {/* Notification Dropdown - Facebook style */}
                        <NotificationDropdown />

                        {/* User Avatar with Dropdown */}
                        {isAuthenticated && user ? (
                            <div className="relative group">
                                <button
                                    className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-emerald-400 hover:ring-offset-2 transition-all"
                                    aria-label="User menu"
                                >
                                    {user.avatar ? (
                                        <Image
                                            src={user.avatar}
                                            alt={user.username || 'User avatar'}
                                            fill
                                            sizes="40px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        (user.username?.charAt(0).toUpperCase() || 'U')
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 font-inter">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {user.username || 'User'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const userId = (user as any)?._id || (user as any)?.id;
                                            if (userId) {
                                                router.push(`/profile/${userId}`);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Hồ sơ của tôi
                                    </button>

                                    <button
                                        onClick={() => router.push('/settings')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cài đặt tài khoản
                                    </button>
                                    <div className="border-t border-gray-100 mt-2 pt-2">
                                        <button
                                            onClick={async () => {
                                                await logout();
                                                router.push('/login');
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => router.push('/login')}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                            >
                                Đăng nhập
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}