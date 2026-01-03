'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getAllUsers, User } from '@/services/admin/user.service';
import Swal from 'sweetalert2';
import { MoreVertical, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';

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
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; isLastTwo: boolean } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<'dateAdded' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
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
      
      if (openMenuId && menuRef.current && !menuRef.current.contains(target)) {
        const button = buttonRefs.current[openMenuId];
        if (button && !button.contains(target)) {
          setOpenMenuId(null);
          setMenuPosition(null);
        }
      }
      
      if (filterRef.current && !filterRef.current.contains(target) && showFilters) {
        setShowFilters(false);
      }
    };

    if (openMenuId || showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId, showFilters]);

  const handleToggleMenu = (userId: string, isLastTwo: boolean) => {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = buttonRefs.current[userId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuHeight = 50;
        setMenuPosition({
          top: isLastTwo ? rect.top - menuHeight + 30 : rect.bottom + 8,
          left: rect.right - 192,
          isLastTwo,
        });
      }
      setOpenMenuId(userId);
    }
  };

  const handleViewDetails = (userId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
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
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          {/* Main Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Quản lý người dùng</h1>
            <p className="text-gray-600">Quản lý, tìm kiếm và lọc người dùng trong hệ thống.</p>
          </div>

          {/* Header with title, count, search and filters */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Tất cả người dùng <span className="text-gray-500 font-normal">({filteredUsers.length})</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                  placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Filters Button */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-bold">Filters</span>
                </button>
                
                {/* Filters Dropdown */}
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                    <div className="space-y-4">
                      {/* Status Filter */}
                <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái
                        </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                          <option value="all">Tất cả</option>
                    <option value="verified">Đã xác thực</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="rejected">Từ chối</option>
                    <option value="unverified">Chưa xác thực</option>
                  </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 bottom-2.5 pointer-events-none text-gray-400" />
                </div>
                      
                      {/* Role Filter */}
                <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vai trò
                        </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                          <option value="all">Tất cả</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                          <option value="org">Tổ chức</option>
                  </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 bottom-2.5 pointer-events-none text-gray-400" />
                      </div>
                </div>
                </div>
                )}
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
                          className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u._id))}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Tên người dùng</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Email</th>
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
                    {paginatedUsers.map((user, index) => {
                      const roleTag = getRoleTag(user);
                      const kycTag = getKYCTag(user);
                      const displayName = user.fullname || user.username;
                      const isLastTwo = index >= paginatedUsers.length - 2;
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
                              <div className="font-medium text-gray-900">{displayName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{user.email}</div>
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
                          <button
                            ref={(el) => {
                              buttonRefs.current[user._id] = el;
                            }}
                            onClick={() => handleToggleMenu(user._id, isLastTwo)}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
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
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
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
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
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
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal-rendered dropdown menu */}
      {openMenuId && menuPosition && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 9999,
          }}
          className="w-48 bg-white border border-gray-200 rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const user = users.find(u => u._id === openMenuId);
            if (!user) return null;
            return (
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
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}

