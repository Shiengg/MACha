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
          <button className="relative p-2 text-gray-400 hover:text-white transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

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

