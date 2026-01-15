'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, DollarSign, Calendar, Users, TrendingUp, TrendingDown, Image as ImageIcon, FileText } from 'lucide-react';
import { Escrow, Vote, WithdrawalRequestStatus } from '@/services/escrow.service';
import EscrowProgressBar from './EscrowProgressBar';
import Image from 'next/image';

interface WithdrawalRequestCardProps {
  escrow: Escrow;
  userVote?: Vote | null; // Chỉ để hiển thị, không dùng để vote
  isCreator?: boolean;
  onCancel?: (escrowId: string) => void;
}

export default function WithdrawalRequestCard({
  escrow,
  userVote,
  isCreator = false,
  onCancel,
}: WithdrawalRequestCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining for voting period
  useEffect(() => {
    if (!escrow.voting_end_date || escrow.request_status !== 'voting_in_progress') {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const endDate = new Date(escrow.voting_end_date!).getTime();
      const difference = endDate - now;

      if (difference <= 0) {
        setTimeRemaining('Đã kết thúc');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`Còn ${days} ngày ${hours} giờ`);
      } else if (hours > 0) {
        setTimeRemaining(`Còn ${hours} giờ ${minutes} phút`);
      } else {
        setTimeRemaining(`Còn ${minutes} phút`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [escrow.voting_end_date, escrow.request_status]);

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

  const getStatusBadge = () => {
    const statusConfig: Record<WithdrawalRequestStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      pending_voting: {
        label: 'Chờ vote',
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: <AlertCircle className="w-4 h-4" />,
      },
      voting_in_progress: {
        label: 'Đang vote',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        icon: <Clock className="w-4 h-4" />,
      },
      voting_completed: {
        label: 'Đã hoàn thành vote',
        color: 'text-purple-700 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        icon: <CheckCircle2 className="w-4 h-4" />,
      },
      voting_extended: {
        label: 'Đã gia hạn vote',
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: <Clock className="w-4 h-4" />,
      },
      rejected_by_community: {
        label: 'Cộng đồng từ chối',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: <XCircle className="w-4 h-4" />,
      },
      admin_approved: {
        label: 'Admin đã duyệt',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: <CheckCircle2 className="w-4 h-4" />,
      },
      admin_rejected: {
        label: 'Admin từ chối',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: <XCircle className="w-4 h-4" />,
      },
      released: {
        label: 'Đã giải ngân',
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        icon: <DollarSign className="w-4 h-4" />,
      },
      cancelled: {
        label: 'Đã hủy',
        color: 'text-gray-700 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        icon: <XCircle className="w-4 h-4" />,
      },
    };

    const config = statusConfig[escrow.request_status];

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.color} border border-current/20`}>
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  };

  const canCancel = isCreator && 
    (escrow.request_status === 'pending_voting' || escrow.request_status === 'voting_in_progress');

  // Không hiển thị nút vote ở đây nữa, chỉ hiển thị ở VotingSection
  // const canVote = isEligibleToVote && escrow.request_status === 'voting_in_progress';

  const handleCancel = () => {
    if (onCancel && confirm('Bạn có chắc chắn muốn hủy yêu cầu rút tiền này?')) {
      onCancel(escrow._id);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Yêu cầu rút tiền
              </h3>
              {escrow.auto_created && escrow.milestone_percentage && (
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                  Tự động ({escrow.milestone_percentage}%)
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatAmount(escrow.withdrawal_request_amount)}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Progress Bar */}
        {escrow.escrow_progress && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Tiến trình giải ngân
            </h4>
            <EscrowProgressBar progress={escrow.escrow_progress} compact={false} />
          </div>
        )}

        {/* Request Reason */}
        {escrow.request_reason && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Lý do yêu cầu:
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {escrow.request_reason}
            </p>
          </div>
        )}

        {/* Voting Period */}
        {(escrow.voting_start_date || escrow.voting_end_date) && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Thời gian vote</span>
            </div>
            {escrow.voting_start_date && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Bắt đầu:</span> {formatDate(escrow.voting_start_date)}
              </div>
            )}
            {escrow.voting_end_date && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Kết thúc:</span> {formatDate(escrow.voting_end_date)}
              </div>
            )}
            {timeRemaining && escrow.request_status === 'voting_in_progress' && (
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
                <span>{timeRemaining}</span>
              </div>
            )}
          </div>
        )}

        {/* Voting Results */}
        {escrow.votingResults && escrow.votingResults.totalVotes > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Users className="w-4 h-4" />
              <span>Kết quả vote</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Approve */}
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Đồng ý</span>
                </div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300">
                  {escrow.votingResults.approvePercentage}%
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  {escrow.votingResults.approveCount} phiếu
                  <br />
                  <span className="font-medium">Tổng trọng số: {formatAmount(escrow.votingResults.totalApproveWeight)}</span>
                </div>
              </div>

              {/* Reject */}
              <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">Từ chối</span>
                </div>
                <div className="text-lg font-bold text-red-700 dark:text-red-300">
                  {escrow.votingResults.rejectPercentage}%
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  {escrow.votingResults.rejectCount} phiếu
                  <br />
                  <span className="font-medium">Tổng trọng số: {formatAmount(escrow.votingResults.totalRejectWeight)}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Tổng: {escrow.votingResults.totalVotes} phiếu bầu
            </div>
          </div>
        )}

        {/* User Vote Display */}
        {userVote && (
          <div className={`rounded-lg p-3 ${
            userVote.value === 'approve' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {userVote.value === 'approve' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`font-medium ${
                userVote.value === 'approve'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                Bạn đã vote: {userVote.value === 'approve' ? 'Đồng ý' : 'Từ chối'}
              </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      (Trọng số: {formatAmount(userVote.vote_weight)} - tổng số tiền bạn đã donate)
                    </span>
            </div>
          </div>
        )}

        {/* Admin Review Info */}
        {escrow.admin_reviewed_at && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Admin đã xem xét:</span> {formatDate(escrow.admin_reviewed_at)}
            </div>
            {escrow.admin_rejection_reason && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                <span className="font-medium">Lý do từ chối:</span> {escrow.admin_rejection_reason}
              </div>
            )}
          </div>
        )}

        {/* Disbursement Section - Hiển thị CÔNG KHAI bill giải ngân khi escrow đã released */}
        {escrow.request_status === 'released' && escrow.disbursement_proof_images && escrow.disbursement_proof_images.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Giải ngân - Bill chứng từ
              </h4>
            </div>
            
            {/* Disbursement Info */}
            <div className="mb-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {escrow.released_at && (
                <div>
                  <span className="font-medium">Thời gian giải ngân:</span> {formatDate(escrow.released_at)}
                </div>
              )}
              <div>
                <span className="font-medium">Số tiền giải ngân:</span> {formatAmount(escrow.withdrawal_request_amount)}
              </div>
            </div>

            {/* Disbursement Note */}
            {escrow.disbursement_note && (
              <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Ghi chú:</span> {escrow.disbursement_note}
                </p>
              </div>
            )}

            {/* Proof Images Gallery - PUBLIC, read-only */}
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bill giải ngân ({escrow.disbursement_proof_images.length} ảnh):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {escrow.disbursement_proof_images.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition"
                    onClick={() => {
                      // Open image in new tab for full view
                      window.open(imageUrl, '_blank');
                    }}
                  >
                    <Image
                      src={imageUrl}
                      alt={`Bill giải ngân ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                * Bill giải ngân được công khai để đảm bảo minh bạch tài chính
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Chỉ hiển thị nút Cancel cho creator, không hiển thị nút vote ở đây nữa */}
      {canCancel && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
            >
              Hủy yêu cầu
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Tạo lúc: {formatDate(escrow.createdAt)}</span>
          {escrow.released_at && (
            <span>Giải ngân: {formatDate(escrow.released_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

