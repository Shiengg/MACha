import apiClient from '@/lib/api-client';
import {
  JOIN_CAMPAIGN_COMPANION_ROUTE,
  LEAVE_CAMPAIGN_COMPANION_ROUTE,
  GET_CAMPAIGN_COMPANIONS_ROUTE,
  GET_USER_COMPANION_CAMPAIGNS_ROUTE
} from '@/constants/api';

export interface Companion {
  _id: string;
  user: {
    _id: string;
    username: string;
    fullname: string;
    avatar?: string;
  };
  campaign?: {
    _id: string;
    title: string;
  };
  joined_at: string;
  is_active: boolean;
}

export interface CompanionCampaign {
  _id: string;
  title: string;
  banner_image: string;
  current_amount: number;
  goal_amount: number;
  status: string;
  creator: {
    _id: string;
    username: string;
    fullname: string;
  };
  joined_at: string;
}

export interface CompanionsResponse {
  companions: Companion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompanionCampaignsResponse {
  campaigns: CompanionCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const campaignCompanionService = {
  async joinCampaign(campaignId: string): Promise<Companion> {
    const response = await apiClient.post(
      JOIN_CAMPAIGN_COMPANION_ROUTE(campaignId),
      {},
      { withCredentials: true }
    );
    return response.data.companion;
  },

  async leaveCampaign(campaignId: string): Promise<void> {
    await apiClient.delete(
      LEAVE_CAMPAIGN_COMPANION_ROUTE(campaignId),
      { withCredentials: true }
    );
  },

  async getCampaignCompanions(
    campaignId: string,
    page: number = 0,
    limit: number = 20
  ): Promise<CompanionsResponse> {
    const response = await apiClient.get(
      GET_CAMPAIGN_COMPANIONS_ROUTE(campaignId),
      {
        params: { page, limit },
        withCredentials: true
      }
    );
    return response.data;
  },

  async getUserCompanionCampaigns(
    userId: string,
    page: number = 0,
    limit: number = 20
  ): Promise<CompanionCampaignsResponse> {
    const response = await apiClient.get(
      GET_USER_COMPANION_CAMPAIGNS_ROUTE(userId),
      {
        params: { page, limit },
        withCredentials: true
      }
    );
    return response.data;
  },

  async checkIsCompanion(campaignId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.getCampaignCompanions(campaignId);
      return response.companions.some(c => c.user._id === userId);
    } catch (error) {
      return false;
    }
  }
};

