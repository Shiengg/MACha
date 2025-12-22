import apiClient from '@/lib/api-client';
import { GET_KYC_STATUS_ROUTE, SUBMIT_KYC_ROUTE } from '@/constants/api';

export interface KYCStatus {
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  kyc_submitted_at?: string;
  kyc_verified_at?: string;
  kyc_rejection_reason?: string;
  identity_verified_name?: string;
  identity_card_last4?: string;
}

export interface SubmitKYCPayload {
  identity_card_number: string;
  identity_verified_name: string;
  tax_code?: string;
  address: {
    city: string;
    district: string;
  };
  bank_account: {
    bank_name: string;
    account_number: string;
    account_holder_name: string;
  };
}

export const kycService = {
  async getKYCStatus(): Promise<KYCStatus> {
    const response = await apiClient.get(GET_KYC_STATUS_ROUTE);
    return response.data;
  },

  async submitKYC(payload: SubmitKYCPayload): Promise<void> {
    await apiClient.post(SUBMIT_KYC_ROUTE, payload);
  },
};

