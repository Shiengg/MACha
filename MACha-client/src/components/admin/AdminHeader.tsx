'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function AdminHeader() {
  const { user } = useAuth();
  return (
    <div className="h-16 bg-[#1a1f2e] border-b border-gray-700 fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-4">
          

          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="text-right">
              <div className="text-white font-medium text-sm">
                {user?.username || user?.email || 'Admin'}
              </div>
              <div className="text-gray-400 text-xs capitalize">{user?.role || 'Admin'}</div>
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
    </div>
  );
}

