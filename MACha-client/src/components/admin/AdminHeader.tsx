'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const getPageTitle = (pathname: string): string => {
  const routes: { [key: string]: string } = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User management',
    '/admin/campaigns': 'Campaign management',
    '/admin/events': 'Event management',
    '/admin/kyc': 'KYC Approval',
    '/admin/withdrawal-requests': 'Withdrawal Requests',
    '/admin/reports': 'Reports management',
    '/admin/settings': 'Settings',
  };

  // Check for exact match first
  if (routes[pathname]) {
    return routes[pathname];
  }

  // Check for dynamic routes
  if (pathname.startsWith('/admin/users/')) {
    return 'User management';
  }
  if (pathname.startsWith('/admin/campaigns/')) {
    return 'Campaign management';
  }

  return 'Admin';
};

export default function AdminHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="h-16 bg-white fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2">
          {/* App Icon */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 via-pink-500 via-purple-500 to-blue-500 flex items-center justify-center">
            <div className="w-6 h-6 rounded bg-white/20"></div>
          </div>
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          <span className="text-gray-600 text-sm">MACha Admin</span>
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          <span className="text-gray-900 font-semibold text-sm">{pageTitle}</span>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right">
            <div className="text-gray-900 font-medium text-sm">
              {user?.username || user?.email || 'Admin'}
            </div>
            <div className="text-gray-500 text-xs capitalize">{user?.role || 'Admin'}</div>
          </div>
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.username || 'Admin'} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {(user?.username?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

