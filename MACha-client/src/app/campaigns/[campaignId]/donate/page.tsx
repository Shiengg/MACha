'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import apiClient from '@/lib/api-client';
import { INIT_SEPAY_PAYMENT_ROUTE } from '@/constants/api';
import { campaignCompanionService } from '@/services/campaignCompanion.service';
import { useAuth } from '@/contexts/AuthContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = Number(amount.replace(/\D/g, ''));
    if (!value || value <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
        <div className="w-full max-w-md bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
          <button
            onClick={() => router.back()}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
          >
            ← Quay lại chiến dịch
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              Ủng hộ chiến dịch
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              Nhập số tiền bạn muốn ủng hộ (VND)
            </p>
            {companionId && companionName && (
              <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-xs sm:text-sm">
                  <span className="font-medium">Đang donate qua:</span> {companionName}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Số tiền ủng hộ
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ví dụ: 500000"
                value={amount}
              onChange={(e) => {
                // Chỉ cho phép nhập số: loại bỏ mọi ký tự không phải chữ số
                const numericValue = e.target.value.replace(/\D/g, '');
                setAmount(numericValue);
              }}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 dark:text-black dark:placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p className="text-xs sm:text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg sm:rounded-xl hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang chuyển đến SePay...' : 'Xác nhận ủng hộ'}
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}