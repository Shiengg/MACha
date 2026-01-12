import apiClient from './apiClient';
import {
  GET_KYC_STATUS_ROUTE,
  SUBMIT_KYC_VNPT_ROUTE,
  VNPT_VERIFY_QUALITY_ROUTE,
  VNPT_OCR_ROUTE,
  VNPT_COMPARE_FACES_ROUTE,
} from '../constants/api';

export const kycService = {
  async getKYCStatus() {
    const response = await apiClient.get(GET_KYC_STATUS_ROUTE);
    return response.data;
  },

  async submitKYCWithVNPT(payload) {
    try {
      const response = await apiClient.post(SUBMIT_KYC_VNPT_ROUTE, payload);
      return response.data;
    } catch (error) {
      console.error('Error submitting KYC with VNPT:', error);
      throw error;
    }
  },

  async verifyDocumentQuality(imageUrl) {
    try {
      const response = await apiClient.post(VNPT_VERIFY_QUALITY_ROUTE, { imageUrl });
      return response.data;
    } catch (error) {
      console.error('Error verifying document quality:', error);
      throw error;
    }
  },

  async ocrDocument(frontImageUrl, backImageUrl) {
    try {
      const response = await apiClient.post(VNPT_OCR_ROUTE, {
        frontImageUrl,
        backImageUrl,
      });
      return response.data;
    } catch (error) {
      console.error('Error performing OCR:', error);
      throw error;
    }
  },

  async compareFaces(faceImage1, faceImage2) {
    try {
      const response = await apiClient.post(VNPT_COMPARE_FACES_ROUTE, {
        faceImage1,
        faceImage2,
      });
      return response.data;
    } catch (error) {
      console.error('Error comparing faces:', error);
      throw error;
    }
  },
};

