import apiClient from './apiClient';
import {
  CREATE_WITHDRAWAL_REQUEST_ROUTE,
  GET_WITHDRAWAL_REQUESTS_BY_CAMPAIGN_ROUTE,
  GET_WITHDRAWAL_REQUEST_BY_ID_ROUTE,
  SUBMIT_VOTE_ROUTE,
  GET_VOTES_BY_ESCROW_ROUTE,
} from '../constants/api';

export const escrowService = {
  async createWithdrawalRequest(campaignId, payload) {
    const response = await apiClient.post(CREATE_WITHDRAWAL_REQUEST_ROUTE(campaignId), payload);
    return response.data.escrow;
  },

  async getWithdrawalRequestsByCampaign(campaignId, status) {
    const params = status ? { status } : {};
    const response = await apiClient.get(GET_WITHDRAWAL_REQUESTS_BY_CAMPAIGN_ROUTE(campaignId), {
      params,
    });
    return response.data.escrows || [];
  },

  async getWithdrawalRequestById(escrowId) {
    const response = await apiClient.get(GET_WITHDRAWAL_REQUEST_BY_ID_ROUTE(escrowId));
    return response.data.escrow;
  },

  async submitVote(escrowId, payload) {
    const response = await apiClient.post(SUBMIT_VOTE_ROUTE(escrowId), payload);
    return response.data.vote;
  },

  async getVotesByEscrow(escrowId) {
    const response = await apiClient.get(GET_VOTES_BY_ESCROW_ROUTE(escrowId));
    return response.data.votes || [];
  },
};

