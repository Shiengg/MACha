import apiClient from '@/lib/api-client';
import {
  CREATE_CAMPAIGN_ROUTE,
  GET_ALL_CAMPAIGNS_ROUTE,
  GET_CAMPAIGNS_FOR_MAP_ROUTE,
  GET_CAMPAIGN_MAP_STATISTICS_ROUTE,
  GET_CAMPAIGN_BY_ID_ROUTE,
  UPDATE_CAMPAIGN_ROUTE,
  DELETE_CAMPAIGN_ROUTE,
  CANCEL_CAMPAIGN_ROUTE,
  GET_CAMPAIGNS_BY_CATEGORY_ROUTE,
  SEARCH_CAMPAIGNS_BY_HASHTAG_ROUTE,
  SEARCH_CAMPAIGNS_BY_TITLE_ROUTE,
  GET_ACTIVE_CATEGORIES_ROUTE,
  GET_CAMPAIGNS_BY_CREATOR_ROUTE,
  GET_CAMPAIGNS_BY_CREATOR_PAGINATED_ROUTE,
  CREATE_CAMPAIGN_UPDATE_ROUTE,
  GET_CAMPAIGN_UPDATES_ROUTE,
  DELETE_CAMPAIGN_UPDATE_ROUTE,
} from '@/constants/api';

export interface Campaign {
  _id: string;
  creator: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
    role?: string;
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
  milestones?: Milestone[];
  expected_timeline?: TimelineItem[];
  approved_by?: string;
  rejected_by?: string;
  rejection_reason?: string;
  approved_at?: string;
  rejected_at?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  hashtag?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  // Escrow-related fields
  available_amount?: number; // Số tiền có thể rút (current_amount - total released amount)
  // Donation-related fields
  completed_donations_count?: number; // Số lượng donation đã hoàn thành
  // Location for map
  location?: {
    location_name: string;
    latitude: number;
    longitude: number;
  };
}

export interface Milestone {
  percentage: number;
  commitment_days: number;
  commitment_description: string;
}

export interface TimelineItem {
  month: string;
  description: string;
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
  milestones: Milestone[];
  expected_timeline?: TimelineItem[];
  hashtag?: string; // Single hashtag name
  location_name?: string; // Location name for map (e.g., "Hốc Môn, HCM")
}

export interface UpdateCampaignPayload {
  // Contact Information
  contact_info?: {
    fullname?: string;
    phone?: string;
    email?: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      website?: string;
    };
    address?: string;
  };
  // Campaign Information
  title?: string;
  description?: string;
  goal_amount?: number;
  start_date?: string;
  end_date?: string;
  category?: string;
  banner_image?: string;
  gallery_images?: string[];
  proof_documents_url?: string;
  milestones?: Milestone[];
  expected_timeline?: TimelineItem[];
  hashtag?: string;
  location_name?: string;
}

export interface CategoryWithCount {
  category: string;
  count: number;
}

export interface CampaignUpdate {
  _id: string;
  campaign: string;
  creator: {
    _id: string;
    username: string;
    fullname?: string;
    avatar_url?: string;
  };
  content?: string;
  image_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignUpdatePayload {
  content?: string;
  image_url?: string;
}

export const campaignService = {
  async createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
    const response = await apiClient.post(CREATE_CAMPAIGN_ROUTE, payload);
    return response.data.campaign;
  },

  async getAllCampaigns(
    page: number = 0, 
    limit: number = 20, 
    status?: string | null
  ): Promise<{ campaigns: Campaign[]; total: number; page: number; limit: number; totalPages: number }> {
    const params: { page: number; limit: number; status?: string } = { page, limit };
    if (status) {
      params.status = status;
    }
    
    const response = await apiClient.get(GET_ALL_CAMPAIGNS_ROUTE, {
      params,
    });
    return {
      campaigns: response.data.campaigns,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages
    };
  },

  /**
   * Get campaign by ID
   * Note: If user is authenticated, this will automatically track the campaign
   * in their recently_viewed_campaigns (max 10, maintained on server)
   */
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

  async searchCampaignsByHashtag(hashtag: string): Promise<Campaign[]> {
    const response = await apiClient.get(SEARCH_CAMPAIGNS_BY_HASHTAG_ROUTE, {
      params: { hashtag },
    });
    return response.data.campaigns;
  },

  async searchCampaignsByTitle(query: string, limit?: number): Promise<Campaign[]> {
    const response = await apiClient.get(SEARCH_CAMPAIGNS_BY_TITLE_ROUTE, {
      params: { q: query, ...(limit && { limit }) },
    });
    return response.data.campaigns;
  },

  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    const response = await apiClient.get(GET_CAMPAIGNS_BY_CREATOR_ROUTE, {
      params: { creatorId },
    });
    return response.data.campaigns;
  },

  async getCampaignsByCreatorPaginated(
    creatorId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    campaigns: Campaign[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  }> {
    const response = await apiClient.get(GET_CAMPAIGNS_BY_CREATOR_PAGINATED_ROUTE, {
      params: { creatorId, page, limit },
    });
    return response.data;
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

  async createCampaignUpdate(campaignId: string, payload: CreateCampaignUpdatePayload): Promise<CampaignUpdate> {
    const response = await apiClient.post(CREATE_CAMPAIGN_UPDATE_ROUTE(campaignId), payload);
    return response.data.update;
  },

  async getCampaignUpdates(campaignId: string): Promise<CampaignUpdate[]> {
    const response = await apiClient.get(GET_CAMPAIGN_UPDATES_ROUTE(campaignId));
    return response.data.updates;
  },

  async deleteCampaignUpdate(updateId: string): Promise<void> {
    await apiClient.delete(DELETE_CAMPAIGN_UPDATE_ROUTE(updateId));
  },

  async getAvailableAmount(campaignId: string): Promise<number> {
    try {

      const { escrowService } = await import('./escrow.service');
      
      const campaign = await this.getCampaignById(campaignId);
      
      const releasedRequests = await escrowService.getWithdrawalRequestsByCampaign(
        campaignId,
        'released'
      );
      
      const totalReleased = releasedRequests.reduce(
        (sum, request) => sum + (request.withdrawal_request_amount || 0),
        0
      );
      
      return campaign.current_amount - totalReleased;
    } catch (error: any) {
      console.error('Error calculating available amount:', error);
      throw error;
    }
  },

  async getCampaignsForMap(): Promise<Campaign[]> {
    const response = await apiClient.get(GET_CAMPAIGNS_FOR_MAP_ROUTE);
    return response.data.campaigns;
  },

  async getCampaignMapStatistics(): Promise<{
    active: number;
    completed: number;
    finished: number;
    total: number;
  }> {
    const response = await apiClient.get(GET_CAMPAIGN_MAP_STATISTICS_ROUTE);
    return response.data;
  },
};

