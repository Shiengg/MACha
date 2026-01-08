'use client';

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageCircle, Menu, X } from "lucide-react";
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="animate-pulse flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-6 flex-1">
                            <div className="w-24 sm:w-32 h-6 sm:h-8 bg-gray-200 rounded"></div>
                            <div className="hidden md:block flex-1 max-w-lg h-10 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="hidden md:block w-20 h-8 bg-gray-200 rounded"></div>
                            <div className="hidden md:block w-20 h-8 bg-gray-200 rounded"></div>
                            <div className="hidden sm:block w-28 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-200 rounded-full"></div>
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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3">
                {/* Main Header Row */}
                <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
                    {/* Left side: Logo and Search (Mobile) / Logo and Search Bar (Desktop) */}
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-6 flex-1 min-w-0">
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
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
                        >
                            <Image
                                src="/logo/MACha_Logo_header.svg"
                                alt="MACha Logo"
                                width={222}
                                height={47}
                                className="h-5 sm:h-6 md:h-7 lg:h-8 w-auto"
                                priority
                            />
                        </button>

                        {/* Mobile Search Icon */}
                        <button
                            onClick={() => {
                                setIsSearchExpanded(!isSearchExpanded);
                                setIsMobileMenuOpen(false);
                            }}
                            className="md:hidden w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                            aria-label="Search"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* Search Bar - Desktop/Tablet */}
                        <div className="hidden md:flex flex-1 max-w-lg relative">
                            <form onSubmit={handleSearchSubmit} className="w-full">
                                <div className="relative">
                                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm chiến dịch, quỹ..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => isAuthenticated && setIsSearchDropdownOpen(true)}
                                        className="w-full pl-10 md:pl-12 pr-4 py-2 md:py-2.5 bg-gray-50 border border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
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

                        {/* Spacer for mobile - creates space between left and right */}
                        <div className="md:hidden flex-1"></div>
                    </div>

                    {/* Right side: Messages, Notifications, Hamburger Menu (Mobile) / Full Navigation (Desktop) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                        {/* Navigation Links - Desktop Only */}
                        <button
                            onClick={() => {
                                router.push('/events');
                                setIsMobileMenuOpen(false);
                            }}
                            className="px-3 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all hidden lg:block font-inter"
                        >
                            Sự kiện
                        </button>

                        <button
                            onClick={() => {
                                router.push('/discover');
                                setIsMobileMenuOpen(false);
                            }}
                            className="px-3 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all hidden lg:block font-inter"
                        >
                            Khám phá
                        </button>

                        <button
                            onClick={() => {
                                router.push('/map');
                                setIsMobileMenuOpen(false);
                            }}
                            className="px-3 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all hidden lg:block font-inter"
                        >
                            Bản đồ
                        </button>

                        {/* Create Campaign Button - Desktop/Tablet Only */}
                        <button
                            onClick={() => {
                                router.push('/create-campaign');
                                setIsMobileMenuOpen(false);
                            }}
                            className="px-3 md:px-5 py-2 md:py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hidden sm:block font-inter whitespace-nowrap"
                        >
                            <span className="hidden md:inline">Tạo chiến dịch</span>
                            <span className="md:hidden">Tạo</span>
                        </button>

                        {/* Messages Button */}
                        <button
                            onClick={() => {
                                router.push('/messages');
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all relative flex-shrink-0"
                            aria-label="Messages"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </button>

                        {/* Notification Dropdown */}
                        <div className="flex-shrink-0">
                            <NotificationDropdown />
                        </div>

                        {/* Hamburger Menu Button - Mobile Only */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>

                        {/* User Avatar with Dropdown - Desktop/Tablet Only */}
                        {isAuthenticated && user ? (
                            <div className="relative group hidden md:block flex-shrink-0">
                                <button
                                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-emerald-400 hover:ring-offset-2 transition-all text-sm sm:text-base"
                                    aria-label="User menu"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    {user.avatar ? (
                                        <Image
                                            src={user.avatar}
                                            alt={user.username || 'User avatar'}
                                            fill
                                            sizes="(max-width: 640px) 36px, 40px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        (user.username?.charAt(0).toUpperCase() || 'U')
                                    )}
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 font-inter z-50">
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
                                onClick={() => {
                                    router.push('/login');
                                    setIsMobileMenuOpen(false);
                                }}
                                className="hidden md:block px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap"
                            >
                                Đăng nhập
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Search Bar - Expanded */}
                {isSearchExpanded && (
                    <div className="md:hidden mt-3 pb-2">
                        <form onSubmit={handleSearchSubmit}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm chiến dịch, quỹ..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => isAuthenticated && setIsSearchDropdownOpen(true)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setIsSearchExpanded(false);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </form>
                        {isAuthenticated && (
                            <SearchHistoryDropdown
                                isOpen={isSearchDropdownOpen}
                                onClose={() => setIsSearchDropdownOpen(false)}
                                onSearch={(query) => {
                                    handleSearch(query);
                                    setIsSearchExpanded(false);
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Mobile Menu - Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-3 pb-3 border-t border-gray-200 pt-3">
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => {
                                    router.push('/events');
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all font-inter"
                            >
                                Sự kiện
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/discover');
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all font-inter"
                            >
                                Khám phá
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/map');
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all font-inter"
                            >
                                Bản đồ
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/create-campaign');
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg transition-all font-inter mt-2"
                            >
                                Tạo chiến dịch
                            </button>
                            
                            {/* User Menu Items - Mobile Only */}
                            {isAuthenticated && user && (
                                <>
                                    <div className="border-t border-gray-200 mt-2 pt-2">
                                        <div className="px-4 py-2">
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
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all font-inter"
                                        >
                                            Hồ sơ của tôi
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/settings');
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all font-inter"
                                        >
                                            Cài đặt tài khoản
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await logout();
                                                router.push('/login');
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all font-inter"
                                        >
                                            Đăng xuất
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {/* Login Button - Mobile Only (if not authenticated) */}
                            {!isAuthenticated && (
                                <div className="border-t border-gray-200 mt-2 pt-2">
                                    <button
                                        onClick={() => {
                                            router.push('/login');
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors font-inter"
                                    >
                                        Đăng nhập
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}