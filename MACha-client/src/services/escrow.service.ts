import apiClient from '@/lib/api-client';
import {
  CREATE_WITHDRAWAL_REQUEST_ROUTE,
  GET_WITHDRAWAL_REQUESTS_BY_CAMPAIGN_ROUTE,
  GET_WITHDRAWAL_REQUEST_BY_ID_ROUTE,
  SUBMIT_VOTE_ROUTE,
  GET_VOTES_BY_ESCROW_ROUTE,
} from '@/constants/api';

export type WithdrawalRequestStatus =
  | 'pending_voting'
  | 'voting_in_progress'
  | 'voting_completed'
  | 'admin_approved'
  | 'admin_rejected'
  | 'released'
  | 'cancelled';

export interface User {
  _id: string;
  username: string;
  fullname?: string;
  email?: string;
  avatar?: string;
}

export interface Campaign {
  _id: string;
  title: string;
  goal_amount: number;
  current_amount: number;
  creator: string | User;
}

export interface VotingResults {
  totalVotes: number;
  approveCount: number;
  rejectCount: number;
  totalApproveWeight: number;
  totalRejectWeight: number;
  approvePercentage: string;
  rejectPercentage: string;
}

export interface Escrow {
  _id: string;
  campaign: string | Campaign;
  total_amount: number;
  remaining_amount: number;
  withdrawal_request_amount: number;
  requested_by: string | User;
  request_reason: string | null;
  request_status: WithdrawalRequestStatus;
  voting_start_date: string | null;
  voting_end_date: string | null;
  admin_reviewed_by: string | User | null;
  admin_reviewed_at: string | null;
  admin_rejection_reason: string | null;
  auto_created: boolean;
  milestone_percentage: number | null;
  approved_at: string | null;
  released_at: string | null;
  createdAt: string;
  updatedAt: string;
  votingResults?: VotingResults;
}

export interface CreateWithdrawalRequestPayload {
  withdrawal_request_amount: number;
  request_reason: string;
}

export interface Vote {
  _id: string;
  escrow: string;
  donor: string | User;
  value: 'approve' | 'reject';
  donated_amount: number;
  vote_weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitVotePayload {
  value: 'approve' | 'reject';
}

export interface CreateWithdrawalRequestResponse {
  message: string;
  escrow: Escrow;
}

export interface GetWithdrawalRequestsResponse {
  escrows: Escrow[];
  count: number;
}

export interface GetWithdrawalRequestResponse {
  escrow: Escrow;
}

export interface SubmitVoteResponse {
  message: string;
  vote: Vote;
}

export interface GetVotesResponse {
  votes: Vote[];
  count: number;
}

export const escrowService = {
  /**
   * Tạo withdrawal request cho một campaign
   */
  async createWithdrawalRequest(
    campaignId: string,
    payload: CreateWithdrawalRequestPayload
  ): Promise<Escrow> {
    try {
      const response = await apiClient.post<CreateWithdrawalRequestResponse>(
        CREATE_WITHDRAWAL_REQUEST_ROUTE(campaignId),
        payload
      );
      return response.data.escrow;
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách withdrawal requests của một campaign
   */
  async getWithdrawalRequestsByCampaign(
    campaignId: string,
    status?: WithdrawalRequestStatus
  ): Promise<Escrow[]> {
    try {
      const response = await apiClient.get<GetWithdrawalRequestsResponse>(
        GET_WITHDRAWAL_REQUESTS_BY_CAMPAIGN_ROUTE(campaignId),
        {
          params: status ? { status } : undefined,
        }
      );
      return response.data.escrows;
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết một withdrawal request theo ID
   */
  async getWithdrawalRequestById(escrowId: string): Promise<Escrow> {
    try {
      const response = await apiClient.get<GetWithdrawalRequestResponse>(
        GET_WITHDRAWAL_REQUEST_BY_ID_ROUTE(escrowId)
      );
      return response.data.escrow;
    } catch (error: any) {
      console.error('Error fetching withdrawal request:', error);
      throw error;
    }
  },

  /**
   * Submit vote cho một withdrawal request
   */
  async submitVote(
    escrowId: string,
    payload: SubmitVotePayload
  ): Promise<Vote> {
    try {
      const response = await apiClient.post<SubmitVoteResponse>(
        SUBMIT_VOTE_ROUTE(escrowId),
        payload
      );
      return response.data.vote;
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách votes của một withdrawal request
   */
  async getVotesByEscrow(escrowId: string): Promise<Vote[]> {
    try {
      const response = await apiClient.get<GetVotesResponse>(
        GET_VOTES_BY_ESCROW_ROUTE(escrowId)
      );
      return response.data.votes;
    } catch (error: any) {
      console.error('Error fetching votes:', error);
      throw error;
    }
  },
};

