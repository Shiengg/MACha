'use client';

import { useState, useEffect, Suspense } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService, OwnerDonation, GetOwnerDonationsFilters } from '@/services/owner.service';
import { DollarSign, Search, Filter, ChevronLeft, ChevronRight, Calendar, X, Eye, Image as ImageIcon, FileText } from 'lucide-react';

function OwnerDonationDashboardContent() {
  const [donations, setDonations] = useState<OwnerDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState<GetOwnerDonationsFilters>({
    page: 1,
    limit: 20
  });
  
  // Filter inputs
  const [campaignSearch, setCampaignSearch] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [donorSearch, setDonorSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal state
  const [selectedDonation, setSelectedDonation] = useState<OwnerDonation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchDonations();
  }, [page, filters]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const result = await ownerService.getOwnerDonations({
        ...filters,
        page,
        limit
      });
      
      setDonations(result.donations);
      setTotal(result.pagination.total);
      setPages(result.pagination.pages);
    } catch (error: any) {
      console.error('Error fetching donations:', error);
      setDonations([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const newFilters: GetOwnerDonationsFilters = {
      page: 1,
      limit: 20
    };
    
    if (campaignSearch.trim()) {
      newFilters.campaignSearch = campaignSearch.trim();
    }
    if (creatorId.trim()) {
      newFilters.creatorId = creatorId.trim();
    }
    if (donorSearch.trim()) {
      newFilters.donorSearch = donorSearch.trim();
    }
    if (fromDate) {
      newFilters.fromDate = fromDate;
    }
    if (toDate) {
      newFilters.toDate = toDate;
    }
    if (paymentStatus) {
      newFilters.paymentStatus = paymentStatus;
    }
    
    setFilters(newFilters);
    setPage(1);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setCampaignSearch('');
    setCreatorId('');
    setDonorSearch('');
    setFromDate('');
    setToDate('');
    setPaymentStatus('');
    setFilters({ page: 1, limit: 20 });
    setPage(1);
    setShowFilters(false);
  };

  const formatCurrency = (amount: number, currency: string = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency === 'VND' ? 'VND' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: { label: 'Hoàn thành', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Đang xử lý', className: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Thất bại', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Đã hủy', className: 'bg-gray-100 text-gray-800' },
      refunded: { label: 'Đã hoàn', className: 'bg-blue-100 text-blue-800' },
      partially_refunded: { label: 'Hoàn một phần', className: 'bg-purple-100 text-purple-800' },
    };
    
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      bank_transfer: 'Chuyển khoản',
      cash: 'Tiền mặt',
      sepay: 'SePay',
      CARD: 'Thẻ (SePay)',
      BANK_TRANSFER: 'Chuyển khoản (SePay)',
      NAPAS_BANK_TRANSFER: 'NAPAS (SePay)',
    };
    return methodMap[method] || method;
  };

  if (loading && donations.length === 0) {
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

  const hasActiveFilters = campaignSearch || creatorId || donorSearch || fromDate || toDate || paymentStatus;

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Bảng Quản Lý Quyên Góp
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Xem và quản lý toàn bộ quyên góp trong hệ thống
            </p>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                  <Filter className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                  <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
                  <p className="text-sm text-gray-500">
                    {hasActiveFilters ? 'Có bộ lọc đang áp dụng' : 'Lọc quyên góp theo điều kiện'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                {/* Campaign Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tìm Chiến Dịch (Tiêu đề / ID)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Nhập tiêu đề hoặc ID chiến dịch"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Creator ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Người Tạo
                  </label>
                  <input
                    type="text"
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                    placeholder="Nhập ID người tạo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Donor Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tìm Người Quyên Góp (ID / Tên đăng nhập / Email)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={donorSearch}
                      onChange={(e) => setDonorSearch(e.target.value)}
                      placeholder="Nhập ID người dùng, tên đăng nhập hoặc email"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* From Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Từ ngày
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
            </div>
          </div>

                {/* To Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đến ngày
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Tất cả</option>
                    <option value="pending">Đang xử lý</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="failed">Thất bại</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="refunded">Đã hoàn</option>
                    <option value="partially_refunded">Hoàn một phần</option>
                  </select>
                </div>
              </div>
            )}

            {showFilters && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Áp dụng bộ lọc
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Xóa bộ lọc
                  </button>
                )}
            </div>
          )}

            {hasActiveFilters && !showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>
                  {campaignSearch && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Chiến dịch: {campaignSearch}
                    </span>
                  )}
                  {creatorId && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Người tạo: {creatorId}
                    </span>
                  )}
                  {donorSearch && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Người quyên góp: {donorSearch}
                    </span>
                  )}
                  {fromDate && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Từ: {fromDate}
                    </span>
                  )}
                  {toDate && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Đến: {toDate}
                    </span>
                  )}
                  {paymentStatus && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Trạng thái: {paymentStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 sm:p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-purple-100">Tổng số quyên góp</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{total}</h2>
              </div>
            </div>
          </div>

          {/* Donations Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ID Quyên Góp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider max-w-[200px]">
                      Chiến Dịch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Người Tạo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Người Quyên Góp
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Không có quyên góp nào
                      </td>
                    </tr>
                  ) : (
                    donations.map((donation) => (
                      <tr key={donation._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                          {donation._id?.substring(0, 8) || 'N/A'}...
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px]">
                          <div className="min-w-0">
                            <div className="font-medium truncate" title={donation.campaign?.title || 'Chiến dịch đã bị xóa'}>
                              {donation.campaign?.title || 'Chiến dịch đã bị xóa'}
                            </div>
                            <div className="text-xs text-gray-500 font-mono truncate">
                              {donation.campaign?._id?.substring(0, 8) || 'N/A'}...
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{donation.campaign?.creator?.username || 'Người dùng đã bị xóa'}</div>
                            <div className="text-xs text-gray-500">{donation.campaign?.creator?.email || 'N/A'}</div>
                </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{donation.donor?.username || 'Người dùng đã bị xóa'}</div>
                            <div className="text-xs text-gray-500">
                              {donation.donor?.email || 'N/A'}
          </div>
                            <div className="text-xs text-gray-400 font-mono mt-1">
                              {donation.donor?._id?.substring(0, 8) || 'N/A'}...
                </div>
              </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(donation.amount, donation.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(donation.payment_status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(donation.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => {
                              setSelectedDonation(donation);
                              setShowDetailModal(true);
                            }}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1.5 mx-auto"
                          >
                            <Eye className="w-4 h-4" />
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{(page - 1) * limit + 1}</span> đến{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> trong tổng số{' '}
                  <span className="font-medium">{total}</span> quyên góp
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className={`px-3 py-2 rounded-lg border ${
                      page === 1
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-sm text-gray-700">
                    Trang <span className="font-medium">{page}</span> / <span className="font-medium">{pages}</span>
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pages}
                    className={`px-3 py-2 rounded-lg border ${
                      page >= pages
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Donation Detail Modal */}
          {showDetailModal && selectedDonation && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="text-xl font-bold text-gray-900">Chi tiết Quyên Góp</h2>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedDonation(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Donation ID */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">ID Quyên Góp</div>
                    <div className="text-base font-mono text-gray-900">{selectedDonation._id}</div>
                  </div>

                  {/* Campaign Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Thông tin Chiến Dịch</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Tiêu đề</div>
                        <div className="text-base text-gray-900">{selectedDonation.campaign?.title || 'Chiến dịch đã bị xóa'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">ID Chiến Dịch</div>
                        <div className="text-sm font-mono text-gray-700">{selectedDonation.campaign?._id || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Người Tạo</div>
                        <div className="text-base text-gray-900">{selectedDonation.campaign?.creator?.username || 'Người dùng đã bị xóa'}</div>
                        <div className="text-sm text-gray-600">{selectedDonation.campaign?.creator?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Donor Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Thông tin Người Quyên Góp</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Tên đăng nhập</div>
                        <div className="text-base text-gray-900">{selectedDonation.donor?.username || 'Người dùng đã bị xóa'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Email</div>
                        <div className="text-base text-gray-900">{selectedDonation.donor?.email || 'N/A'}</div>
                      </div>
                      {selectedDonation.donor?.fullname && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Họ tên</div>
                          <div className="text-base text-gray-900">{selectedDonation.donor.fullname}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-500">ID Người Quyên Góp</div>
                        <div className="text-sm font-mono text-gray-700">{selectedDonation.donor?._id || 'N/A'}</div>
                      </div>
                      {selectedDonation.is_anonymous && (
                        <div className="mt-2">
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                            Quyên góp ẩn danh
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Thông tin Thanh toán</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500">Số tiền</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(selectedDonation.amount, selectedDonation.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Trạng thái</div>
                          <div className="mt-1">{getStatusBadge(selectedDonation.payment_status)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Phương thức thanh toán</div>
                        <div className="text-base text-gray-900">{getPaymentMethodLabel(selectedDonation.payment_method)}</div>
                      </div>
                      {selectedDonation.order_invoice_number && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Mã hóa đơn</div>
                          <div className="text-sm font-mono text-gray-700">{selectedDonation.order_invoice_number}</div>
                        </div>
                      )}
                      {selectedDonation.sepay_transaction_id && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">ID Giao dịch SePay</div>
                          <div className="text-sm font-mono text-gray-700">{selectedDonation.sepay_transaction_id}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <div>
                          <div className="text-sm font-medium text-gray-500">Thời gian tạo</div>
                          <div className="text-sm text-gray-700">{formatDate(selectedDonation.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Cập nhật lần cuối</div>
                          <div className="text-sm text-gray-700">{formatDate(selectedDonation.updatedAt)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Proof Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-purple-600" />
                      Minh chứng Chuyển khoản
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500">Có minh chứng</div>
                          <div className="mt-1">
                            {selectedDonation.has_proof ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                Có
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                                Không
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Trạng thái minh chứng</div>
                          <div className="mt-1">
                            {selectedDonation.proof_status === 'uploaded' && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                Đã tải lên
                              </span>
                            )}
                            {selectedDonation.proof_status === 'pending' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                Đang chờ
                              </span>
                            )}
                            {(!selectedDonation.proof_status || selectedDonation.proof_status === 'missing') && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                                Chưa có
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedDonation.proof_uploaded_at && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Thời gian tải lên</div>
                          <div className="text-sm text-gray-700">{formatDate(selectedDonation.proof_uploaded_at)}</div>
                        </div>
                      )}
                      {selectedDonation.proof_images && selectedDonation.proof_images.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-2">
                            Ảnh minh chứng ({selectedDonation.proof_images.length} ảnh)
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedDonation.proof_images.map((imageUrl, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={imageUrl}
                                  alt={`Proof image ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  Ảnh {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!selectedDonation.proof_images || selectedDonation.proof_images.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>Chưa có ảnh minh chứng</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedDonation.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Ghi chú
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-base text-gray-900 whitespace-pre-wrap">{selectedDonation.notes}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedDonation(null);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </OwnerContentWrapper>
    </div>
  );
}

export default function OwnerDonationDashboard() {
  return (
    <Suspense fallback={
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
    }>
      <OwnerDonationDashboardContent />
    </Suspense>
  );
}