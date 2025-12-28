'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getAllUsers, User } from '@/services/admin/user.service';
import Swal from 'sweetalert2';
import { MoreVertical, ChevronDown } from 'lucide-react';

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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<'dateAdded' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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
      // Apply column sorting if set
      if (sortColumn === 'dateAdded') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      // Default sorting by createdAt
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getRoleTag = (user: User) => {
    if (user.role === 'admin') {
      return { label: 'Admin', bgColor: 'bg-green-50', textColor: 'text-green-700' };
    } else if (user.role === 'org') {
      return { label: 'Tổ chức', bgColor: 'bg-purple-50', textColor: 'text-purple-700' };
    } else {
      return { label: 'Người dùng', bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
    }
  };

  const getKYCTag = (user: User) => {
    switch (user.kyc_status) {
      case 'verified':
        return { label: 'Đã xác thực', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' };
      case 'pending':
        return { label: 'Chờ duyệt', bgColor: 'bg-amber-50', textColor: 'text-amber-700' };
      case 'rejected':
        return { label: 'Từ chối', bgColor: 'bg-red-50', textColor: 'text-red-700' };
      default:
        return { label: 'Chưa xác thực', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(paginatedUsers.map(u => u._id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSort = (column: 'dateAdded') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Quản lý người dùng</h1>
            <p className="text-gray-600">Quản lý, tìm kiếm và lọc người dùng trong hệ thống.</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 text-gray-900 px-4 py-2.5 rounded-lg pl-10 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Trạng thái: Tất cả</option>
                  <option value="verified">Đã xác thực</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="rejected">Từ chối</option>
                  <option value="unverified">Chưa xác thực</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              </div>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Vai trò: Tất cả</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="org">Tổ chức</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Không tìm thấy người dùng</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="px-6 py-3 text-left">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u._id))}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">User name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Vai trò</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">KYC</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                        <button
                          onClick={() => handleSort('dateAdded')}
                          className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                        >
                          Ngày tham gia
                          {sortColumn === 'dateAdded' && (
                            <ChevronDown className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedUsers.map((user) => {
                      const roleTag = getRoleTag(user);
                      const kycTag = getKYCTag(user);
                      const displayName = user.fullname || user.username;
                      return (
                        <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedUsers.has(user._id)}
                              onChange={(e) => handleSelectUser(user._id, e.target.checked)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={displayName} 
                                  className="w-10 h-10 rounded-full object-cover" 
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                  {(user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{displayName}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${roleTag.bgColor} ${roleTag.textColor}`}
                            >
                              {roleTag.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${kycTag.bgColor} ${kycTag.textColor}`}
                            >
                              {kycTag.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative" ref={(el) => { menuRefs.current[user._id] = el; }}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === user._id ? null : user._id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              {openMenuId === user._id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(user._id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    Xem chi tiết
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} / {filteredUsers.length} người dùng
                {searchQuery && ` (lọc từ ${users.length} tổng)`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg transition-all text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
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
                      className={`px-4 py-2 rounded-lg transition-all text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`px-4 py-2 rounded-lg transition-all text-sm ${
                    currentPage === totalPages || totalPages === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
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

