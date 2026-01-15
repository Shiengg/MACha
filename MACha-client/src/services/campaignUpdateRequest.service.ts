import apiClient from '@/lib/api-client';
import {
  CREATE_CAMPAIGN_UPDATE_REQUEST_ROUTE,
  GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE,
  ADMIN_GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE,
  ADMIN_GET_CAMPAIGN_UPDATE_REQUEST_BY_ID_ROUTE,
  ADMIN_APPROVE_CAMPAIGN_UPDATE_REQUEST_ROUTE,
  ADMIN_REJECT_CAMPAIGN_UPDATE_REQUEST_ROUTE,
} from '@/constants/api';

export interface CampaignUpdateRequest {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    status: string;
    banner_image?: string;
    gallery_images?: string[];
    description?: string;
    end_date?: string;
  };
  creator: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
    email?: string;
  };
  requested_changes: {
    banner_image?: string;
    gallery_images?: string[];
    description?: string;
    end_date?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  reviewed_by?: {
    _id: string;
    username: string;
    fullname?: string;
  };
  reviewed_at?: string;
  createdAt: string;
  updatedAt: string;
  comparison?: {
    banner_image: { before: string; after: string };
    gallery_images: { before: string[]; after: string[] };
    description: { before: string; after: string };
    end_date: { before: string | null; after: string | null };
  };
}

export interface CreateUpdateRequestPayload {
  requested_changes: {
    banner_image?: string;
    gallery_images?: string[];
    description?: string;
    end_date?: string;
  };
}

export const campaignUpdateRequestService = {
  /**
   * Creator: Gửi request chỉnh sửa campaign
   */
  async createUpdateRequest(campaignId: string, payload: CreateUpdateRequestPayload): Promise<CampaignUpdateRequest> {
    const response = await apiClient.post(
      CREATE_CAMPAIGN_UPDATE_REQUEST_ROUTE(campaignId),
      payload
    );
    return response.data.updateRequest;
  },

  /**
   * Creator: Lấy danh sách update requests của campaign
   */
  async getUpdateRequestsByCampaign(campaignId: string): Promise<CampaignUpdateRequest[]> {
    const response = await apiClient.get(
      GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE(campaignId)
    );
    return response.data.requests;
  },

  /**
   * Admin: Lấy danh sách update requests (filter theo status)
   */
  async getUpdateRequests(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<CampaignUpdateRequest[]> {
    const response = await apiClient.get(ADMIN_GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE, {
      params: { status }
    });
    return response.data.requests;
  },

  /**
   * Admin: Lấy chi tiết một update request
   */
  async getUpdateRequestById(requestId: string): Promise<CampaignUpdateRequest> {
    const response = await apiClient.get(
      ADMIN_GET_CAMPAIGN_UPDATE_REQUEST_BY_ID_ROUTE(requestId)
    );
    return response.data.request;
  },

  /**
   * Admin: Duyệt update request
   */
  async approveUpdateRequest(requestId: string): Promise<{ updateRequest: CampaignUpdateRequest; campaign: any }> {
    const response = await apiClient.post(
      ADMIN_APPROVE_CAMPAIGN_UPDATE_REQUEST_ROUTE(requestId)
    );
    return response.data;
  },

  /**
   * Admin: Từ chối update request
   */
  async rejectUpdateRequest(requestId: string, adminNote?: string): Promise<CampaignUpdateRequest> {
    const response = await apiClient.post(
      ADMIN_REJECT_CAMPAIGN_UPDATE_REQUEST_ROUTE(requestId),
      { admin_note: adminNote }
    );
    return response.data.updateRequest;
  },
};

export default campaignUpdateRequestService;

