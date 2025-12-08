'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminCampaignApproval() {
  const campaigns = [
    {
      id: 1,
      name: 'New Year 2025 Special',
      creator: 'Company A',
      submittedDate: '2024-10-28',
      startDate: '2024-12-20',
      endDate: '2025-01-05',
      status: 'approved',
    },
    {
      id: 2,
      name: 'Black Friday Sale',
      creator: 'Company B',
      submittedDate: '2024-10-27',
      startDate: '2024-11-25',
      endDate: '2024-11-30',
      status: 'rejected',
    },
    {
      id: 3,
      name: 'Summer Kick-off',
      creator: 'Company C',
      submittedDate: '2024-10-26',
      startDate: '2025-06-01',
      endDate: '2025-06-15',
      status: 'approved',
    },
    {
      id: 4,
      name: 'Back to School Deals',
      creator: 'Company D',
      submittedDate: '2024-10-25',
      startDate: '2025-08-10',
      endDate: '2025-08-25',
      status: 'approved',
    },
    {
      id: 5,
      name: 'Holiday Gift Guide',
      creator: 'Company E',
      submittedDate: '2024-10-24',
      startDate: '2024-11-15',
      endDate: '2024-12-24',
      status: 'approved',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Chấp nhận</span>;
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
            <h1 className="text-3xl font-bold text-white mb-2">Duyệt Chiến dịch</h1>
            <p className="text-gray-400">Chấp nhận hoặc từ chối các chiến dịch đang chờ duyệt.</p>
          </div>

          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Tìm theo tên chiến dịch hoặc người tạo..."
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
                  Loại chiến dịch ▼
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
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Tên chiến dịch</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Người tạo</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Ngày gửi</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Ngày bắt đầu</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Ngày kết thúc</th>
                    <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{campaign.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{campaign.creator}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{campaign.submittedDate}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{campaign.startDate}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400">{campaign.endDate}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(campaign.status)}
                          <button className="px-3 py-1 bg-red-900/30 text-red-500 rounded-lg text-sm hover:bg-red-900/50 transition-all">
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-700 flex items-center justify-between">
              <div className="text-gray-400 text-sm">Showing 1 to 5 of 20 results</div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  Previous
                </button>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  1
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">2</button>
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

