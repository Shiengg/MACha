'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService, User } from '@/services/owner.service';
import Swal from 'sweetalert2';
import { Search, Ban, Unlock, RotateCcw, Eye, MoreVertical, Download, Filter } from 'lucide-react';
import Link from 'next/link';

export default function OwnerUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [banFilter, setBanFilter] = useState<string>('');
  const [kycFilter, setKycFilter] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, banFilter, kycFilter, searchQuery]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const button = buttonRefs.current[openMenuId];
        if (button && !button.contains(event.target as Node)) {
          setOpenMenuId(null);
          setMenuPosition(null);
        }
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getAllUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        is_banned: banFilter === 'banned' ? true : banFilter === 'active' ? false : undefined,
        kyc_status: kycFilter || undefined,
      });
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      // Only show error if we don't have any users
      if (users.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: error?.response?.data?.message || 'Không thể tải danh sách người dùng',
        });
      } else {
        // If we have users, just log the error but don't show alert
        console.warn('Error fetching users but keeping existing data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMenu = (userId: string) => {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = buttonRefs.current[userId];
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8, // Use viewport coordinates for fixed positioning
          left: rect.right - 192, // 192 = w-48 (12rem = 192px)
        });
      }
      setOpenMenuId(userId);
    }
  };

  const handleBanUser = async (user: User) => {
    setSelectedUser(user);
    setOpenMenuId(null);
    setMenuPosition(null);
    setShowBanModal(true);
  };

  const confirmBanUser = async () => {
    if (!selectedUser) return;

    try {
      await ownerService.banUser(selectedUser._id, banReason);
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Đã khóa người dùng thành công',
      });
      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
          title: 'Lỗi',
          text: error?.response?.data?.message || 'Không thể khóa người dùng',
      });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const result = await Swal.fire({
      title: 'Mở khóa người dùng?',
      text: 'Bạn có chắc chắn muốn mở khóa người dùng này không?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Có, mở khóa',
    });

    if (result.isConfirmed) {
      try {
        await ownerService.unbanUser(userId);
        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: 'Đã mở khóa người dùng thành công',
        });
        fetchUsers();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: error?.response?.data?.message || 'Không thể mở khóa người dùng',
        });
      }
    }
  };

  const handleResetKYC = async (userId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const result = await Swal.fire({
      title: 'Đặt lại trạng thái KYC?',
      text: 'Hành động này sẽ đặt lại trạng thái KYC của người dùng về chưa xác thực. Tiếp tục?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Có, đặt lại',
    });

    if (result.isConfirmed) {
      try {
        await ownerService.resetUserKYC(userId);
        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: 'Đã đặt lại trạng thái KYC thành công',
        });
        fetchUsers();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: error?.response?.data?.message || 'Không thể đặt lại trạng thái KYC',
        });
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Tên đăng nhập', 'Email', 'Họ tên', 'Vai trò', 'Trạng thái KYC', 'Trạng thái khóa', 'Ngày tạo'];
    const rows = users.map(user => [
      user.username,
      user.email,
      user.fullname || '',
      user.role,
      user.kyc_status,
      user.is_banned ? 'Đã khóa' : 'Hoạt động',
      new Date(user.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OwnerSidebar />
        <OwnerHeader />
        <OwnerContentWrapper>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Đang tải...</p>
            </div>
          </div>
        </OwnerContentWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Quản lý người dùng</h1>
              <p className="text-sm sm:text-base text-gray-600">Quản lý tất cả người dùng trong hệ thống</p>
            </div>
            <button
              onClick={exportToCSV}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Xuất CSV</span>
              <span className="sm:hidden">Xuất</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Bộ lọc</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm theo tên đăng nhập, email..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Tất cả người dùng</option>
                  <option value="user">Người dùng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái khóa</label>
                <select
                  value={banFilter}
                  onChange={(e) => {
                    setBanFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="banned">Đã khóa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái KYC</label>
                <select
                  value={kycFilter}
                  onChange={(e) => {
                    setKycFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  <option value="unverified">Chưa xác thực</option>
                  <option value="pending">Đang chờ</option>
                  <option value="verified">Đã xác thực</option>
                  <option value="rejected">Bị từ chối</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Trạng thái KYC</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Ngày tạo</th>
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar ? (
                            <img className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" src={user.avatar} alt={user.username} />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                              {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="ml-2 sm:ml-4">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{user.fullname || user.username}</div>
                            <div className="text-xs sm:text-sm text-gray-500">@{user.username}</div>
                            <div className="text-xs text-gray-400 md:hidden mt-1">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.kyc_status === 'verified' ? 'bg-green-100 text-green-800' :
                          user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          user.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.kyc_status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                          </span>
                          {user.is_banned && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Đã khóa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block">
                          <button
                            ref={(el) => {
                              buttonRefs.current[user._id] = el;
                            }}
                            onClick={() => handleToggleMenu(user._id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-200 flex-wrap gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Trước
              </button>
              <span className="text-xs sm:text-sm text-gray-700">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </OwnerContentWrapper>

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
        >
          {(() => {
            const user = users.find(u => u._id === openMenuId);
            if (!user) return null;
            return (
              <>
                <Link
                  href={`/owner/users/${user._id}/history`}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setOpenMenuId(null);
                    setMenuPosition(null);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Xem lịch sử
                </Link>
                {user.is_banned ? (
                  <button
                    onClick={() => handleUnbanUser(user._id)}
                    className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Mở khóa
                  </button>
                ) : (
                  <button
                    onClick={() => handleBanUser(user)}
                    className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Khóa
                  </button>
                )}
                <button
                  onClick={() => handleResetKYC(user._id)}
                  className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Đặt lại KYC
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Khóa người dùng: {selectedUser.username}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lý do khóa</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do khóa..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmBanUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Khóa người dùng
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

