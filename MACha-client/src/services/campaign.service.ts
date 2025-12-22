import apiClient from '@/lib/api-client';
import {
  CREATE_CAMPAIGN_ROUTE,
  GET_ALL_CAMPAIGNS_ROUTE,
  GET_CAMPAIGN_BY_ID_ROUTE,
  UPDATE_CAMPAIGN_ROUTE,
  DELETE_CAMPAIGN_ROUTE,
  CANCEL_CAMPAIGN_ROUTE,
  GET_CAMPAIGNS_BY_CATEGORY_ROUTE,
  GET_ACTIVE_CATEGORIES_ROUTE,
  GET_CAMPAIGNS_BY_CREATOR_ROUTE,
} from '@/constants/api';

export interface Campaign {
  _id: string;
  creator: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  };
  contact_info: {
    fullname: string;
    phone: string;
    email: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      website?: string;
    };
    address: string;
  };
  title: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  start_date: string;
  end_date?: string;
  status: 'pending' | 'active' | 'rejected' | 'completed' | 'cancelled';
  category: string;
  banner_image: string;
  gallery_images?: string[];
  proof_documents_url: string;
  rejection_reason?: string;
  approved_at?: string;
  rejected_at?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  contact_info: {
    fullname: string;
    phone: string;
    email: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      website?: string;
    };
    address: string;
  };
  title: string;
  description?: string;
  goal_amount: number;
  start_date: string;
  end_date?: string;
  category: string;
  banner_image: string;
  gallery_images?: string[];
  proof_documents_url: string;
}

export interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  goal_amount?: number;
  end_date?: string;
  category?: string;
  banner_image?: string;
  gallery_images?: string[];
  proof_documents_url?: string;
}

export interface CategoryWithCount {
  category: string;
  count: number;
}

export const campaignService = {
  async createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
    const response = await apiClient.post(CREATE_CAMPAIGN_ROUTE, payload);
    return response.data.campaign;
  },

  async getAllCampaigns(): Promise<Campaign[]> {
    const response = await apiClient.get(GET_ALL_CAMPAIGNS_ROUTE);
    return response.data.campaigns;
  },

  async getCampaignById(id: string): Promise<Campaign> {
    const response = await apiClient.get(GET_CAMPAIGN_BY_ID_ROUTE(id));
    return response.data.campaign;
  },

  async getCampaignsByCategory(category: string): Promise<Campaign[]> {
    const response = await apiClient.get(GET_CAMPAIGNS_BY_CATEGORY_ROUTE, {
      params: { category },
    });
    return response.data.campaigns;
  },

  async getActiveCategories(): Promise<CategoryWithCount[]> {
    const response = await apiClient.get(GET_ACTIVE_CATEGORIES_ROUTE);
    return response.data.categories;
  },

  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    const response = await apiClient.get(GET_CAMPAIGNS_BY_CREATOR_ROUTE, {
      params: { creatorId },
    });
    return response.data.campaigns;
  },

  async updateCampaign(id: string, payload: UpdateCampaignPayload): Promise<Campaign> {
    const response = await apiClient.put(UPDATE_CAMPAIGN_ROUTE(id), payload);
    return response.data.campaign;
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiClient.delete(DELETE_CAMPAIGN_ROUTE(id));
  },

  async cancelCampaign(id: string, reason: string): Promise<Campaign> {
    const response = await apiClient.post(CANCEL_CAMPAIGN_ROUTE(id), { reason });
    return response.data.campaign;
  },
};

