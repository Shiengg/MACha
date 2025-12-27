'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { escrowService, Escrow } from '@/services/escrow.service';
import Swal from 'sweetalert2';

interface WithdrawalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  availableAmount: number;
  onSuccess?: (escrow: Escrow) => void;
  existingPendingRequests?: Escrow[];
}

export default function WithdrawalRequestModal({
  isOpen,
  onClose,
  campaignId,
  availableAmount,
  onSuccess,
  existingPendingRequests = [],
}: WithdrawalRequestModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    reason?: string;
    general?: string;
  }>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setReason('');
      setErrors({});
    }
  }, [isOpen]);

  // Check for existing pending requests
  useEffect(() => {
    if (isOpen && existingPendingRequests.length > 0) {
      const pendingStatuses: Escrow['request_status'][] = [
        'pending_voting',
        'voting_in_progress',
        'voting_completed',
        'admin_approved',
      ];
      
      const hasPending = existingPendingRequests.some((req) =>
        pendingStatuses.includes(req.request_status)
      );

      if (hasPending) {
        setErrors({
          general: 'Đã có yêu cầu rút tiền đang chờ xử lý. Vui lòng đợi yêu cầu hiện tại được xử lý trước khi tạo yêu cầu mới.',
        });
      }
    }
  }, [isOpen, existingPendingRequests]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate amount
    const amountValue = parseFloat(amount.replace(/[^\d.]/g, ''));
    
    if (!amount || amountValue <= 0) {
      newErrors.amount = 'Số tiền phải lớn hơn 0';
    } else if (amountValue > availableAmount) {
      newErrors.amount = `Số tiền không được vượt quá số tiền có sẵn (${formatAmount(availableAmount)})`;
    }

    // Validate reason
    if (!reason.trim()) {
      newErrors.reason = 'Vui lòng nhập lý do yêu cầu rút tiền';
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Lý do phải có ít nhất 10 ký tự';
    }

    // Check for pending requests
    const pendingStatuses: Escrow['request_status'][] = [
      'pending_voting',
      'voting_in_progress',
      'voting_completed',
      'admin_approved',
    ];
    
    const hasPending = existingPendingRequests.some((req) =>
      pendingStatuses.includes(req.request_status)
    );

    if (hasPending) {
      newErrors.general = 'Đã có yêu cầu rút tiền đang chờ xử lý. Vui lòng đợi yêu cầu hiện tại được xử lý trước khi tạo yêu cầu mới.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and one decimal point
    const cleanedValue = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      return;
    }

    setAmount(cleanedValue);
    
    // Clear amount error when user types
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    
    // Clear reason error when user types
    if (errors.reason) {
      setErrors((prev) => ({ ...prev, reason: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const amountValue = parseFloat(amount.replace(/[^\d.]/g, ''));

      const escrow = await escrowService.createWithdrawalRequest(campaignId, {
        withdrawal_request_amount: amountValue,
        request_reason: reason.trim(),
      });

      // Success
      await Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: 'Yêu cầu rút tiền đã được tạo thành công',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#2563eb',
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(escrow);
      }

      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);

      // Extract error message
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tạo yêu cầu rút tiền. Vui lòng thử lại sau.';

      // Check if it's a validation error with availableAmount
      if (error?.response?.data?.availableAmount !== undefined) {
        setErrors({
          amount: `Số tiền không được vượt quá số tiền có sẵn (${formatAmount(error.response.data.availableAmount)})`,
        });
      } else if (error?.response?.data?.error === 'PENDING_REQUEST_EXISTS') {
        setErrors({
          general: errorMessage,
        });
      } else {
        // Show error alert
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });

        setErrors({
          general: errorMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const amountValue = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
  const percentageOfAvailable = availableAmount > 0 
    ? parseFloat(((amountValue / availableAmount) * 100).toFixed(1))
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Yêu cầu rút tiền
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tạo yêu cầu rút tiền cho campaign
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
            </div>
          )}

          {/* Available Amount Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Số tiền có sẵn để rút
                </p>
                                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                                        {formatAmount(availableAmount || 0)}
                                                    </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <DollarSign className="w-4 h-4 inline-block mr-1" />
              Số tiền muốn rút <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Nhập số tiền (VND)"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                errors.amount
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.amount}
              </p>
            )}
            {amountValue > 0 && !errors.amount && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Số tiền: <span className="font-semibold">{formatAmount(amountValue)}</span>
                </p>
                {availableAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(percentageOfAvailable, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {percentageOfAvailable.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reason Textarea */}
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <FileText className="w-4 h-4 inline-block mr-1" />
              Lý do yêu cầu rút tiền <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={handleReasonChange}
              placeholder="Vui lòng giải thích chi tiết lý do và kế hoạch sử dụng số tiền này (tối thiểu 10 ký tự)"
              rows={5}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                errors.reason
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.reason ? (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.reason}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {reason.length}/10 ký tự tối thiểu
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {reason.length} ký tự
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Lưu ý:</strong> Yêu cầu rút tiền của bạn sẽ được gửi đến các donors để vote.
              Cần đạt ít nhất 50% số phiếu đồng ý (tính theo trọng số số tiền đã donate) để được
              chuyển sang admin xem xét.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !!errors.general}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Gửi yêu cầu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

