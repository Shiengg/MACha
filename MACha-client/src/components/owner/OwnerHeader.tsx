'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { useOwnerSidebar } from '@/contexts/OwnerSidebarContext';

const getPageTitle = (pathname: string): string => {
  const routes: { [key: string]: string } = {
    '/owner/dashboard': 'Dashboard',
    '/owner/admins': 'Quản lý Admin',
    '/owner/admin-reports': 'Báo cáo về Admin',
    '/owner/financial': 'Tài chính tổng quan',
    '/owner/financial/campaigns': 'Tài chính Campaign',
    '/owner/admin-activities': 'Hoạt động Admin',
    '/owner/approval-history': 'Lịch sử duyệt/từ chối',
    '/owner/withdrawal-requests': 'Yêu cầu rút tiền',
    '/owner/refunds': 'Hoàn trả tiền',
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
  const { toggleSidebar, isSidebarOpen } = useOwnerSidebar();

  return (
    <div className={`h-16 bg-white fixed top-0 right-0 z-10 transition-all duration-300 border-b border-gray-200 ${
      isSidebarOpen ? 'lg:left-64 left-0' : 'left-0'
    }`}>
      <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <div className="w-4 h-4 sm:w-6 sm:h-6 rounded bg-white/20"></div>
            </div>
            
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block flex-shrink-0" />
            
            <span className="text-gray-600 text-xs sm:text-sm hidden sm:inline whitespace-nowrap">MACha Owner</span>
            
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hidden sm:block flex-shrink-0" />
            
            <span className="text-gray-900 font-semibold text-xs sm:text-sm truncate">{pageTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-gray-900 font-medium text-sm truncate max-w-[120px]">
              {user?.username || user?.email || 'Owner'}
            </div>
            <div className="text-gray-500 text-xs capitalize">{user?.role || 'Owner'}</div>
          </div>
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.username || 'Owner'} 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
              {(user?.username?.[0] || user?.email?.[0] || 'O').toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

