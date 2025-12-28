'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown, Vote, Users } from 'lucide-react';
import { Escrow, Vote as VoteType } from '@/services/escrow.service';

interface VotingSectionProps {
  escrow: Escrow;
  userVote?: VoteType | null;
  onVote: (escrowId: string, value: 'approve' | 'reject') => void;
  isEligible: boolean;
  isVoting?: boolean;
}

export default function VotingSection({
  escrow,
  userVote,
  onVote,
  isEligible,
  isVoting = false,
}: VotingSectionProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  // Calculate time remaining for voting period
  useEffect(() => {
    if (!escrow.voting_end_date || escrow.request_status !== 'voting_in_progress') {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const endDate = new Date(escrow.voting_end_date!).getTime();
      const difference = endDate - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      });
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000); // Update every second

    return () => clearInterval(interval);
  }, [escrow.voting_end_date, escrow.request_status]);

  const formatTimeRemaining = () => {
    if (!timeRemaining) return null;

    if (timeRemaining.isExpired) {
      return 'Đã kết thúc';
    }

    const parts: string[] = [];
    if (timeRemaining.days > 0) {
      parts.push(`${timeRemaining.days} ngày`);
    }
    if (timeRemaining.hours > 0) {
      parts.push(`${timeRemaining.hours} giờ`);
    }
    if (timeRemaining.minutes > 0 || timeRemaining.days === 0) {
      parts.push(`${timeRemaining.minutes} phút`);
    }
    if (timeRemaining.days === 0 && timeRemaining.hours === 0) {
      parts.push(`${timeRemaining.seconds} giây`);
    }

    return `Còn ${parts.join(' ')}`;
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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const canVote = isEligible && escrow.request_status === 'voting_in_progress' && !timeRemaining?.isExpired;

  const handleVote = (value: 'approve' | 'reject') => {
    if (isVoting) return;
    onVote(escrow._id, value);
  };

  // Not eligible to vote
  if (!isEligible && escrow.request_status === 'voting_in_progress') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
              Không đủ điều kiện vote
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Bạn cần đã donate cho campaign này để có quyền vote cho withdrawal request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Voting period has ended or status is not voting_in_progress
  if (escrow.request_status !== 'voting_in_progress' || timeRemaining?.isExpired) {
    if (userVote) {
      return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Vote className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Bạn đã vote cho withdrawal request này
              </h3>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mt-2 ${
                userVote.value === 'approve'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {userVote.value === 'approve' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {userVote.value === 'approve' ? 'Đồng ý' : 'Từ chối'}
                </span>
                <span className="text-xs opacity-75">
                  (Trọng số: {formatAmount(userVote.vote_weight)} - tổng số tiền đã donate)
                </span>
              </div>
              {escrow.request_status === 'voting_completed' && escrow.votingResults && (
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  Kết quả: {escrow.votingResults.approvePercentage}% đồng ý
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {timeRemaining?.isExpired
                ? 'Thời gian vote đã kết thúc'
                : 'Không trong thời gian vote'}
            </p>
            {escrow.votingResults && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Kết quả: {escrow.votingResults.approvePercentage}% đồng ý
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Bỏ phiếu
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Quyết định của bạn ảnh hưởng đến việc giải ngân
            </p>
          </div>
        </div>
      </div>

      {/* Voting Period Countdown */}
      {timeRemaining && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Thời gian còn lại
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {timeRemaining.isExpired ? '00:00:00' : 
                  `${String(timeRemaining.days * 24 + timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`
                }
              </div>
              {!timeRemaining.isExpired && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatTimeRemaining()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Vote Status */}
      {userVote ? (
        <div className={`rounded-lg p-4 mb-4 border-2 ${
          userVote.value === 'approve'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userVote.value === 'approve' ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Bạn đã vote: <span className={
                    userVote.value === 'approve'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }>
                    {userVote.value === 'approve' ? 'Đồng ý' : 'Từ chối'}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Trọng số vote: {formatAmount(userVote.vote_weight)} (tổng số tiền bạn đã donate)
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            Bạn có thể thay đổi vote của mình trước khi thời gian kết thúc
          </p>
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">Bạn chưa vote cho withdrawal request này</p>
          </div>
        </div>
      )}

      {/* Voting Results Preview */}
      {escrow.votingResults && escrow.votingResults.totalVotes > 0 && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Kết quả hiện tại
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {escrow.votingResults.approvePercentage}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Đồng ý</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {escrow.votingResults.rejectPercentage}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Từ chối</div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            {escrow.votingResults.totalVotes} phiếu bầu
          </div>
        </div>
      )}

      {/* Vote Buttons */}
      <div className="space-y-3">
        {!userVote ? (
          <>
            <button
              onClick={() => handleVote('approve')}
              disabled={isVoting || !canVote}
              className={`w-full px-6 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
                isVoting || !canVote
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isVoting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Đồng ý giải ngân</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleVote('reject')}
              disabled={isVoting || !canVote}
              className={`w-full px-6 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
                isVoting || !canVote
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isVoting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Từ chối giải ngân</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-2">
              Bạn muốn thay đổi vote?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVote('approve')}
                disabled={isVoting || userVote.value === 'approve'}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isVoting || userVote.value === 'approve'
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {isVoting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span>Đổi sang Đồng ý</span>
              </button>
              <button
                onClick={() => handleVote('reject')}
                disabled={isVoting || userVote.value === 'reject'}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isVoting || userVote.value === 'reject'
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {isVoting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>Đổi sang Từ chối</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300">
          <p className="font-semibold mb-1">💡 Giải thích về trọng số vote:</p>
          <p className="leading-relaxed">
            <strong>Trọng số vote = Tổng số tiền bạn đã donate</strong> cho chiến dịch này. 
            Ví dụ: Nếu bạn đã donate 50.520.000 ₫, thì trọng số vote của bạn là 50.520.000 ₫. 
            Kết quả vote được tính dựa trên <strong>tổng trọng số</strong> của tất cả các phiếu bầu (không phải số lượng phiếu).
          </p>
        </div>
      </div>
    </div>
  );
}

