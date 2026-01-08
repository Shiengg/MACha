import apiClient from '@/lib/api-client';
import { 
  GET_KYC_STATUS_ROUTE, 
  SUBMIT_KYC_ROUTE, 
  SUBMIT_KYC_VNPT_ROUTE,
  VNPT_VERIFY_QUALITY_ROUTE,
  VNPT_OCR_ROUTE,
  VNPT_COMPARE_FACES_ROUTE
} from '@/constants/api';

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

export interface SubmitKYCVNPTPayload {
  kyc_documents: {
    identity_front_url: string;
    identity_back_url?: string;
    selfie_url?: string;
  };
  identity_card_number?: string;
  identity_verified_name?: string;
  tax_code?: string;
  address?: {
    city: string;
    district: string;
    ward?: string;
  };
  bank_account?: {
    bank_name: string;
    account_number: string;
    account_holder_name: string;
  };
}

export interface VNPTVerifyQualityResponse {
  success: boolean;
  card_type: string;
  is_real: boolean;
  liveness_msg: string;
  message: string;
}

export interface VNPTOCRResponse {
  success: boolean;
  extracted_data: {
    identity_card_number: string;
    identity_verified_name: string;
    date_of_birth: string;
    gender: string;
    address: string;
    issue_date: string;
    issue_location: string;
    [key: string]: any;
  };
  confidence: number;
  warnings: string[];
  warning_messages: string[];
  message: string;
}

export interface VNPTCompareFacesResponse {
  success: boolean;
  similarity: number;
  probability: number;
  is_match: boolean;
  result_text: string;
  message: string;
}

export const kycService = {
  async getKYCStatus(): Promise<KYCStatus> {
    const response = await apiClient.get(GET_KYC_STATUS_ROUTE);
    return response.data;
  },

  async submitKYC(payload: SubmitKYCPayload): Promise<void> {
    await apiClient.post(SUBMIT_KYC_ROUTE, payload);
  },

  async submitKYCWithVNPT(payload: SubmitKYCVNPTPayload): Promise<any> {
    const response = await apiClient.post(SUBMIT_KYC_VNPT_ROUTE, payload);
    return response.data;
  },

  async verifyDocumentQuality(imageUrl: string): Promise<VNPTVerifyQualityResponse> {
    console.log('📤 [Client KYC Service] Sending verify quality request');
    console.log('   - Type:', typeof imageUrl);
    console.log('   - Value:', imageUrl);
    const response = await apiClient.post(VNPT_VERIFY_QUALITY_ROUTE, { imageUrl });
    return response.data;
  },

  async ocrDocument(frontImageUrl: string, backImageUrl?: string): Promise<VNPTOCRResponse> {
    console.log('📤 [Client KYC Service] Sending OCR request');
    console.log('   - Front type:', typeof frontImageUrl);
    console.log('   - Front value:', frontImageUrl);
    if (backImageUrl) {
      console.log('   - Back type:', typeof backImageUrl);
      console.log('   - Back value:', backImageUrl);
    }
    const response = await apiClient.post(VNPT_OCR_ROUTE, { 
      frontImageUrl, 
      backImageUrl 
    });
    return response.data;
  },

  async compareFaces(faceImage1: string, faceImage2: string): Promise<VNPTCompareFacesResponse> {
    const response = await apiClient.post(VNPT_COMPARE_FACES_ROUTE, { 
      faceImage1, 
      faceImage2 
    });
    return response.data;
  },
};

