'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService } from '@/services/owner.service';
import { Escrow, Campaign, User } from '@/services/escrow.service';
import { formatCurrencyVND, formatDateTime, formatWithdrawalStatus } from '@/utils/escrow.utils';
import Swal from 'sweetalert2';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  MoreVertical,
  Search,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function OwnerWithdrawalRequests() {
  const searchParams = useSearchParams();
  const [withdrawalRequests, setWithdrawalRequests] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Escrow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper functions to safely access nested properties
  const getCampaignTitle = (campaign: string | Campaign | undefined): string => {
    if (!campaign) return 'N/A';
    return typeof campaign === 'string' ? campaign : campaign.title || 'N/A';
  };

  const getUserName = (user: string | User | undefined | null): string => {
    if (!user) return 'N/A';
    if (typeof user === 'string') return user;
    return user.fullname || user.username || 'N/A';
  };

  const getUserEmail = (user: string | User | undefined | null): string => {
    if (!user) return '';
    if (typeof user === 'string') return '';
    return user.email || '';
  };

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'Thanh toán thành công!',
        text: 'Yêu cầu rút tiền đã được chuyển trạng thái thành released.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      fetchWithdrawalRequests();
    } else if (payment === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'Thanh toán thất bại',
        text: 'Có lỗi xảy ra trong quá trình thanh toán.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } else if (payment === 'cancelled') {
      Swal.fire({
        icon: 'info',
        title: 'Thanh toán đã hủy',
        text: 'Bạn đã hủy quá trình thanh toán.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    }
  }, [searchParams]);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getAdminApprovedWithdrawalRequests();
      setWithdrawalRequests(data.escrows || []);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.message || 'Không thể tải danh sách yêu cầu rút tiền',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (escrow: Escrow) => {
    setOpenMenuId(null);
    setSelectedRequest(escrow);
    setShowDetailsModal(true);
  };

  const handleProcessPayment = async (escrow: Escrow) => {
    setOpenMenuId(null);

    const campaignTitle =
      typeof escrow.campaign === 'string' ? escrow.campaign : escrow.campaign?.title;

    const requesterName =
      typeof escrow.requested_by === 'string'
        ? escrow.requested_by
        : escrow.requested_by?.fullname || escrow.requested_by?.username;

    const result = await Swal.fire({
      title: 'Xác nhận chuyển khoản',
      html: `
        <div class="text-left">
          <p class="mb-2">Bạn sẽ chuyển khoản số tiền:</p>
          <p class="text-2xl font-bold text-green-600 mb-4">${formatCurrencyVND(escrow.withdrawal_request_amount)}</p>
          <p class="text-sm text-gray-600 mb-2">Campaign: <strong>${campaignTitle || 'N/A'}</strong></p>
          <p class="text-sm text-gray-600">Người yêu cầu: <strong>${requesterName || 'N/A'}</strong></p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Xác nhận và chuyển đến SePay',
      cancelButtonText: 'Hủy',
    });

    if (result.isConfirmed) {
      try {
        setIsProcessing(true);
        const paymentData = await ownerService.initSepayWithdrawalPayment(escrow._id, 'BANK_TRANSFER');

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentData.checkoutUrl;

        Object.entries(paymentData.formFields).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Không thể khởi tạo thanh toán';
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });
        setIsProcessing(false);
      }
    }
  };

  const filteredRequests = withdrawalRequests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    const campaignTitle = typeof request.campaign === 'string' 
      ? request.campaign 
      : request.campaign?.title;
    
    const requesterName = typeof request.requested_by === 'string'
      ? request.requested_by
      : request.requested_by?.fullname || request.requested_by?.username;
    
    const requesterUsername = typeof request.requested_by === 'string'
      ? request.requested_by
      : request.requested_by?.username;
    
    return (
      campaignTitle?.toLowerCase().includes(query) ||
      requesterName?.toLowerCase().includes(query) ||
      requesterUsername?.toLowerCase().includes(query) ||
      request.request_reason?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <OwnerSidebar />
        <OwnerHeader />
        <OwnerContentWrapper>
          <div className="p-4 sm:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang tải...</p>
            </div>
          </div>
        </OwnerContentWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <OwnerSidebar />
      <OwnerHeader />
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Yêu cầu rút tiền đã duyệt</h1>
              <p className="text-sm sm:text-base text-gray-600">Xem và xử lý các yêu cầu rút tiền đã được admin duyệt</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo campaign, người yêu cầu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Không có yêu cầu rút tiền nào</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredRequests.map((request) => (
                    <div
                      key={request._id}
                      className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-0">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 sm:gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                                {getCampaignTitle(request.campaign)}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-500">
                                Yêu cầu bởi: {getUserName(request.requested_by)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Số tiền</p>
                              <p className="text-base sm:text-lg font-bold text-green-600">
                                {formatCurrencyVND(request.withdrawal_request_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {formatWithdrawalStatus(request.request_status)}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Ngày tạo</p>
                              <p className="text-xs sm:text-sm font-medium text-gray-900">
                                {formatDateTime(request.createdAt)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Admin duyệt</p>
                              <p className="text-xs sm:text-sm font-medium text-gray-900">
                                {getUserName(request.admin_reviewed_by)}
                              </p>
                            </div>
                          </div>

                          {request.request_reason && (
                            <div className="mb-3 sm:mb-4">
                              <p className="text-xs text-gray-500 mb-1">Lý do yêu cầu</p>
                              <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 sm:p-3 rounded-lg">
                                {request.request_reason}
                              </p>
                            </div>
                          )}

                          {request.votingResults && (
                            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-2">Kết quả voting</p>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                <span className="text-green-600">
                                  ✓ Approve: {request.votingResults.approveCount} ({request.votingResults.approvePercentage}
                                  %)
                                </span>
                                <span className="text-red-600">
                                  ✗ Reject: {request.votingResults.rejectCount} ({request.votingResults.rejectPercentage}
                                  %)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-4">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex-1 sm:flex-none"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => handleProcessPayment(request)}
                            disabled={isProcessing || request.request_status !== 'admin_approved'}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-1 sm:flex-none justify-center"
                          >
                            <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Chuyển khoản</span>
                            <span className="sm:hidden">Chuyển</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </OwnerContentWrapper>

      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Chi tiết yêu cầu rút tiền</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Campaign</h3>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{getCampaignTitle(selectedRequest.campaign)}</p>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Người yêu cầu</h3>
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {getUserName(selectedRequest.requested_by)}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">{getUserEmail(selectedRequest.requested_by)}</p>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Số tiền yêu cầu</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrencyVND(selectedRequest.withdrawal_request_amount)}
                </p>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Lý do yêu cầu</h3>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-3 sm:p-4 rounded-lg">
                  {selectedRequest.request_reason || 'Không có'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Trạng thái</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  {formatWithdrawalStatus(selectedRequest.request_status)}
                </span>
              </div>

              {selectedRequest.votingResults && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Kết quả voting</h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tổng số vote:</span>
                      <span className="font-semibold">{selectedRequest.votingResults.totalVotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Approve:</span>
                      <span className="font-semibold text-green-600">
                        {selectedRequest.votingResults.approveCount} ({selectedRequest.votingResults.approvePercentage}
                        %)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Reject:</span>
                      <span className="font-semibold text-red-600">
                        {selectedRequest.votingResults.rejectCount} ({selectedRequest.votingResults.rejectPercentage}
                        %)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Ngày tạo</h3>
                  <p className="text-gray-900">{formatDateTime(selectedRequest.createdAt)}</p>
                </div>
                {selectedRequest.admin_reviewed_at && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Ngày admin duyệt</h3>
                    <p className="text-gray-900">{formatDateTime(selectedRequest.admin_reviewed_at)}</p>
                  </div>
                )}
              </div>

              {selectedRequest.admin_reviewed_by && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Admin đã duyệt</h3>
                  <p className="text-gray-900">
                    {getUserName(selectedRequest.admin_reviewed_by)}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Đóng
              </button>
              {selectedRequest.request_status === 'admin_approved' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleProcessPayment(selectedRequest);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Chuyển khoản
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

