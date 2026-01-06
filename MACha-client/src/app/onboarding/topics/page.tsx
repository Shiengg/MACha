'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { COMPLETE_ONBOARDING_ROUTE } from '@/constants/api';

const CATEGORY_LABELS: Record<string, string> = {
  children: 'Trẻ em',
  elderly: 'Người già',
  poverty: 'Người nghèo',
  disaster: 'Thiên tai',
  medical: 'Y tế, bệnh hiểm nghèo',
  education: 'Giáo dục',
  disability: 'Người khuyết tật',
  animal: 'Động vật',
  environment: 'Môi trường',
  hardship: 'Hoàn cảnh khó khăn',
  other: 'Khác',
};

const ALL_CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

export default function OnboardingTopicsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, setUser } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isCompleted = useMemo(() => {
    if (!user) return false;
    if (user.onboarding_completed) return true;
    const selectedCategories =
      user.onboarding_data?.selected_categories ||
      user.onboarding_data?.selectedCategories ||
      [];
    return Array.isArray(selectedCategories) && selectedCategories.length > 0;
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login?redirect=/onboarding/topics');
      return;
    }

    if (isCompleted) {
      router.replace('/');
      return;
    }

    const existing =
      user.onboarding_data?.selected_categories ||
      user.onboarding_data?.selectedCategories ||
      [];
    if (Array.isArray(existing) && existing.length > 0) {
      setSelected(existing.filter((c: string) => ALL_CATEGORY_KEYS.includes(c)));
    }
  }, [loading, isAuthenticated, user, router, isCompleted]);

  const toggleCategory = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const handleSubmit = async () => {
    if (!user || selected.length === 0) return;
    setSubmitting(true);
    try {
      const userId = (user as any).id || user._id;
      const res = await apiClient.patch(
        COMPLETE_ONBOARDING_ROUTE(userId),
        { selected_categories: selected },
        { withCredentials: true },
      );
      if (res.data?.user) {
        setUser({
          id: res.data.user.id || res.data.user._id,
          ...res.data.user,
        });
      }
      router.replace('/');
    } catch (error) {
      console.error('Failed to complete onboarding', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Chọn chủ đề bạn quan tâm
        </h1>
        <p className="text-gray-600 mb-6">
          Những chủ đề này sẽ giúp MACha gợi ý chiến dịch, sự kiện và nội dung
          phù hợp với bạn hơn.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {ALL_CATEGORY_KEYS.map(key => {
            const active = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                className={`flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-800 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {CATEGORY_LABELS[key]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            disabled={selected.length === 0 || submitting}
            onClick={handleSubmit}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed gap-2"
          >
            {submitting && (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>
              {selected.length === 0
                ? 'Chọn ít nhất 1 chủ đề'
                : 'Tiếp tục vào MACha'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


