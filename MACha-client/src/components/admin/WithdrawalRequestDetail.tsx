'use client';

import React, { useState, useEffect } from 'react';
import { Escrow, Vote } from '@/services/escrow.service';
import { escrowService } from '@/services/escrow.service';
import EscrowProgressBar from '@/components/escrow/EscrowProgressBar';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Mail,
} from 'lucide-react';

interface WithdrawalRequestDetailProps {
  escrow: Escrow;
  onApprove: (escrowId: string) => void;
  onReject: (escrowId: string, reason: string) => void;
}

export default function WithdrawalRequestDetail({
  escrow,
  onApprove,
  onReject,
}: WithdrawalRequestDetailProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [showVoteBreakdown, setShowVoteBreakdown] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchVotes();
  }, [escrow._id]);

  const fetchVotes = async () => {
    try {
      setLoadingVotes(true);
      const votesData = await escrowService.getVotesByEscrow(escrow._id);
      setVotes(votesData);
    } catch (error) {
      console.error('Error fetching votes:', error);
    } finally {
      setLoadingVotes(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCampaignTitle = (campaign: string | any): string => {
    if (typeof campaign === 'string') return 'N/A';
    return campaign?.title || 'N/A';
  };

  const getCreatorInfo = (requestedBy: string | any): string => {
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy?.fullname || requestedBy?.username || 'N/A';
  };

  const getCreatorEmail = (requestedBy: string | any): string => {
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy?.email || 'N/A';
  };

  const getCreatorUsername = (requestedBy: string | any): string => {
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy?.username || 'N/A';
  };

  const getStatusTimeline = () => {
    const timeline = [];

    if (escrow.createdAt) {
      timeline.push({
        label: 'Yêu cầu được tạo',
        date: escrow.createdAt,
        status: 'created',
      });
    }

    if (escrow.voting_start_date) {
      timeline.push({
        label: 'Bắt đầu vote',
        date: escrow.voting_start_date,
        status: 'voting_started',
      });
    }

    if (escrow.voting_end_date && escrow.request_status !== 'voting_in_progress' && escrow.request_status !== 'pending_voting') {
      timeline.push({
        label: 'Kết thúc vote',
        date: escrow.voting_end_date,
        status: 'voting_ended',
      });
    }

    if (escrow.admin_reviewed_at) {
      timeline.push({
        label: escrow.request_status === 'admin_approved' ? 'Admin đã duyệt' : 'Admin đã từ chối',
        date: escrow.admin_reviewed_at,
        status: escrow.request_status === 'admin_approved' ? 'approved' : 'rejected',
      });
    }

    if (escrow.released_at) {
      timeline.push({
        label: 'Đã giải ngân',
        date: escrow.released_at,
        status: 'released',
      });
    }

    return timeline;
  };

  const handleRejectClick = () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      alert('Vui lòng nhập lý do từ chối (ít nhất 10 ký tự)');
      return;
    }
    onReject(escrow._id, rejectionReason.trim());
  };

  const approveVotes = votes.filter((v) => v.value === 'approve');
  const rejectVotes = votes.filter((v) => v.value === 'reject');

  return (
    <div className="space-y-6">
      {/* Campaign Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Thông tin Campaign
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tên Campaign</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {getCampaignTitle(escrow.campaign)}
            </p>
          </div>
          {typeof escrow.campaign === 'object' && escrow.campaign && (
            <>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mục tiêu</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatAmount(escrow.campaign.goal_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số tiền hiện tại</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatAmount(escrow.campaign.current_amount)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Creator Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Thông tin người yêu cầu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Họ tên</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {getCreatorInfo(escrow.requested_by)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Username</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {getCreatorUsername(escrow.requested_by)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {getCreatorEmail(escrow.requested_by)}
            </p>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Chi tiết yêu cầu
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số tiền yêu cầu</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatAmount(escrow.withdrawal_request_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ngày tạo yêu cầu</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(escrow.createdAt)}
              </p>
            </div>
          </div>
          {escrow.request_reason && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Lý do yêu cầu</p>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {escrow.request_reason}
                </p>
              </div>
            </div>
          )}
          {escrow.auto_created && escrow.milestone_percentage && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                ⚡ Yêu cầu được tạo tự động khi campaign đạt {escrow.milestone_percentage}% mục tiêu
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {escrow.escrow_progress && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tiến trình giải ngân
          </h3>
          <EscrowProgressBar progress={escrow.escrow_progress} showLabels={true} compact={false} />
        </div>
      )}

      {/* Status Timeline (Fallback nếu không có progress) */}
      {!escrow.escrow_progress && getStatusTimeline().length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lịch sử trạng thái
          </h3>
          <div className="space-y-4">
            {getStatusTimeline().map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div
                  className={`w-3 h-3 rounded-full mt-2 ${
                    item.status === 'created'
                      ? 'bg-blue-500'
                      : item.status === 'voting_started'
                      ? 'bg-purple-500'
                      : item.status === 'voting_ended'
                      ? 'bg-indigo-500'
                      : item.status === 'approved'
                      ? 'bg-green-500'
                      : item.status === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voting Results */}
      {escrow.votingResults && escrow.votingResults.totalVotes > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Kết quả vote
          </h3>
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Approve */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Đồng ý</span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {escrow.votingResults.approvePercentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {escrow.votingResults.approveCount} phiếu
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Tổng trọng số: {formatAmount(escrow.votingResults.totalApproveWeight)}
                </div>
              </div>

              {/* Reject */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-700 dark:text-red-400">Từ chối</span>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {escrow.votingResults.rejectPercentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {escrow.votingResults.rejectCount} phiếu
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Tổng trọng số: {formatAmount(escrow.votingResults.totalRejectWeight)}
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              Tổng: {escrow.votingResults.totalVotes} phiếu bầu
            </div>

            {/* Vote Breakdown Toggle */}
            {votes.length > 0 && (
              <div>
                <button
                  onClick={() => setShowVoteBreakdown(!showVoteBreakdown)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-all"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    Chi tiết từng phiếu bầu ({votes.length} phiếu)
                  </span>
                  {showVoteBreakdown ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {showVoteBreakdown && (
                  <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {loadingVotes ? (
                      <div className="text-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : (
                      <>
                        {approveVotes.map((vote) => {
                          const donor = typeof vote.donor === 'object' ? vote.donor : null;
                          return (
                            <div
                              key={vote._id}
                              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                            >
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {donor?.fullname || donor?.username || 'Người dùng ẩn danh'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(vote.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600 dark:text-green-400">
                                  {formatAmount(vote.vote_weight)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Trọng số</p>
                              </div>
                            </div>
                          );
                        })}
                        {rejectVotes.map((vote) => {
                          const donor = typeof vote.donor === 'object' ? vote.donor : null;
                          return (
                            <div
                              key={vote._id}
                              className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                            >
                              <div className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {donor?.fullname || donor?.username || 'Người dùng ẩn danh'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(vote.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-red-600 dark:text-red-400">
                                  {formatAmount(vote.vote_weight)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Trọng số</p>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Review History */}
      {escrow.admin_reviewed_at && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Lịch sử Admin Review
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ngày review</p>
              <p className="text-gray-900 dark:text-white">{formatDate(escrow.admin_reviewed_at)}</p>
            </div>
            {typeof escrow.admin_reviewed_by === 'object' && escrow.admin_reviewed_by && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Người review</p>
                <p className="text-gray-900 dark:text-white">
                  {escrow.admin_reviewed_by.fullname || escrow.admin_reviewed_by.username}
                </p>
              </div>
            )}
            {escrow.admin_rejection_reason && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Lý do từ chối</p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <p className="text-red-700 dark:text-red-300">{escrow.admin_rejection_reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Section */}
      {escrow.request_status === 'voting_completed' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hành động</h3>
          <div className="space-y-4">
            <button
              onClick={() => onApprove(escrow._id)}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Duyệt yêu cầu
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lý do từ chối (tối thiểu 10 ký tự)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleRejectClick}
                disabled={!rejectionReason.trim() || rejectionReason.trim().length < 10}
                className="w-full mt-3 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Từ chối yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

