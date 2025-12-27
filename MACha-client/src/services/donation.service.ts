import apiClient from '@/lib/api-client';
import { GET_DONATIONS_BY_CAMPAIGN_ROUTE } from '@/constants/api';

export interface Donor {
  _id: string;
  username: string;
  fullname?: string;
  avatar_url?: string;
}

export interface Donation {
  _id: string;
  campaign: string;
  donor: Donor | string;
  amount: number;
  currency: string;
  donation_method: 'bank_transfer' | 'crypto' | 'cash' | 'sepay';
  payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  is_anonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export const donationService = {
  async getDonationsByCampaign(campaignId: string): Promise<Donation[]> {
    const response = await apiClient.get(GET_DONATIONS_BY_CAMPAIGN_ROUTE(campaignId));
    return response.data;
  },
};

