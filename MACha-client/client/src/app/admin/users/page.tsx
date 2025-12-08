'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminUsers() {
  const users = [
    {
      id: 1,
      name: 'Nguyễn Thị An',
      email: 'an.nguyen@example.com',
      avatar: 'https://i.pravatar.cc/150?img=1',
      role: 'User',
      joinDate: '2023-10-27',
      status: 'active',
    },
    {
      id: 2,
      name: 'Trần Văn Bình',
      email: 'binh.tran@example.com',
      avatar: 'https://i.pravatar.cc/150?img=2',
      role: 'Admin',
      joinDate: '2023-09-15',
      status: 'active',
    },
    {
      id: 3,
      name: 'Lê Thị Cúc',
      email: 'cuc.le@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
      role: 'Editor',
      joinDate: '2023-10-01',
      status: 'blocked',
    },
    {
      id: 4,
      name: 'Phạm Văn Dũng',
      email: 'dung.pham@example.com',
      avatar: 'https://i.pravatar.cc/150?img=4',
      role: 'User',
      joinDate: '2023-11-05',
      status: 'pending',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Hoạt động</span>;
      case 'blocked':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Bị khóa</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Quản lý người dùng</h1>
              <p className="text-gray-400">Quản lý, tìm kiếm và lọc người dùng trong hệ thống.</p>
            </div>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2">
              <span className="text-xl">+</span>
              Thêm người dùng mới
            </button>
          </div>

          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email..."
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                <button className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Trạng thái: Tất cả ▼
                </button>
                <button className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Vai trò: Tất cả ▼
                </button>
                <button className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Ngày đăng ký ▼
                </button>
                <button className="p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-4 text-left">
                      <input type="checkbox" className="w-4 h-4" />
                    </th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TÊN NGƯỜI DÙNG</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">EMAIL</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">VAI TRÒ</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">NGÀY THAM GIA</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TRẠNG THÁI</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                          <div className="text-white font-medium">{user.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{user.role}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{user.joinDate}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-white transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-700 flex items-center justify-between">
              <div className="text-gray-400 text-sm">Hiển thị 1-4 trên 150</div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Previous
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">1</button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  2
                </button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  3
                </button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

