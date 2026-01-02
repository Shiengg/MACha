'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  Users, 
  Megaphone, 
  CheckCircle, 
  DollarSign, 
  Settings, 
  MoreVertical,
  LogOut,
  Calendar,
  AlertTriangle
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

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const menuSections: MenuSection[] = [
    {
      title: 'GENERAL',
      items: [
        { icon: BarChart3, label: 'Dashboard', href: '/admin/dashboard' },
        { icon: Settings, label: 'Cài đặt', href: '/admin/settings' },
      ],
    },
    {
      title: 'QUẢN LÝ',
      items: [
        { icon: Users, label: 'Quản lý người dùng', href: '/admin/users' },
        { icon: Megaphone, label: 'Quản lý campaign', href: '/admin/campaigns' },
        { icon: Calendar, label: 'Quản lý sự kiện', href: '/admin/events' },
        { icon: CheckCircle, label: 'Duyệt người dùng', href: '/admin/kyc' },
        { icon: DollarSign, label: 'Yêu cầu rút tiền', href: '/admin/withdrawal-requests' },
        { icon: AlertTriangle, label: 'Quản lý báo cáo', href: '/admin/reports' },
      ],
      showMenuIcon: true,
    },
  ];

  return (
    <div className="w-64 bg-gray-50 h-screen fixed left-0 top-0 flex flex-col border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="text-gray-900 font-bold text-lg">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-8' : ''}>
            <div className="flex items-center justify-between px-2 mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                        ? 'bg-gray-200 text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <IconComponent 
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                        }`} 
                      />
                      <span className="text-sm truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
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
  );
}

