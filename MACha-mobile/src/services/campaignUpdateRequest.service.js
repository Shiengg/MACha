import apiClient from './apiClient';
import {
  CREATE_CAMPAIGN_UPDATE_REQUEST_ROUTE,
  GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE,
} from '../constants/api';

export const campaignUpdateRequestService = {
  /**
   * Creator: Gửi request chỉnh sửa campaign
   */
  async createUpdateRequest(campaignId, payload) {
    const response = await apiClient.post(
      CREATE_CAMPAIGN_UPDATE_REQUEST_ROUTE(campaignId),
      payload
    );
    return response.data.updateRequest;
  },

  /**
   * Creator: Lấy danh sách update requests của campaign
   */
  async getUpdateRequestsByCampaign(campaignId) {
    const response = await apiClient.get(
      GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE(campaignId)
    );
    return response.data.requests || [];
  },
};

export default campaignUpdateRequestService;

