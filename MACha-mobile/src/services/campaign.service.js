import apiClient from './apiClient';
import { cacheService } from './cache.service';
import {
  GET_ALL_CAMPAIGNS_ROUTE,
  GET_CAMPAIGN_BY_ID_ROUTE,
  GET_CAMPAIGNS_BY_CATEGORY_ROUTE,
  GET_ACTIVE_CATEGORIES_ROUTE,
  CREATE_CAMPAIGN_ROUTE,
  CREATE_CAMPAIGN_UPDATE_ROUTE,
  GET_CAMPAIGN_UPDATES_ROUTE,
  DELETE_CAMPAIGN_UPDATE_ROUTE,
  SEARCH_CAMPAIGNS_BY_TITLE_ROUTE,
  SEARCH_CAMPAIGNS_BY_HASHTAG_ROUTE,
} from '../constants/api';

export const campaignService = {
  async getAllCampaigns(page = 0, limit = 20) {
    const cacheKey = `campaigns:all:${page}:${limit}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await apiClient.get(GET_ALL_CAMPAIGNS_ROUTE, {
      params: { page, limit },
    });
    const result = {
      campaigns: response.data.campaigns || [],
      total: response.data.total || 0,
      page: response.data.page || page,
      limit: response.data.limit || limit,
      totalPages: response.data.totalPages || 0,
    };
    cacheService.set(cacheKey, result, 3 * 60 * 1000); // Cache for 3 minutes
    return result;
  },

  async getCampaignById(id) {
    if (!id) return null;
    
    const cacheKey = `campaign:${id}`;
    
    // Use getOrSetPending to prevent duplicate requests
    return cacheService.getOrSetPending(
      cacheKey,
      async () => {
        const response = await apiClient.get(GET_CAMPAIGN_BY_ID_ROUTE(id));
        return response.data.campaign || null;
      },
      5 * 60 * 1000 // Cache for 5 minutes
    );
  },

  async getCampaignsByCategory(category) {
    const response = await apiClient.get(GET_CAMPAIGNS_BY_CATEGORY_ROUTE, {
      params: { category },
    });
    return response.data.campaigns || [];
  },

  async getActiveCategories() {
    const response = await apiClient.get(GET_ACTIVE_CATEGORIES_ROUTE);
    return response.data.categories || [];
  },

  async createCampaign(payload) {
    const response = await apiClient.post(CREATE_CAMPAIGN_ROUTE, payload);
    return response.data.campaign;
  },

  async createCampaignUpdate(campaignId, payload) {
    const response = await apiClient.post(CREATE_CAMPAIGN_UPDATE_ROUTE(campaignId), payload);
    return response.data.update;
  },

  async getCampaignUpdates(campaignId) {
    const response = await apiClient.get(GET_CAMPAIGN_UPDATES_ROUTE(campaignId));
    return response.data.updates || [];
  },

  async deleteCampaignUpdate(updateId) {
    await apiClient.delete(DELETE_CAMPAIGN_UPDATE_ROUTE(updateId));
  },

  async getAvailableAmount(campaignId) {
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
    } catch (error) {
      console.error('Error calculating available amount:', error);
      throw error;
    }
  },

  async searchCampaignsByTitle(query, limit) {
    try {
      const normalizedSearch = (query || '').toLowerCase().trim();
      const response = await apiClient.get(SEARCH_CAMPAIGNS_BY_TITLE_ROUTE, {
        params: { q: normalizedSearch, ...(limit ? { limit } : {}) },
      });
      return response.data?.campaigns || [];
    } catch (error) {
      console.error('Error searching campaigns by title:', error);
      throw error;
    }
  },

  async searchCampaignsByHashtag(hashtag) {
    try {
      const normalizedHashtag = (hashtag || '').toLowerCase().trim();
      const response = await apiClient.get(SEARCH_CAMPAIGNS_BY_HASHTAG_ROUTE, {
        params: { hashtag: normalizedHashtag },
      });
      return response.data?.campaigns || [];
    } catch (error) {
      console.error('Error searching campaigns by hashtag:', error);
      throw error;
    }
  },
};

