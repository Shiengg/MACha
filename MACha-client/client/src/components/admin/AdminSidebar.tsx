'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '/admin/dashboard' },
    { icon: '👥', label: 'Quản lý người dùng', href: '/admin/users' },
    { icon: '🚀', label: 'Quản lý campaign', href: '/admin/campaigns' },
    { icon: '✓', label: 'Duyệt người dùng', href: '/admin/kyc' },
    { icon: '⚙️', label: 'Cài đặt', href: '/admin/settings' },
  ];

  return (
    <div className="w-64 bg-[#1a1f2e] h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="text-white font-bold text-lg">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-all w-full">
          <span className="text-xl">🚪</span>
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

