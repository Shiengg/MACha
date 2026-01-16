'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import UserRoute from '@/components/guards/UserRoute';
import apiClient from '@/lib/api-client';
import { INIT_SEPAY_PAYMENT_ROUTE } from '@/constants/api';
import { campaignCompanionService } from '@/services/campaignCompanion.service';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

// Maximum donation amount: 10 billion VND
const MAX_AMOUNT = 10000000000;

// Helper function to format VND for UI display only (does not affect business logic)
const formatVNDForDisplay = (value: string | number): string => {
  const numValue = typeof value === 'string' ? value.replace(/\D/g, '') : String(value);
  if (!numValue || numValue === '0') return '0';
  return new Intl.NumberFormat('vi-VN').format(Number(numValue));
};

export default function DonatePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.campaignId as string;
  const { user } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  
  // Quick amount options
  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];
  
  // Get numeric value for validation and display
  const numericAmount = amount ? Number(amount.replace(/\D/g, '')) : 0;
  const isValidAmount = numericAmount > 0 && numericAmount <= MAX_AMOUNT;
  const exceedsMaxAmount = numericAmount > MAX_AMOUNT;

  useEffect(() => {
    const companionIdParam = searchParams.get('companion_id');
    if (companionIdParam) {
      setCompanionId(companionIdParam);
    } else if (user && user.role === 'user') {
      campaignCompanionService.checkIsCompanion(campaignId, user._id || user.id || '')
        .then(async (isCompanion) => {
          if (isCompanion) {
            const companions = await campaignCompanionService.getCampaignCompanions(campaignId);
            const userCompanion = companions.companions.find(
              c => c.user._id === (user._id || user.id)
            );
            if (userCompanion) {
              setCompanionId(userCompanion._id);
              setCompanionName(userCompanion.user.fullname || userCompanion.user.username);
            }
          }
        })
        .catch(console.error);
    }
  }, [searchParams, user, campaignId]);

  const handleQuickAmount = (quickValue: number) => {
    setAmount(String(quickValue));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = Number(amount.replace(/\D/g, ''));
    if (!value || value <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (value > MAX_AMOUNT) {
      setError(`Số tiền tối đa là ${formatVNDForDisplay(MAX_AMOUNT)} VND`);
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        amount: value,
        currency: 'VND',
        paymentMethod: 'BANK_TRANSFER',
        is_anonymous: false,
      };

      if (companionId) {
        payload.companion_id = companionId;
      }

      const res = await apiClient.post(
        INIT_SEPAY_PAYMENT_ROUTE(campaignId),
        payload
      );

      const { checkoutUrl, formFields } = res.data as {
        checkoutUrl: string;
        formFields: Record<string, string>;
      };

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl;

      Object.entries(formFields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể khởi tạo thanh toán SePay';
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
        <div className="w-full max-w-lg lg:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-10 lg:p-12 space-y-6 sm:space-y-8 lg:space-y-10">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Quay lại chiến dịch
          </button>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Ủng hộ chiến dịch
            </h1>
            {companionId && companionName && (
              <div className="mt-3 inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-xs sm:text-sm">
                  <span className="font-medium">Đang donate qua:</span> {companionName}
                </p>
              </div>
            )}
          </div>

          {/* Hero Amount Display - Trung tâm */}
          <div className="text-center py-6 sm:py-8 lg:py-10 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200 px-4 sm:px-6 overflow-hidden">
            <p className="text-xs sm:text-sm text-gray-600 mb-3 font-medium">Số tiền ủng hộ</p>
            <div className="flex items-center justify-center gap-2 min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] w-full">
              <div className="flex items-center justify-center gap-2 w-full max-w-full flex-wrap">
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 tracking-tight break-words text-center leading-tight hyphens-none">
                  {numericAmount > 0 ? formatVNDForDisplay(numericAmount) : '0'}
                </span>
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-orange-600 flex-shrink-0">₫</span>
              </div>
            </div>
            {numericAmount === 0 && (
              <p className="text-xs text-gray-500 mt-3">Nhập số tiền bên dưới</p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 font-medium">Chọn nhanh:</p>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 border border-gray-200 hover:border-orange-300 rounded-lg transition-all duration-200 active:scale-95 overflow-hidden"
                >
                  <span className="block truncate">{formatVNDForDisplay(quickAmount)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Field */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Hoặc nhập số tiền tùy ý
                <span className="text-gray-500 font-normal ml-1">(Tối đa {formatVNDForDisplay(MAX_AMOUNT)} VND)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-lg z-10">₫</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tiền"
                  value={amount ? formatVNDForDisplay(amount) : ''}
                  onChange={(e) => {
                    // Chỉ cho phép nhập số: loại bỏ mọi ký tự không phải chữ số
                    const numericValue = e.target.value.replace(/\D/g, '');
                    const numValue = numericValue ? Number(numericValue) : 0;
                    
                    // Giới hạn tối đa 100 tỉ
                    if (numValue > MAX_AMOUNT) {
                      setAmount(String(MAX_AMOUNT));
                      setError(`Số tiền tối đa là ${formatVNDForDisplay(MAX_AMOUNT)} VND`);
                    } else {
                      setAmount(numericValue);
                      setError(null);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3.5 sm:py-4 text-base sm:text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 font-medium tracking-wide overflow-x-auto"
                  style={{ textOverflow: 'ellipsis' }}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs sm:text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Collapsible Warning */}
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWarning(!showWarning)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-amber-800">
                    ⚠️ Lưu ý quan trọng
                  </span>
                </div>
                {showWarning ? (
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                )}
              </button>
              {showWarning && (
                <div className="p-3 sm:p-4 bg-amber-50 border-t border-amber-200">
                  <p className="text-xs sm:text-sm text-amber-700 leading-relaxed">
                    Vui lòng chụp lại màn hình giao dịch chuyển khoản thành công sau khi hoàn tất donate.
                    Đây là bằng chứng quan trọng để hệ thống và đội ngũ hỗ trợ xác minh giao dịch
                    trong trường hợp phát sinh tranh chấp, khiếu nại hoặc sai lệch dữ liệu thanh toán.
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isValidAmount}
              className="w-full py-4 sm:py-5 text-base sm:text-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98] overflow-hidden"
            >
              <span className="block truncate px-2">
                {loading ? (
                  'Đang chuyển đến SePay...'
                ) : isValidAmount ? (
                  `Ủng hộ ₫${formatVNDForDisplay(numericAmount)}`
                ) : (
                  'Nhập số tiền để tiếp tục'
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </UserRoute>
  );
}