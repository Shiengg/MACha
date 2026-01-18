'use client';

import { useEffect, useState } from 'react';
import { recommendationService, type Campaign } from '@/services/recommendation.service';
import Swal from 'sweetalert2';

interface RecommendedCampaignsProps {
  limit?: number;
  className?: string;
  onCampaignClick?: (campaign: Campaign) => void;
}

export default function RecommendedCampaigns({ 
  limit = 10, 
  className = '',
  onCampaignClick 
}: RecommendedCampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [strategy, setStrategy] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await recommendationService.getRecommendedCampaigns(limit);
      
      setCampaigns(response.campaigns);
      setStrategy(response.strategy);

      // Show info about strategy used
      if (response.strategy === 'fallback_random') {
        console.info('Using fallback recommendations - recommendation service may be unavailable');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations';
      setError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load recommendations. Please try again later.</p>
          <button 
            onClick={fetchRecommendations}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12 text-gray-500">
          <p>No recommended campaigns available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header with strategy info */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recommended For You</h2>
        {strategy && (
          <span className="text-sm text-gray-500 capitalize">
            {strategy.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {campaigns.map((campaign) => (
          <div
            key={campaign._id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            onClick={() => onCampaignClick?.(campaign)}
          >
            {/* Campaign Image */}
            <div className="relative h-48 bg-gray-200">
              {campaign.banner_image ? (
                <img
                  src={campaign.banner_image}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              {/* Category Badge */}
              <div className="absolute top-2 right-2">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 capitalize">
                  {campaign.category}
                </span>
              </div>
            </div>

            {/* Campaign Content */}
            <div className="p-4">
              {/* Title */}
              <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                {campaign.title}
              </h3>

              {/* Creator */}
              {campaign.creator && (
                <div className="flex items-center gap-2 mb-3">
                  {campaign.creator.avatar ? (
                    <img
                      src={campaign.creator.avatar}
                      alt={campaign.creator.username}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300" />
                  )}
                  <span className="text-sm text-gray-600">
                    {campaign.creator?.fullname || campaign.creator?.username || 'Không xác định'}
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Raised</span>
                  <span>{calculateProgress(campaign.current_amount, campaign.goal_amount)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${calculateProgress(campaign.current_amount, campaign.goal_amount)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Amounts */}
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-600">Raised</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(campaign.current_amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">Goal</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(campaign.goal_amount)}
                  </p>
                </div>
              </div>

              {/* Hashtag */}
              {campaign.hashtag && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-primary">
                    #{campaign.hashtag.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchRecommendations}
          className="text-primary hover:text-primary-dark font-medium"
        >
          Refresh Recommendations
        </button>
      </div>
    </div>
  );
}

