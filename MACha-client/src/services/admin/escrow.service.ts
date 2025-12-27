import apiClient from '@/lib/api-client';
import {
  ADMIN_GET_WITHDRAWAL_REQUESTS_ROUTE,
  ADMIN_APPROVE_WITHDRAWAL_REQUEST_ROUTE,
  ADMIN_REJECT_WITHDRAWAL_REQUEST_ROUTE,
} from '@/constants/api';
import { Escrow, WithdrawalRequestStatus } from '../escrow.service';

export interface GetWithdrawalRequestsForReviewResponse {
  escrows: Escrow[];
  count: number;
}

export interface ApproveWithdrawalRequestResponse {
  message: string;
  escrow: Escrow;
}

export interface RejectWithdrawalRequestResponse {
  message: string;
  escrow: Escrow;
}

/**
 * Lấy danh sách withdrawal requests chờ admin review
 * @param status - Status filter (mặc định "voting_completed")
 * @returns Promise<Escrow[]>
 */
export const getWithdrawalRequestsForReview = async (
  status: WithdrawalRequestStatus = 'voting_completed'
): Promise<Escrow[]> => {
  try {
    const response = await apiClient.get<GetWithdrawalRequestsForReviewResponse>(
      ADMIN_GET_WITHDRAWAL_REQUESTS_ROUTE,
      {
        params: { status },
        withCredentials: true,
      }
    );
    return response.data.escrows || [];
  } catch (error: any) {
    console.error('Error fetching withdrawal requests for review:', error);
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể tải danh sách withdrawal requests';
    throw new Error(errorMessage);
  }
};

/**
 * Admin approve withdrawal request
 * @param escrowId - ID của withdrawal request
 * @returns Promise<Escrow>
 */
export const approveWithdrawalRequest = async (
  escrowId: string
): Promise<Escrow> => {
  try {
    const response = await apiClient.post<ApproveWithdrawalRequestResponse>(
      ADMIN_APPROVE_WITHDRAWAL_REQUEST_ROUTE(escrowId),
      {},
      {
        withCredentials: true,
      }
    );
    return response.data.escrow;
  } catch (error: any) {
    console.error('Error approving withdrawal request:', error);
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể approve withdrawal request';
    throw new Error(errorMessage);
  }
};

/**
 * Admin reject withdrawal request
 * @param escrowId - ID của withdrawal request
 * @param rejectionReason - Lý do từ chối
 * @returns Promise<Escrow>
 */
export const rejectWithdrawalRequest = async (
  escrowId: string,
  rejectionReason: string
): Promise<Escrow> => {
  try {
    const response = await apiClient.post<RejectWithdrawalRequestResponse>(
      ADMIN_REJECT_WITHDRAWAL_REQUEST_ROUTE(escrowId),
      { rejection_reason: rejectionReason },
      {
        withCredentials: true,
      }
    );
    return response.data.escrow;
  } catch (error: any) {
    console.error('Error rejecting withdrawal request:', error);
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể reject withdrawal request';
    throw new Error(errorMessage);
  }
};

