'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const getPageTitle = (pathname: string): string => {
  const routes: { [key: string]: string } = {
    '/owner/dashboard': 'Dashboard',
    '/owner/admins': 'Quản lý Admin',
    '/owner/financial': 'Tài chính tổng quan',
    '/owner/financial/campaigns': 'Tài chính Campaign',
    '/owner/admin-activities': 'Hoạt động Admin',
    '/owner/approval-history': 'Lịch sử duyệt/từ chối',
  };

  if (routes[pathname]) {
    return routes[pathname];
  }

  return 'Owner';
};

export default function OwnerHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="h-16 bg-white fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center">
            <div className="w-6 h-6 rounded bg-white/20"></div>
          </div>
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          <span className="text-gray-600 text-sm">MACha Owner</span>
          
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          <span className="text-gray-900 font-semibold text-sm">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right">
            <div className="text-gray-900 font-medium text-sm">
              {user?.username || user?.email || 'Owner'}
            </div>
            <div className="text-gray-500 text-xs capitalize">{user?.role || 'Owner'}</div>
          </div>
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.username || 'Owner'} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {(user?.username?.[0] || user?.email?.[0] || 'O').toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

