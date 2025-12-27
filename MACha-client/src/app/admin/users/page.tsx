'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getAllUsers, User } from '@/services/admin/user.service';
import Swal from 'sweetalert2';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, roleFilter, sortBy]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      Object.entries(menuRefs.current).forEach(([userId, ref]) => {
        if (ref && !ref.contains(target) && openMenuId === userId) {
          setOpenMenuId(null);
        }
      });
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const handleViewDetails = (userId: string) => {
    setOpenMenuId(null);
    router.push(`/admin/users/${userId}`);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to fetch users',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users
    .filter((user) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.fullname?.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'all' || user.kyc_status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Đã xác thực</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Từ chối</span>;
      case 'unverified':
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">Chưa xác thực</span>;
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Quản lý người dùng</h1>
              <p className="text-gray-400">Quản lý, tìm kiếm và lọc người dùng trong hệ thống.</p>
            </div>
            
          </div>

          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email..."
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
                    <option value="verified">Đã xác thực</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="rejected">Từ chối</option>
                    <option value="unverified">Chưa xác thực</option>
                  </select>
                  <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="all">Vai trò: Tất cả</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
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
                <button className="p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading users...</p>
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No users found</p>
                </div>
              ) : (
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
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">KYC</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user._id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                        <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="text-white font-medium">{user.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400 capitalize">{user.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getKYCStatusBadge(user.kyc_status)}</td>
                        <td className="px-6 py-4">
                          <div className="relative" ref={(el) => { menuRefs.current[user._id] = el; }}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === user._id ? null : user._id)}
                              className="text-gray-400 hover:text-white transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {openMenuId === user._id && (
                              <div 
                                className="absolute right-0 mt-2 w-48 bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-lg z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(user._id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition-all rounded-lg"
                                >
                                  Xem chi tiết
                                </button>
                              </div>
                            )}
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
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} / {filteredUsers.length} users
                {searchQuery && ` (lọc từ ${users.length} tổng)`}
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

