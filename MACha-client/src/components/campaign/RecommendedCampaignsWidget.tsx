'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { recommendationService, type Campaign } from '@/services/recommendation.service';
import { FaHeart } from 'react-icons/fa';
import Image from 'next/image';

interface RecommendedCampaignsWidgetProps {
  limit?: number;
}

export default function RecommendedCampaignsWidget({ limit = 7 }: RecommendedCampaignsWidgetProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await recommendationService.getRecommendedCampaigns(limit);
      setCampaigns(response.campaigns);

    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const handleCampaignClick = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Chiến dịch gợi ý
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <FaHeart className="text-red-500" />
        Dành cho bạn
      </h3>

      {/* Campaigns List */}
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign._id}
            onClick={() => handleCampaignClick(campaign._id)}
            className="flex gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors -mx-2"
          >
            {/* Campaign Image */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
              {campaign.banner_image ? (
                <Image
                  src={campaign.banner_image}
                  alt={campaign.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Campaign Info */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                {campaign.title}
              </h4>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                <div
                  className="bg-gradient-to-r from-green-500 to-orange-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${calculateProgress(campaign.current_amount, campaign.goal_amount)}%`,
                  }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">
                  {formatCurrency(campaign.current_amount)} VNĐ
                </span>
                <span className="text-gray-500 dark:text-gray-500">
                  {calculateProgress(campaign.current_amount, campaign.goal_amount)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <button
        onClick={() => router.push('/discover')}
        className="w-full mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        Xem tất cả chiến dịch
      </button>
    </div>
  );
}

