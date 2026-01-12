import apiClient from './apiClient';

const RECOMMENDATION_ROUTE = 'api/recommendations';
const GET_RECOMMENDED_CAMPAIGNS_ROUTE = `${RECOMMENDATION_ROUTE}`;
const GET_ANONYMOUS_RECOMMENDATIONS_ROUTE = `${RECOMMENDATION_ROUTE}/anonymous`;

export const recommendationService = {
  async getRecommendedCampaigns(limit = 10) {
    const response = await apiClient.get(GET_RECOMMENDED_CAMPAIGNS_ROUTE, {
      params: { limit },
    });
    return response.data;
  },

  async getAnonymousRecommendations(limit = 10) {
    const response = await apiClient.get(GET_ANONYMOUS_RECOMMENDATIONS_ROUTE, {
      params: { limit },
    });
    return response.data;
  },
};

