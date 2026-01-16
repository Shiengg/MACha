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
  
  // Check if a quick amount is selected
  const isQuickAmountSelected = (quickValue: number) => {
    return numericAmount === quickValue;
  };
  
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
        <div className="w-full max-w-lg lg:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-10 lg:p-12 space-y-6 sm:space-y-8">
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

          {/* Current Amount Card - SỐ TIỀN HIỆN TẠI */}
          <div className="bg-gray-100 rounded-xl p-6 sm:p-8">
            <p className="text-center text-sm text-gray-500 mb-4">SỐ TIỀN HIỆN TẠI</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-teal-700">
                {numericAmount > 0 ? formatVNDForDisplay(numericAmount) : '0'}
              </span>
              <span className="text-3xl sm:text-4xl font-bold text-teal-700">₫</span>
            </div>
          </div>

          {/* Input Field - Nhập số tiền muốn ủng hộ */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
                Nhập số tiền muốn ủng hộ
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700 font-semibold text-lg z-10">₫</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
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
                  className="w-full pl-10 pr-4 py-4 text-base sm:text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 placeholder:text-gray-400 font-medium bg-white"
                />
              </div>
            </div>

            {/* Quick Amount Selection - Chọn nhanh số tiền */}
            <div>
              <p className="block text-sm sm:text-base font-medium text-teal-600 mb-3">
                Chọn nhanh số tiền
              </p>
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {quickAmounts.map((quickAmount) => {
                  const isSelected = isQuickAmountSelected(quickAmount);
                  return (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => handleQuickAmount(quickAmount)}
                      className={`px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        isSelected
                          ? 'bg-teal-700 text-white'
                          : 'bg-gray-100 text-teal-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="block truncate">{formatVNDForDisplay(quickAmount)}</span>
                    </button>
                  );
                })}
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
                    Vui lòng chụp lại màn hình giao dịch chuyển khoản thành công sau khi hoàn tất ủng hộ.
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
              className="w-full py-4 sm:py-5 text-base sm:text-lg bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98] overflow-hidden"
            >
              <span className="block truncate px-2">
                {loading ? (
                  'Đang chuyển đến SePay...'
                ) : isValidAmount ? (
                  `Ủng hộ ${formatVNDForDisplay(numericAmount)} ₫`
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