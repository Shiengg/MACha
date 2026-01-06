import apiClient from '@/lib/api-client';
import {
  GET_RECOVERY_CASES_BY_CREATOR_ROUTE,
  GET_RECOVERY_CASE_BY_ID_ROUTE,
  INIT_SEPAY_RECOVERY_PAYMENT_ROUTE,
} from '@/constants/api';

export interface RecoveryCase {
  _id: string;
  campaign: {
    _id: string;
    title: string;
  };
  creator: {
    _id: string;
    username: string;
    email: string;
    fullname?: string;
  };
  total_amount: number;
  recovered_amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'legal_action';
  deadline: string;
  recovery_method: 'voluntary' | 'legal' | 'insurance';
  legal_case_id?: string;
  notes?: string;
  created_by?: {
    _id: string;
    username: string;
  };
  assigned_to?: {
    _id: string;
    username: string;
  };
  timeline: Array<{
    date: string;
    action: string;
    amount: number;
    notes?: string;
    created_by?: {
      _id: string;
      username: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export const recoveryService = {
  async getRecoveryCasesByCreator(): Promise<{ recoveryCases: RecoveryCase[] }> {
    const response = await apiClient.get(GET_RECOVERY_CASES_BY_CREATOR_ROUTE, {
      withCredentials: true,
    });
    return response.data;
  },

  async getRecoveryCaseById(recoveryCaseId: string): Promise<{ recoveryCase: RecoveryCase }> {
    const response = await apiClient.get(GET_RECOVERY_CASE_BY_ID_ROUTE(recoveryCaseId), {
      withCredentials: true,
    });
    return response.data;
  },

  async initSepayRecoveryPayment(
    recoveryCaseId: string,
    paymentMethod: string = "BANK_TRANSFER"
  ): Promise<{
    checkoutUrl: string;
    formFields: any;
    recoveryCase: {
      _id: string;
      total_amount: number;
      recovered_amount: number;
      remaining_amount: number;
    };
    paymentAmount: number;
  }> {
    const response = await apiClient.post(
      INIT_SEPAY_RECOVERY_PAYMENT_ROUTE(recoveryCaseId),
      { paymentMethod },
      { withCredentials: true }
    );
    return response.data;
  },
};

