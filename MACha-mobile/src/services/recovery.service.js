import apiClient from './apiClient';
import {
  GET_RECOVERY_CASES_BY_CREATOR_ROUTE,
  GET_RECOVERY_CASE_BY_ID_ROUTE,
  INIT_SEPAY_RECOVERY_PAYMENT_ROUTE,
} from '../constants/api';

export const recoveryService = {
  async getRecoveryCasesByCreator() {
    const response = await apiClient.get(GET_RECOVERY_CASES_BY_CREATOR_ROUTE);
    return response.data;
  },

  async getRecoveryCaseById(recoveryCaseId) {
    const response = await apiClient.get(GET_RECOVERY_CASE_BY_ID_ROUTE(recoveryCaseId));
    return response.data;
  },

  async initSepayRecoveryPayment(recoveryCaseId, paymentMethod = 'BANK_TRANSFER') {
    const response = await apiClient.post(
      INIT_SEPAY_RECOVERY_PAYMENT_ROUTE(recoveryCaseId),
      { paymentMethod }
    );
    return response.data;
  },
};

