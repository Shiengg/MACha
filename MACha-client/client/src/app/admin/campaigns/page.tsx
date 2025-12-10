'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getAllCampaigns, approveCampaign, rejectCampaign, Campaign } from '@/services/admin/campaign.service';
import Swal from 'sweetalert2';

export default function AdminCampaignApproval() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getAllCampaigns();
      setCampaigns(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to fetch campaigns',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const result = await Swal.fire({
      title: 'Approve Campaign?',
      text: 'This campaign will be activated',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await approveCampaign(id);
        Swal.fire('Approved!', 'Campaign has been approved', 'success');
        fetchCampaigns();
      } catch (error: any) {
        Swal.fire('Error', error?.response?.data?.message || 'Failed to approve campaign', 'error');
      }
    }
  };

  const handleReject = async (id: string) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Campaign',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Enter reason...',
      inputAttributes: {
        'aria-label': 'Enter rejection reason',
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason!';
        }
      },
    });

    if (reason) {
      try {
        await rejectCampaign(id, reason);
        Swal.fire('Rejected!', 'Campaign has been rejected', 'success');
        fetchCampaigns();
      } catch (error: any) {
        Swal.fire('Error', error?.response?.data?.message || 'Failed to reject campaign', 'error');
      }
    }
  };

  const filteredCampaigns = campaigns
    .filter((campaign) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        campaign.title?.toLowerCase().includes(query) ||
        campaign.creator?.username?.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const oldCampaigns = [
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
      case 'active':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Đang hoạt động</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Từ chối</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-blue-900/30 text-blue-500 rounded-full text-sm">Hoàn thành</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">Đã hủy</span>;
      default:
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">{status}</span>;
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="all">Trạng thái: Tất cả</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="rejected">Từ chối</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                  <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                    className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                  <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading campaigns...</p>
                  </div>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No pending campaigns</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-4 text-left">
                        <input type="checkbox" className="w-4 h-4" />
                      </th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Tên chiến dịch</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Người tạo</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Mục tiêu</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Ngày tạo</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Trạng thái</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCampaigns.map((campaign) => (
                      <tr key={campaign._id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{campaign.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">{campaign.creator?.username || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">
                            {campaign.goal_amount?.toLocaleString('vi-VN')} VND
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">
                            {new Date(campaign.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(campaign._id)}
                              className="px-3 py-1 bg-green-900/30 text-green-500 rounded-lg text-sm hover:bg-green-900/50 transition-all"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleReject(campaign._id)}
                              className="px-3 py-1 bg-red-900/30 text-red-500 rounded-lg text-sm hover:bg-red-900/50 transition-all"
                            >
                              Từ chối
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-gray-700 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredCampaigns.length)} / {filteredCampaigns.length} campaigns
                {searchQuery && ` (lọc từ ${campaigns.length} tổng)`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    currentPage === 1
                      ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>
                
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-4 py-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    currentPage === totalPages || totalPages === 0
                      ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
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

