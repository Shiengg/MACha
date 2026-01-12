import apiClient from './apiClient';
import { GET_KYC_STATUS_ROUTE } from '../constants/api';

export const kycService = {
  async getKYCStatus() {
    const response = await apiClient.get(GET_KYC_STATUS_ROUTE);
    return response.data;
  },
};

