import apiClient from '@/lib/api-client';
import {
  GET_ALL_CAMPAIGNS_ROUTE,
  GET_CAMPAIGN_BY_ID_ROUTE,
  GET_PENDING_CAMPAIGNS_ROUTE,
  APPROVE_CAMPAIGN_ROUTE,
  REJECT_CAMPAIGN_ROUTE,
} from '@/constants/api';
import { Milestone } from '../campaign.service';

export interface Campaign {
  _id: string;
  creator: {
    _id: string;
    username: string;
    email?: string;
    avatar?: string;
    fullname?: string;
  };
  title: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  start_date: string;
  end_date?: string;
  status: 'pending' | 'active' | 'rejected' | 'completed' | 'cancelled';
  category: string;
  proof_documents_url?: string;
  media_url?: string[];
  rejection_reason?: string;
  approved_at?: string;
  rejected_at?: string;
  milestones?: Milestone[];
  approved_by?: string;
  rejected_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetCampaignsResponse {
  campaigns: Campaign[];
  count?: number;
}

export const getAllCampaigns = async (limit: number = 10000): Promise<Campaign[]> => {
  try {
    // Fetch with a large limit to get all campaigns for admin dashboard
    const response = await apiClient.get(GET_ALL_CAMPAIGNS_ROUTE, { 
      params: { page: 0, limit },
      withCredentials: true 
    });
    return response.data.campaigns || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
};

export const getCampaignById = async (id: string): Promise<Campaign> => {
  try {
    const response = await apiClient.get(GET_CAMPAIGN_BY_ID_ROUTE(id), { withCredentials: true });
    return response.data.campaign;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    throw error;
  }
};

export const getPendingCampaigns = async (): Promise<Campaign[]> => {
  try {
    const response = await apiClient.get(GET_PENDING_CAMPAIGNS_ROUTE, { withCredentials: true });
    return response.data.campaigns || [];
  } catch (error) {
    console.error('Error fetching pending campaigns:', error);
    throw error;
  }
};

export const approveCampaign = async (id: string): Promise<Campaign> => {
  try {
    const response = await apiClient.post(APPROVE_CAMPAIGN_ROUTE(id), {}, { withCredentials: true });
    return response.data.campaign;
  } catch (error) {
    console.error('Error approving campaign:', error);
    throw error;
  }
};

export const rejectCampaign = async (id: string, reason: string): Promise<Campaign> => {
  try {
    const response = await apiClient.post(
      REJECT_CAMPAIGN_ROUTE(id),
      { reason },
      { withCredentials: true }
    );
    return response.data.campaign;
  } catch (error) {
    console.error('Error rejecting campaign:', error);
    throw error;
  }
};

