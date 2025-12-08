'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminKYCApproval() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const kycRequests = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@email.com',
      submittedDate: '25/12/2023',
      status: 'pending',
    },
    {
      id: 2,
      name: 'Trần Thị B',
      email: 'tranthib@email.com',
      submittedDate: '24/12/2023',
      status: 'verified',
    },
    {
      id: 3,
      name: 'Lê Văn C',
      email: 'levanc@email.com',
      submittedDate: '23/12/2023',
      status: 'pending',
    },
    {
      id: 4,
      name: 'Phạm Thị D',
      email: 'phamthid@email.com',
      submittedDate: '22/12/2023',
      status: 'rejected',
    },
    {
      id: 5,
      name: 'Hoàng Văn E',
      email: 'hoangvane@email.com',
      submittedDate: '21/12/2023',
      status: 'pending',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      case 'verified':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Đã duyệt</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Từ chối</span>;
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Duyệt Yêu Cầu Người Dùng</h1>
          </div>

          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email hoặc ID"
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
                  Ngày gửi ▼
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
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">NGÀY GỬI YÊU CẦU</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TRẠNG THÁI</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {kycRequests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{request.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{request.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{request.submittedDate}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-green-500 hover:bg-green-900/20 rounded-lg transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-700 flex items-center justify-between">
              <div className="text-gray-400 text-sm">Showing 1-5 of 1000</div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Previous
                </button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  1
                </button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  2
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">3</button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  ...
                </button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  100
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

