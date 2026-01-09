'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerSidebar } from '@/contexts/OwnerSidebarContext';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp,
  Activity,
  History,
  LogOut,
  MoreVertical,
  Crown,
  ShieldCheck,
  Wallet,
  ChartLine,
  ClipboardList,
  Flag,
  CreditCard,
  ArrowLeftRight,
  X
} from 'lucide-react';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  showMenuIcon?: boolean;
}

export default function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { isSidebarOpen, closeSidebar } = useOwnerSidebar();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const menuSections: MenuSection[] = [
    {
      title: 'TỔNG QUAN',
      items: [
        { icon: BarChart3, label: 'Dashboard', href: '/owner/dashboard' },
      ],
    },
    {
      title: 'QUẢN LÝ HỆ THỐNG',
      items: [
        { icon: ShieldCheck, label: 'Quản lý Admin', href: '/owner/admins', badge: undefined },
        { icon: Flag, label: 'Báo cáo về Admin', href: '/owner/admin-reports', badge: undefined },
        { icon: Users, label: 'Quản lý Users', href: '/owner/users', badge: undefined },
        { icon: Wallet, label: 'Tài chính tổng quan', href: '/owner/financial' },
        { icon: ChartLine, label: 'Tài chính Campaign', href: '/owner/financial/campaigns' },
        { icon: Activity, label: 'Hoạt động Admin', href: '/owner/admin-activities' },
        { icon: ClipboardList, label: 'Lịch sử duyệt/từ chối', href: '/owner/approval-history' },
        { icon: CreditCard, label: 'Yêu cầu rút tiền', href: '/owner/withdrawal-requests' },
        { icon: ArrowLeftRight, label: 'Quản lý hoàn tiền', href: '/owner/refunds' },
      ],
      showMenuIcon: true,
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      <div className={`w-64 bg-gradient-to-b from-purple-50 to-purple-100 h-screen fixed left-0 top-0 flex flex-col border-r-2 border-purple-300 shadow-lg transition-transform duration-300 z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b-2 border-purple-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <span className="text-gray-900 font-bold text-lg block">Owner Panel</span>
                <span className="text-xs text-purple-600 font-medium">System Management</span>
              </div>
            </div>
            <button
              onClick={closeSidebar}
              className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-8' : ''}>
            <div className="flex items-center justify-between px-2 mb-3">
              <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                {section.title}
              </h3>
              {section.showMenuIcon && (
                <button className="text-gray-400 hover:text-gray-600 p-1">
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold shadow-md'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <IconComponent 
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-purple-600 group-hover:text-purple-700'
                        }`} 
                      />
                      <span className="text-sm truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                        isActive ? 'bg-white text-purple-600' : 'bg-purple-600 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all w-full"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            <span className="font-medium text-[15px]">Đăng xuất</span>
          </button>
        </div>
      </div>
    </>
  );
}

