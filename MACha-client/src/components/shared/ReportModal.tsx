'use client';

import React, { useState, useEffect } from 'react';
import { X, Flag, ChevronRight, ArrowLeft } from 'lucide-react';
import { createReport, ReportReason, ReportedType } from '@/services/report.service';
import Swal from 'sweetalert2';

interface ReportModalProps {
  reportedType: ReportedType;
  reportedId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS_USER: Array<{ value: ReportReason; label: string }> = [
  { value: 'scam', label: 'Lừa đảo, gian lận hoặc mạo danh' },
  { value: 'inappropriate_content', label: 'Nội dung người lớn' },
  { value: 'spam', label: 'Bán hoặc quảng cáo mặt hàng bị hạn chế' },
  { value: 'violence', label: 'Bạo lực, thù ghét hoặc bóc lột' },
  { value: 'harassment', label: 'Bắt nạt hoặc liên hệ theo cách không mong muốn' },
  { value: 'copyright', label: 'Quyền sở hữu trí tuệ' },
  { value: 'misinformation', label: 'Thông tin sai sự thật' },
  { value: 'other', label: 'Khác' },
];

const REPORT_REASONS_ADMIN: Array<{ value: ReportReason; label: string }> = [
  { value: 'abuse_of_power', label: 'Lạm quyền' },
  { value: 'inappropriate_handling', label: 'Xử lý sai hoặc không phù hợp' },
  { value: 'harassment', label: 'Bắt nạt hoặc quấy rối' },
  { value: 'scam', label: 'Lừa đảo, gian lận' },
  { value: 'violence', label: 'Bạo lực, thù ghét' },
  { value: 'misinformation', label: 'Thông tin sai sự thật' },
  { value: 'other', label: 'Khác' },
];

export default function ReportModal({
  reportedType,
  reportedId,
  isOpen,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReason, setSelectedReason] = useState<ReportReason | ''>('');
  const [selectedReasonIndex, setSelectedReasonIndex] = useState<number>(-1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedReason('');
      setSelectedReasonIndex(-1);
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        if (step === 2) {
          setStep(1);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, onClose, step]);

  const handleReasonSelect = (reason: ReportReason, index: number) => {
    setSelectedReason(reason);
    setSelectedReasonIndex(index);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      setError('Vui lòng chọn lý do báo cáo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReport({
        reported_type: reportedType,
        reported_id: reportedId,
        reported_reason: selectedReason as ReportReason,
        description: description.trim() || undefined,
      });

      onSuccess?.();
      onClose();
      
      Swal.fire({
        title: 'Báo cáo thành công!',
        text: 'Báo cáo của bạn đã được gửi thành công. Cảm ơn bạn đã giúp chúng tôi duy trì một cộng đồng lành mạnh.',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } catch (err: any) {
      console.error('Error submitting report:', err);
      
      if (err.message && err.message.includes('already reported')) {
        setError('Bạn đã báo cáo nội dung này rồi. Vui lòng chờ admin xử lý.');
        
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(err.message || 'Không thể gửi báo cáo. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const REPORT_REASONS = reportedType === 'admin' ? REPORT_REASONS_ADMIN : REPORT_REASONS_USER;
  const selectedReasonLabel = selectedReasonIndex >= 0 ? REPORT_REASONS[selectedReasonIndex]?.label || '' : '';

  return (
    <div className="fixed top-12 inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!isSubmitting ? (step === 2 ? handleBack : onClose) : undefined}
      />

      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Báo cáo
            </h2>
          </div>
          <button
            onClick={step === 2 ? handleBack : onClose}
            disabled={isSubmitting}
            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === 1 ? (
            /* Step 1: Select Reason */
            <div key="step-1" className="animate-in fade-in duration-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tại sao bạn báo cáo nội dung này?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Nếu bạn nhận thấy ai đó đang gặp nguy hiểm, đừng chần chừ mà hãy tìm ngay sự giúp đỡ trước khi báo cáo với chúng tôi.
              </p>
              
              <div className="space-y-0">
                {REPORT_REASONS.map((reason, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleReasonSelect(reason.value, index)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-base text-gray-900 dark:text-white text-left">
                      {reason.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2: Enter Description */
            <div key="step-2" className="animate-in fade-in duration-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Thêm chi tiết
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Bạn đã chọn: <span className="font-medium">{selectedReasonLabel}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Mô tả thêm (tùy chọn)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Bạn có thể cung cấp thêm thông tin chi tiết về vấn đề này..."
                    disabled={isSubmitting}
                    rows={6}
                    maxLength={1000}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    autoFocus
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    {description.length}/1000
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/70 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Flag className="w-4 h-4" />
                        Gửi báo cáo
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

