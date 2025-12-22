import apiClient from '@/lib/api-client';
import {
  GET_PENDING_KYC_ROUTE,
  GET_KYC_DETAILS_ROUTE,
  APPROVE_KYC_ROUTE,
  REJECT_KYC_ROUTE,
} from '@/constants/api';

export interface KYCUser {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  identity_verified_name?: string;
  identity_card_last4?: string;
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  kyc_submitted_at?: string;
  kyc_verified_at?: string;
  kyc_rejection_reason?: string;
  kyc_documents?: {
    identity_front_url?: string;
    identity_back_url?: string;
    selfie_url?: string;
    tax_document_url?: string;
    bank_statement_url?: string;
  };
  address?: {
    city?: string;
    district?: string;
  };
  bank_account?: {
    bank_name?: string;
    account_number_last4?: string;
    account_holder_name?: string;
  };
}

export interface KYCDetails {
  user: {
    _id: string;
    username: string;
    email: string;
    fullname?: string;
    kyc_status: string;
  };
  kyc_info: {
    identity_verified_name?: string;
    identity_card_last4?: string;
    tax_code?: string;
    address?: {
      city?: string;
      district?: string;
    };
    bank_account?: {
      bank_name?: string;
      account_number_last4?: string;
      account_holder_name?: string;
    };
    kyc_documents?: {
      identity_front_url?: string;
      identity_back_url?: string;
      selfie_url?: string;
      tax_document_url?: string;
      bank_statement_url?: string;
    };
    kyc_submitted_at?: string;
    kyc_verified_at?: string;
    kyc_rejection_reason?: string;
  };
}

export const getPendingKYCs = async (): Promise<KYCUser[]> => {
  try {
    const response = await apiClient.get(GET_PENDING_KYC_ROUTE, { withCredentials: true });
    return response.data.users || [];
  } catch (error) {
    console.error('Error fetching pending KYCs:', error);
    throw error;
  }
};

export const getKYCDetails = async (userId: string): Promise<KYCDetails> => {
  try {
    const response = await apiClient.get(GET_KYC_DETAILS_ROUTE(userId), { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching KYC details:', error);
    throw error;
  }
};

export const approveKYC = async (userId: string): Promise<KYCUser> => {
  try {
    const response = await apiClient.post(APPROVE_KYC_ROUTE(userId), {}, { withCredentials: true });
    return response.data.user;
  } catch (error) {
    console.error('Error approving KYC:', error);
    throw error;
  }
};

export const rejectKYC = async (userId: string, reason: string): Promise<KYCUser> => {
  try {
    const response = await apiClient.post(
      REJECT_KYC_ROUTE(userId),
      { reason },
      { withCredentials: true }
    );
    return response.data.user;
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    throw error;
  }
};

