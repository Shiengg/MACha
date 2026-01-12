import apiClient from './apiClient';
import { cacheService } from './cache.service';
import { GET_DONATIONS_BY_CAMPAIGN_ROUTE } from '../constants/api';

export const donationService = {
  async getDonationsByCampaign(campaignId) {
    if (!campaignId) return [];
    
    const cacheKey = `donations:${campaignId}`;
    
    // Use getOrSetPending to prevent duplicate requests
    return cacheService.getOrSetPending(
      cacheKey,
      async () => {
        const response = await apiClient.get(GET_DONATIONS_BY_CAMPAIGN_ROUTE(campaignId));
        return response.data || [];
      },
      3 * 60 * 1000 // Cache for 3 minutes
    );
  },
};

