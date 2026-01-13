import apiClient from './apiClient';
import {
  JOIN_CAMPAIGN_COMPANION_ROUTE,
  LEAVE_CAMPAIGN_COMPANION_ROUTE,
  GET_CAMPAIGN_COMPANIONS_ROUTE,
  GET_USER_COMPANION_CAMPAIGNS_ROUTE,
} from '../constants/api';

export const campaignCompanionService = {
  async joinCampaign(campaignId) {
    const response = await apiClient.post(JOIN_CAMPAIGN_COMPANION_ROUTE(campaignId), {});
    return response.data.companion;
  },

  async leaveCampaign(campaignId) {
    await apiClient.delete(LEAVE_CAMPAIGN_COMPANION_ROUTE(campaignId));
  },

  async getCampaignCompanions(campaignId, page = 0, limit = 20) {
    const response = await apiClient.get(GET_CAMPAIGN_COMPANIONS_ROUTE(campaignId), {
      params: { page, limit },
    });
    return response.data;
  },

  async getUserCompanionCampaigns(userId, page = 0, limit = 20) {
    const response = await apiClient.get(GET_USER_COMPANION_CAMPAIGNS_ROUTE(userId), {
      params: { page, limit },
    });
    return response.data;
  },

  async checkIsCompanion(campaignId, userId) {
    try {
      const response = await this.getCampaignCompanions(campaignId);
      return response.companions.some(c => c.user._id === userId);
    } catch (error) {
      return false;
    }
  },
};

