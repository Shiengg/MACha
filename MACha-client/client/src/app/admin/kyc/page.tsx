'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getPendingKYCs, getKYCDetails, approveKYC, rejectKYC, KYCUser, KYCDetails } from '@/services/admin/kyc.service';
import Swal from 'sweetalert2';

export default function AdminKYCApproval() {
  const [kycRequests, setKycRequests] = useState<KYCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedKYC, setSelectedKYC] = useState<KYCDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchKYCs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  const fetchKYCs = async () => {
    try {
      setLoading(true);
      const data = await getPendingKYCs();
      setKycRequests(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || error?.message || 'Không thể tải danh sách KYC',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (userId: string) => {
    try {
      setLoadingDetails(true);
      setShowDetailsModal(true);
      const details = await getKYCDetails(userId);
      setSelectedKYC(details);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tải chi tiết KYC',
      });
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApprove = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Duyệt KYC?',
      text: 'Người dùng sẽ được xác thực và có thể tạo chiến dịch',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Duyệt',
      cancelButtonText: 'Hủy',
    });

    if (result.isConfirmed) {
      try {
        await approveKYC(userId);
        Swal.fire('Đã duyệt!', 'KYC đã được phê duyệt', 'success');
        fetchKYCs();
        setShowDetailsModal(false);
      } catch (error: any) {
        Swal.fire('Lỗi', error?.response?.data?.message || 'Không thể duyệt KYC', 'error');
      }
    }
  };

  const handleReject = async (userId: string) => {
    const { value: reason } = await Swal.fire({
      title: 'Từ chối KYC',
      input: 'textarea',
      inputLabel: 'Lý do từ chối',
      inputPlaceholder: 'Nhập lý do...',
      inputAttributes: {
        'aria-label': 'Nhập lý do từ chối',
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Từ chối',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => {
        if (!value) {
          return 'Bạn cần nhập lý do từ chối!';
        }
      },
    });

    if (reason) {
      try {
        await rejectKYC(userId, reason);
        Swal.fire('Đã từ chối!', 'KYC đã bị từ chối', 'success');
        fetchKYCs();
        setShowDetailsModal(false);
      } catch (error: any) {
        Swal.fire('Lỗi', error?.response?.data?.message || 'Không thể từ chối KYC', 'error');
      }
    }
  };

  const filteredRequests = kycRequests
    .filter((request) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        request.username?.toLowerCase().includes(query) ||
        request.email?.toLowerCase().includes(query) ||
        request.identity_verified_name?.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'all' || request.kyc_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.kyc_submitted_at || 0).getTime();
      const dateB = new Date(b.kyc_submitted_at || 0).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      case 'verified':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Đã duyệt</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Từ chối</span>;
      case 'unverified':
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">Chưa xác thực</span>;
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
            <h1 className="text-3xl font-bold text-white mb-2">Duyệt KYC Người Dùng</h1>
            <p className="text-gray-400">Xem xét và phê duyệt yêu cầu xác thực danh tính của người dùng.</p>
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
                    <option value="pending">Chờ duyệt</option>
                    <option value="verified">Đã duyệt</option>
                    <option value="rejected">Từ chối</option>
                    <option value="unverified">Chưa xác thực</option>
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
                    <p className="text-gray-400">Đang tải...</p>
                  </div>
                </div>
              ) : paginatedRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Không có yêu cầu KYC nào</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TÊN NGƯỜI DÙNG</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">EMAIL</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TÊN THẬT</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">CCCD (4 SỐ CUỐI)</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">NGÀY GỬI</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TRẠNG THÁI</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((request) => (
                      <tr key={request._id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{request.username}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">{request.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">{request.identity_verified_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">{request.identity_card_last4 || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400">
                            {request.kyc_submitted_at 
                              ? new Date(request.kyc_submitted_at).toLocaleDateString('vi-VN')
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(request.kyc_status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(request._id)}
                              className="p-2 text-blue-500 hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Xem chi tiết"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {request.kyc_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(request._id)}
                                  className="p-2 text-green-500 hover:bg-green-900/20 rounded-lg transition-all"
                                  title="Duyệt"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleReject(request._id)}
                                  className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg transition-all"
                                  title="Từ chối"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
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
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} / {filteredRequests.length} yêu cầu
                {searchQuery && ` (lọc từ ${kycRequests.length} tổng)`}
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

      {/* KYC Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-[#1a1f2e] z-10">
              <h2 className="text-2xl font-bold text-white">Chi tiết KYC</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Đang tải chi tiết...</p>
                </div>
              </div>
            ) : selectedKYC ? (
              <div className="p-6 space-y-6">
                {/* User Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Thông tin người dùng</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">Username</p>
                      <p className="text-white font-medium">{selectedKYC.user.username}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white font-medium">{selectedKYC.user.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Họ tên</p>
                      <p className="text-white font-medium">{selectedKYC.user.fullname || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Trạng thái</p>
                      <div className="mt-1">{getStatusBadge(selectedKYC.user.kyc_status)}</div>
                    </div>
                  </div>
                </div>

                {/* KYC Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Thông tin xác thực</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg">
                    <div>
                      <p className="text-gray-400 text-sm">Tên trên CCCD</p>
                      <p className="text-white font-medium">{selectedKYC.kyc_info.identity_verified_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">CCCD (4 số cuối)</p>
                      <p className="text-white font-medium">{selectedKYC.kyc_info.identity_card_last4 || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Mã số thuế</p>
                      <p className="text-white font-medium">{selectedKYC.kyc_info.tax_code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Địa chỉ</p>
                      <p className="text-white font-medium">
                        {selectedKYC.kyc_info.address?.district && selectedKYC.kyc_info.address?.city
                          ? `${selectedKYC.kyc_info.address.district}, ${selectedKYC.kyc_info.address.city}`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Info */}
                {selectedKYC.kyc_info.bank_account && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Thông tin ngân hàng</h3>
                    <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg">
                      <div>
                        <p className="text-gray-400 text-sm">Ngân hàng</p>
                        <p className="text-white font-medium">{selectedKYC.kyc_info.bank_account.bank_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">STK (4 số cuối)</p>
                        <p className="text-white font-medium">{selectedKYC.kyc_info.bank_account.account_number_last4 || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400 text-sm">Chủ tài khoản</p>
                        <p className="text-white font-medium">{selectedKYC.kyc_info.bank_account.account_holder_name || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selectedKYC.kyc_info.kyc_documents && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Tài liệu</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedKYC.kyc_info.kyc_documents.identity_front_url && (
                        <div>
                          <p className="text-gray-400 text-sm mb-2">CCCD mặt trước</p>
                          <a
                            href={selectedKYC.kyc_info.kyc_documents.identity_front_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-all text-blue-400 hover:text-blue-300"
                          >
                            Xem tài liệu →
                          </a>
                        </div>
                      )}
                      {selectedKYC.kyc_info.kyc_documents.identity_back_url && (
                        <div>
                          <p className="text-gray-400 text-sm mb-2">CCCD mặt sau</p>
                          <a
                            href={selectedKYC.kyc_info.kyc_documents.identity_back_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-all text-blue-400 hover:text-blue-300"
                          >
                            Xem tài liệu →
                          </a>
                        </div>
                      )}
                      {selectedKYC.kyc_info.kyc_documents.selfie_url && (
                        <div>
                          <p className="text-gray-400 text-sm mb-2">Ảnh selfie với CCCD</p>
                          <a
                            href={selectedKYC.kyc_info.kyc_documents.selfie_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-all text-blue-400 hover:text-blue-300"
                          >
                            Xem tài liệu →
                          </a>
                        </div>
                      )}
                      {selectedKYC.kyc_info.kyc_documents.tax_document_url && (
                        <div>
                          <p className="text-gray-400 text-sm mb-2">Giấy tờ thuế</p>
                          <a
                            href={selectedKYC.kyc_info.kyc_documents.tax_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-all text-blue-400 hover:text-blue-300"
                          >
                            Xem tài liệu →
                          </a>
                        </div>
                      )}
                      {selectedKYC.kyc_info.kyc_documents.bank_statement_url && (
                        <div>
                          <p className="text-gray-400 text-sm mb-2">Sao kê ngân hàng</p>
                          <a
                            href={selectedKYC.kyc_info.kyc_documents.bank_statement_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-all text-blue-400 hover:text-blue-300"
                          >
                            Xem tài liệu →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Lịch sử</h3>
                  <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg">
                    {selectedKYC.kyc_info.kyc_submitted_at && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <p className="text-gray-400">
                          Gửi yêu cầu: {new Date(selectedKYC.kyc_info.kyc_submitted_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    )}
                    {selectedKYC.kyc_info.kyc_verified_at && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-gray-400">
                          Đã duyệt: {new Date(selectedKYC.kyc_info.kyc_verified_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    )}
                    {selectedKYC.kyc_info.kyc_rejection_reason && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-gray-400">Lý do từ chối:</p>
                          <p className="text-red-400 mt-1">{selectedKYC.kyc_info.kyc_rejection_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {selectedKYC.user.kyc_status === 'pending' && (
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => handleApprove(selectedKYC.user._id)}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
                    >
                      Duyệt KYC
                    </button>
                    <button
                      onClick={() => handleReject(selectedKYC.user._id)}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
