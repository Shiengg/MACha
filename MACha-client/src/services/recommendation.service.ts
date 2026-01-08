import apiClient from '@/lib/api-client';
import { 
  GET_RECOMMENDED_CAMPAIGNS_ROUTE,
  GET_ANONYMOUS_RECOMMENDATIONS_ROUTE
} from '@/constants/api';

export interface Campaign {
  _id: string;
  creator: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  start_date: string;
  end_date?: string;
  status: 'pending' | 'active' | 'rejected' | 'completed' | 'cancelled';
  category: string;
  banner_image?: string;
  gallery_images?: string[];
  hashtag?: {
    _id: string;
    name: string;
  };
  location?: {
    location_name: string;
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationResponse {
  campaigns: Campaign[];
  strategy: 'onboarding_interest' | 'user_based' | 'content_based' | 'hybrid' | 'fallback_random' | 'anonymous_popular' | 'unknown';
  count: number;
}

export const recommendationService = {
  /**
   * Get personalized campaign recommendations for the authenticated user
   * Falls back to popular campaigns for anonymous users
   * @param limit - Number of recommendations to fetch (default: 10, max: 50)
   */
  async getRecommendedCampaigns(limit: number = 10): Promise<RecommendationResponse> {
    const response = await apiClient.get(GET_RECOMMENDED_CAMPAIGNS_ROUTE, {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get popular/trending campaigns for anonymous users
   * @param limit - Number of recommendations to fetch (default: 10, max: 50)
   */
  async getAnonymousRecommendations(limit: number = 10): Promise<RecommendationResponse> {
    const response = await apiClient.get(GET_ANONYMOUS_RECOMMENDATIONS_ROUTE, {
      params: { limit }
    });
    return response.data;
  },
};

