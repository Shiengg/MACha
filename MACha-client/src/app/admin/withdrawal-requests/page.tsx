'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  getWithdrawalRequestsForReview,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
} from '@/services/admin/escrow.service';
import { Escrow, WithdrawalRequestStatus, Campaign, User } from '@/services/escrow.service';
import { formatEscrowError, formatWithdrawalStatus, getStatusColor, formatCurrencyVND, formatDateTime } from '@/utils/escrow.utils';
import Swal from 'sweetalert2';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function AdminWithdrawalRequests() {
  const [withdrawalRequests, setWithdrawalRequests] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Escrow | null>(null);
  const [statusFilter, setStatusFilter] = useState<WithdrawalRequestStatus>('voting_completed');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawalRequests();
  }, [statusFilter]);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const data = await getWithdrawalRequestsForReview(statusFilter);
      setWithdrawalRequests(data);
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
    setSelectedRequest(escrow);
    setShowDetailsModal(true);
  };

  const handleApprove = async (escrowId: string) => {
    const result = await Swal.fire({
      title: 'Duyệt yêu cầu rút tiền?',
      html: `
        <p style="margin-bottom: 20px;">Yêu cầu sẽ được đánh dấu là đã duyệt. Owner sẽ cần xem và release tiền sau đó.</p>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: flex; align-items: center; cursor: pointer; color: #374151;">
            <input type="checkbox" id="terms-checkbox" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
            <span>Tôi cam kết chịu trách nhiệm với quyết định của mình</span>
          </label>
        </div>
        <div style="text-align: center; margin-top: 10px;">
          <a href="/terms" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 14px;">
            Xem điều khoản cam kết
          </a>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Duyệt',
      cancelButtonText: 'Hủy',
      didOpen: () => {
        const checkbox = document.getElementById('terms-checkbox') as HTMLInputElement;
        const confirmButton = Swal.getConfirmButton();
        
        // Disable button ban đầu
        if (confirmButton) {
          confirmButton.disabled = true;
          confirmButton.style.opacity = '0.5';
          confirmButton.style.cursor = 'not-allowed';
        }
        
        // Add event listener cho checkbox
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            const confirmButton = Swal.getConfirmButton();
            if (confirmButton) {
              if (checkbox.checked) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
              } else {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
              }
            }
          });
        }
      },
      preConfirm: () => {
        const checkbox = document.getElementById('terms-checkbox') as HTMLInputElement;
        if (!checkbox || !checkbox.checked) {
          return false;
        }
        return true;
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });

    if (result.isConfirmed) {
      try {
        setIsProcessing(true);
        await approveWithdrawalRequest(escrowId);
        
        // Success toast
        await Swal.fire({
          icon: 'success',
          title: 'Đã duyệt!',
          text: 'Yêu cầu rút tiền đã được duyệt. Chờ owner xem và release tiền.',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        
        fetchWithdrawalRequests();
        setShowDetailsModal(false);
        setSelectedRequest(null);
      } catch (error: any) {
        const errorMessage = formatEscrowError(error);
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async (escrowId: string) => {
    const { value: reason } = await Swal.fire({
      title: 'Từ chối yêu cầu rút tiền',
      input: 'textarea',
      inputLabel: 'Lý do từ chối',
      inputPlaceholder: 'Nhập lý do từ chối...',
      inputAttributes: {
        'aria-label': 'Nhập lý do từ chối',
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Từ chối',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => {
        if (!value || value.trim().length < 10) {
          return 'Bạn cần nhập lý do từ chối (ít nhất 10 ký tự)!';
        }
      },
    });

    if (reason) {
      try {
        setIsProcessing(true);
        await rejectWithdrawalRequest(escrowId, reason);
        
        // Success toast
        await Swal.fire({
          icon: 'success',
          title: 'Đã từ chối!',
          text: 'Yêu cầu rút tiền đã bị từ chối',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        
        fetchWithdrawalRequests();
        setShowDetailsModal(false);
        setSelectedRequest(null);
      } catch (error: any) {
        const errorMessage = formatEscrowError(error);
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchWithdrawalRequests();
  };

  const getStatusBadge = (status: WithdrawalRequestStatus) => {
    const colors = getStatusColor(status);
    const label = formatWithdrawalStatus(status);
    return (
      <span className={`px-3 py-1 ${colors.bg} ${colors.text} rounded-full text-sm font-medium`}>
        {label}
      </span>
    );
  };

  const getCampaignTitle = (campaign: string | Campaign): string => {
    if (typeof campaign === 'string') return 'N/A';
    return campaign.title || 'N/A';
  };

  const getCreatorInfo = (requestedBy: string | User): string => {
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy.fullname || requestedBy.username || 'N/A';
  };

  const getCreatorEmail = (requestedBy: string | User): string => {
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy.email || 'N/A';
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <AdminSidebar />
      <AdminHeader />

      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Quản lý yêu cầu rút tiền</h1>
                <p className="text-gray-400">Xem xét và phê duyệt các yêu cầu rút tiền từ campaign creators.</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>
          </div>

          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as WithdrawalRequestStatus)}
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="voting_completed">Đã hoàn thành vote</option>
                    <option value="admin_approved">Admin đã duyệt</option>
                    <option value="admin_rejected">Admin từ chối</option>
                    <option value="released">Đã giải ngân</option>
                  </select>
                  <svg
                    className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
              ) : withdrawalRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Không có yêu cầu rút tiền nào</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">CAMPAIGN</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">NGƯỜI YÊU CẦU</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">SỐ TIỀN</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">KẾT QUẢ VOTE</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">TRẠNG THÁI</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">NGÀY YÊU CẦU</th>
                      <th className="px-6 py-4 text-left text-gray-400 font-medium text-sm">HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((request) => (
                      <tr key={request._id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{getCampaignTitle(request.campaign)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{getCreatorInfo(request.requested_by)}</div>
                          <div className="text-gray-400 text-sm">{getCreatorEmail(request.requested_by)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-semibold">{formatCurrencyVND(request.withdrawal_request_amount)}</div>
                        </td>
                        <td className="px-6 py-4">
                          {request.votingResults && request.votingResults.totalVotes > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span className="text-green-400 font-medium">{request.votingResults.approvePercentage}%</span>
                                <span className="text-gray-400">({request.votingResults.approveCount} phiếu)</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                <span className="text-red-400 font-medium">{request.votingResults.rejectPercentage}%</span>
                                <span className="text-gray-400">({request.votingResults.rejectCount} phiếu)</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Chưa có vote</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(request.request_status)}</td>
                        <td className="px-6 py-4">
                          <div className="text-gray-400 text-sm">{formatDateTime(request.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(request)}
                              className="p-2 text-blue-500 hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {request.request_status === 'voting_completed' && (
                              <>
                                <button
                                  onClick={() => handleApprove(request._id)}
                                  disabled={isProcessing}
                                  className="p-2 text-green-500 hover:bg-green-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Duyệt"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleReject(request._id)}
                                  disabled={isProcessing}
                                  className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Từ chối"
                                >
                                  <XCircle className="w-5 h-5" />
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
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-[#1a1f2e] z-10">
              <h2 className="text-2xl font-bold text-white">Chi tiết yêu cầu rút tiền</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="text-gray-400 hover:text-white transition-all"
                disabled={isProcessing}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Thông tin Campaign
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg">
                  <div>
                    <p className="text-gray-400 text-sm">Tên Campaign</p>
                    <p className="text-white font-medium">
                      {typeof selectedRequest.campaign === 'object'
                        ? selectedRequest.campaign.title
                        : 'N/A'}
                    </p>
                  </div>
                  {typeof selectedRequest.campaign === 'object' && (
                    <>
                      <div>
                        <p className="text-gray-400 text-sm">Mục tiêu</p>
                        <p className="text-white font-medium">{formatCurrencyVND(selectedRequest.campaign.goal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Số tiền hiện tại</p>
                        <p className="text-white font-medium">{formatCurrencyVND(selectedRequest.campaign.current_amount)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Creator Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Thông tin người yêu cầu
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg">
                  <div>
                    <p className="text-gray-400 text-sm">Họ tên</p>
                    <p className="text-white font-medium">{getCreatorInfo(selectedRequest.requested_by)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Username</p>
                    <p className="text-white font-medium">
                      {typeof selectedRequest.requested_by === 'object'
                        ? selectedRequest.requested_by.username
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white font-medium">{getCreatorEmail(selectedRequest.requested_by)}</p>
                  </div>
                </div>
              </div>

              {/* Request Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Thông tin yêu cầu
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg">
                  <div>
                    <p className="text-gray-400 text-sm">Số tiền yêu cầu</p>
                    <p className="text-white font-semibold text-lg">{formatCurrencyVND(selectedRequest.withdrawal_request_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Trạng thái</p>
                    <div className="mt-1">{getStatusBadge(selectedRequest.request_status)}</div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Ngày tạo</p>
                    <p className="text-white font-medium">{formatDateTime(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Ngày cập nhật</p>
                    <p className="text-white font-medium">{formatDateTime(selectedRequest.updatedAt)}</p>
                  </div>
                  {selectedRequest.request_reason && (
                    <div className="col-span-2">
                      <p className="text-gray-400 text-sm mb-2">Lý do yêu cầu</p>
                      <p className="text-white whitespace-pre-wrap bg-gray-900/50 p-3 rounded-lg">
                        {selectedRequest.request_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Voting Period */}
              {(selectedRequest.voting_start_date || selectedRequest.voting_end_date) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Thời gian vote
                  </h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg space-y-2">
                    {selectedRequest.voting_start_date && (
                      <div>
                        <p className="text-gray-400 text-sm">Bắt đầu</p>
                        <p className="text-white font-medium">{formatDateTime(selectedRequest.voting_start_date)}</p>
                      </div>
                    )}
                    {selectedRequest.voting_end_date && (
                      <div>
                        <p className="text-gray-400 text-sm">Kết thúc</p>
                        <p className="text-white font-medium">{formatDateTime(selectedRequest.voting_end_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Voting Results */}
              {selectedRequest.votingResults && selectedRequest.votingResults.totalVotes > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Kết quả vote
                  </h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Approve */}
                      <div className="bg-green-900/30 rounded-lg p-4 border border-green-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          <span className="text-green-400 font-semibold">Đồng ý</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400 mb-1">
                          {selectedRequest.votingResults.approvePercentage}%
                        </div>
                        <div className="text-sm text-gray-400">
                          {selectedRequest.votingResults.approveCount} phiếu
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Tổng trọng số: {formatCurrencyVND(selectedRequest.votingResults.totalApproveWeight)}
                        </div>
                      </div>

                      {/* Reject */}
                      <div className="bg-red-900/30 rounded-lg p-4 border border-red-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-5 h-5 text-red-500" />
                          <span className="text-red-400 font-semibold">Từ chối</span>
                        </div>
                        <div className="text-2xl font-bold text-red-400 mb-1">
                          {selectedRequest.votingResults.rejectPercentage}%
                        </div>
                        <div className="text-sm text-gray-400">
                          {selectedRequest.votingResults.rejectCount} phiếu
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Tổng trọng số: {formatCurrencyVND(selectedRequest.votingResults.totalRejectWeight)}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-400 pt-2 border-t border-gray-700">
                      Tổng: {selectedRequest.votingResults.totalVotes} phiếu bầu
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Review Info */}
              {selectedRequest.admin_reviewed_at && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Thông tin admin review
                  </h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg space-y-2">
                    <div>
                      <p className="text-gray-400 text-sm">Ngày review</p>
                      <p className="text-white font-medium">{formatDateTime(selectedRequest.admin_reviewed_at)}</p>
                    </div>
                    {selectedRequest.admin_rejection_reason && (
                      <div>
                        <p className="text-gray-400 text-sm">Lý do từ chối</p>
                        <p className="text-red-400 mt-1 bg-red-900/20 p-3 rounded-lg">
                          {selectedRequest.admin_rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedRequest.request_status === 'voting_completed' && (
                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleApprove(selectedRequest._id)}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Duyệt yêu cầu
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest._id)}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

