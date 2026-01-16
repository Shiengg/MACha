import apiClient from "@/lib/api-client";
import {
  OWNER_DASHBOARD_ROUTE,
  OWNER_GET_USERS_ROUTE,
  OWNER_GET_ADMINS_ROUTE,
  OWNER_CREATE_ADMIN_ROUTE,
  OWNER_UPDATE_ADMIN_ROUTE,
  OWNER_DELETE_ADMIN_ROUTE,
  OWNER_BAN_ADMIN_ROUTE,
  OWNER_UNBAN_ADMIN_ROUTE,
  OWNER_FINANCIAL_OVERVIEW_ROUTE,
  OWNER_CAMPAIGN_FINANCIALS_ROUTE,
  OWNER_ADMIN_ACTIVITIES_ROUTE,
  OWNER_DONATIONS_ROUTE,
  OWNER_APPROVAL_HISTORY_ROUTE,
  OWNER_GET_ALL_USERS_ROUTE,
  OWNER_BAN_USER_ROUTE,
  OWNER_UNBAN_USER_ROUTE,
  OWNER_RESET_USER_KYC_ROUTE,
  OWNER_GET_USER_HISTORY_ROUTE,
  OWNER_GET_WITHDRAWAL_REQUESTS_ROUTE,
  OWNER_INIT_SEPAY_WITHDRAWAL_ROUTE,
  OWNER_GET_REFUNDS_ROUTE,
  OWNER_INIT_SEPAY_REFUND_ROUTE,
} from "@/constants/api";
import { Escrow } from "@/services/escrow.service";

export interface Refund {
  _id: string;
  campaign: {
    _id: string;
    title: string;
  };
  donation: {
    _id: string;
    order_invoice_number?: string;
    sepay_transaction_id?: string;
  };
  donor: {
    _id: string;
    username: string;
    email: string;
    fullname?: string;
  };
  original_amount: number;
  refunded_amount: number;
  refund_ratio: number;
  remaining_refund: number;
  refund_status: "pending" | "completed" | "failed" | "partial";
  refund_method: "escrow" | "recovery";
  refund_transaction_id?: string;
  refund_response_data?: any;
  refunded_at?: string;
  created_by?: {
    _id: string;
    username: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  avatar?: string;
  createdAt: string;
  is_verified?: boolean;
  is_banned?: boolean;
  stats?: {
    approvals: number;
    rejections: number;
    total: number;
  };
}

export interface DashboardData {
  overview: {
    users: number;
    admins: number;
    campaigns: number;
    events: number;
    donations: number;
    escrows: number;
    reports: number;
    kyc_submissions: number;
  };
  pending: {
    campaigns: number;
    events: number;
    reports: number;
    kyc: number;
  };
  active: {
    campaigns: number;
  };
  financial: {
    total_donated: number;
    total_released: number;
    total_pending: number;
  };
  approvals_rejections: {
    today: { approvals: number; rejections: number };
    week: { approvals: number; rejections: number };
    month: { approvals: number; rejections: number };
  };
  top_campaigns: Array<{
    campaignId: string;
    title: string;
    total: number;
    creator: string;
  }>;
  top_admins: Array<{
    adminId: string;
    username: string;
    total: number;
  }>;
  financial_by_time: Array<{
    month: string;
    donated: number;
    released: number;
  }>;
}

export interface FinancialOverview {
  donations: {
    total: number;
    count: number;
    by_method: Array<{ _id: string; total: number; count: number }>;
    by_month: Array<{ _id: { year: number; month: number }; total: number; count: number }>;
    by_day: Array<{ _id: { year: number; month: number; day: number }; total: number; count: number }>;
  };
  escrow: {
    total_released: number;
    released_count: number;
    by_month: Array<{ _id: { year: number; month: number }; total: number; count: number }>;
    pending_amount: number;
    pending_count: number;
  };
  net_flow: number;
}

export interface CampaignFinancial {
  campaign: {
    id: string;
    title: string;
    creator: {
      _id: string;
      username: string;
      fullname?: string;
    };
    goal_amount: number;
    current_amount: number;
    status: string;
    createdAt: string;
  };
  financials: {
    current_amount: number;
    total_donated: number;
    donation_count: number;
    total_released: number;
    release_count: number;
    pending_releases: number;
    pending_release_count: number;
    remaining: number;
  };
}

export interface AdminActivities {
  statistics: {
    campaign_approvals: number;
    campaign_rejections: number;
    event_approvals: number;
    event_rejections: number;
    kyc_approvals: number;
    kyc_rejections: number;
    report_resolutions: number;
    withdrawal_approvals: number;
    withdrawal_rejections: number;
    total_actions: number;
  };
  admin: {
    _id: string;
    username: string;
  } | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApprovalHistoryItem {
  type: string;
  action: string;
  item: any;
  admin: {
    _id: string;
    username: string;
    fullname?: string;
  };
  timestamp: string;
}

export interface GetAdminsFilters {
  page?: number;
  limit?: number;
}

export interface GetAdminsResponse {
  admins: Admin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateAdminData {
  username: string;
  email: string;
  password: string;
  fullname?: string;
  avatar?: string;
}

export interface CreateAdminResponse {
  message: string;
  admin: Admin;
}

export interface UpdateAdminData {
  fullname?: string;
  avatar?: string;
  bio?: string;
}

export interface UpdateAdminResponse {
  message: string;
  admin: Admin;
}

export interface GetFinancialOverviewFilters {
  startDate?: string;
  endDate?: string;
}

export interface GetCampaignFinancialsFilters {
  page?: number;
  limit?: number;
}

export interface GetCampaignFinancialsResponse {
  campaigns: CampaignFinancial[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GetAdminActivitiesFilters {
  adminId?: string;
  page?: number;
  limit?: number;
}

export interface GetApprovalHistoryFilters {
  type?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GetApprovalHistoryResponse {
  history: ApprovalHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OwnerDonation {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    creator: {
      _id: string;
      username: string;
      email: string;
      fullname?: string;
    };
  };
  donor: {
    _id: string;
    username: string;
    email: string;
    fullname?: string;
  };
  amount: number;
  currency: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  donation_method: 'bank_transfer' | 'cash' | 'sepay';
  sepay_payment_method?: string | null;
  payment_method: string;
  // Proof information
  has_proof?: boolean;
  proof_images?: string[];
  proof_status?: 'pending' | 'uploaded' | 'missing';
  proof_uploaded_at?: string | null;
  // Additional fields
  order_invoice_number?: string | null;
  sepay_transaction_id?: string | null;
  notes?: string | null;
  is_anonymous?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetOwnerDonationsFilters {
  campaignId?: string;
  campaignSearch?: string;
  creatorId?: string;
  donorId?: string;
  donorSearch?: string;
  fromDate?: string;
  toDate?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}

export interface GetOwnerDonationsResponse {
  donations: OwnerDonation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// User Management Interfaces
export interface User {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  avatar?: string;
  role: string;
  is_verified: boolean;
  kyc_status: string;
  is_banned: boolean;
  banned_at?: string;
  banned_by?: {
    _id: string;
    username: string;
    fullname?: string;
  };
  ban_reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetAllUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_banned?: boolean | string;
  kyc_status?: string;
}

export interface GetAllUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserHistoryItem {
  type: 'login' | 'donate' | 'post' | 'report';
  action: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  campaign?: any;
  payment_status?: string;
  donation_method?: string;
  post_id?: string;
  content_preview?: string;
  event?: any;
  is_hidden?: boolean;
  report_id?: string;
  reported_type?: string;
  reported_reason?: string;
  status?: string;
  resolution?: string;
  details?: string;
}

export interface GetUserHistoryResponse {
  success: boolean;
  user: {
    _id: string;
    username: string;
    email: string;
  };
  history: UserHistoryItem[];
  statistics: {
    total_donations: number;
    total_posts: number;
    total_reports: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const ownerService = {
  async getOwnerDashboard(): Promise<DashboardData> {
    const response = await apiClient.get(OWNER_DASHBOARD_ROUTE, { withCredentials: true });
    return response.data;
  },

  async getUsersForAdminCreation(): Promise<any[]> {
    const response = await apiClient.get(OWNER_GET_USERS_ROUTE, { withCredentials: true });
    return response.data.users || [];
  },

  async getAdmins(filters: GetAdminsFilters = {}): Promise<GetAdminsResponse> {
    const { page = 1, limit = 10 } = filters;
    const response = await apiClient.get(OWNER_GET_ADMINS_ROUTE, {
      params: { page, limit },
      withCredentials: true,
    });
    return response.data;
  },

  async createAdmin(adminData: { username: string; email: string; password: string; fullname?: string; avatar?: string }): Promise<CreateAdminResponse> {
    const response = await apiClient.post(
      OWNER_CREATE_ADMIN_ROUTE,
      adminData,
      { withCredentials: true }
    );
    return response.data;
  },

  async updateAdmin(adminId: string, data: UpdateAdminData): Promise<UpdateAdminResponse> {
    const response = await apiClient.put(
      OWNER_UPDATE_ADMIN_ROUTE(adminId),
      data,
      { withCredentials: true }
    );
    return response.data;
  },

  async deleteAdmin(adminId: string): Promise<void> {
    await apiClient.delete(OWNER_DELETE_ADMIN_ROUTE(adminId), { withCredentials: true });
  },

  async banAdmin(adminId: string, reason?: string): Promise<{ admin: Admin }> {
    const response = await apiClient.post(
      OWNER_BAN_ADMIN_ROUTE(adminId),
      { reason },
      { withCredentials: true }
    );
    return response.data;
  },

  async unbanAdmin(adminId: string): Promise<{ admin: Admin }> {
    const response = await apiClient.post(
      OWNER_UNBAN_ADMIN_ROUTE(adminId),
      {},
      { withCredentials: true }
    );
    return response.data;
  },

  async getFinancialOverview(filters: GetFinancialOverviewFilters = {}): Promise<FinancialOverview> {
    const params: any = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    
    const response = await apiClient.get(OWNER_FINANCIAL_OVERVIEW_ROUTE, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async getCampaignFinancials(filters: GetCampaignFinancialsFilters = {}): Promise<GetCampaignFinancialsResponse> {
    const { page = 1, limit = 10 } = filters;
    const response = await apiClient.get(OWNER_CAMPAIGN_FINANCIALS_ROUTE, {
      params: { page, limit },
      withCredentials: true,
    });
    return response.data;
  },

  async getAdminActivities(filters: GetAdminActivitiesFilters = {}): Promise<AdminActivities> {
    const { adminId, page = 1, limit = 20 } = filters;
    const params: any = { page, limit };
    if (adminId) params.adminId = adminId;
    
    const response = await apiClient.get(OWNER_ADMIN_ACTIVITIES_ROUTE, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async getOwnerDonations(filters: GetOwnerDonationsFilters = {}): Promise<GetOwnerDonationsResponse> {
    const { 
      campaignId, 
      campaignSearch, 
      creatorId, 
      donorId, 
      donorSearch, 
      fromDate, 
      toDate, 
      paymentStatus,
      page = 1, 
      limit = 20 
    } = filters;
    
    const params: any = { page, limit };
    if (campaignId) params.campaignId = campaignId;
    if (campaignSearch) params.campaignSearch = campaignSearch;
    if (creatorId) params.creatorId = creatorId;
    if (donorId) params.donorId = donorId;
    if (donorSearch) params.donorSearch = donorSearch;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    
    const response = await apiClient.get(OWNER_DONATIONS_ROUTE, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async getApprovalHistory(filters: GetApprovalHistoryFilters = {}): Promise<GetApprovalHistoryResponse> {
    const { type, adminId, startDate, endDate, page = 1, limit = 20 } = filters;
    const params: any = { page, limit };
    if (type) params.type = type;
    if (adminId) params.adminId = adminId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await apiClient.get(OWNER_APPROVAL_HISTORY_ROUTE, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  // User Management
  async getAllUsers(filters: GetAllUsersFilters = {}): Promise<GetAllUsersResponse> {
    const { page = 1, limit = 20, search, role, is_banned, kyc_status } = filters;
    const params: any = { page, limit };
    if (search) params.search = search;
    if (role) params.role = role;
    if (is_banned !== undefined) params.is_banned = is_banned;
    if (kyc_status) params.kyc_status = kyc_status;
    
    const response = await apiClient.get(OWNER_GET_ALL_USERS_ROUTE, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  async banUser(userId: string, reason?: string): Promise<{ user: User }> {
    const response = await apiClient.post(
      OWNER_BAN_USER_ROUTE(userId),
      { reason },
      { withCredentials: true }
    );
    return response.data;
  },

  async unbanUser(userId: string): Promise<{ user: User }> {
    const response = await apiClient.post(
      OWNER_UNBAN_USER_ROUTE(userId),
      {},
      { withCredentials: true }
    );
    return response.data;
  },

  async resetUserKYC(userId: string): Promise<{ user: User }> {
    const response = await apiClient.post(
      OWNER_RESET_USER_KYC_ROUTE(userId),
      {},
      { withCredentials: true }
    );
    return response.data;
  },

  async getUserHistory(userId: string, page = 1, limit = 20): Promise<GetUserHistoryResponse> {
    const response = await apiClient.get(OWNER_GET_USER_HISTORY_ROUTE(userId), {
      params: { page, limit },
      withCredentials: true,
    });
    return response.data;
  },

  async getAdminApprovedWithdrawalRequests(): Promise<{ escrows: Escrow[]; count: number }> {
    const response = await apiClient.get(OWNER_GET_WITHDRAWAL_REQUESTS_ROUTE, {
      withCredentials: true,
    });
    return response.data;
  },

  async initSepayWithdrawalPayment(
    escrowId: string,
    paymentMethod: string = "BANK_TRANSFER"
  ): Promise<{
    checkoutUrl: string;
    formFields: any;
    escrow: {
      _id: string;
      withdrawal_request_amount: number;
      order_invoice_number: string;
      request_status: string;
    };
  }> {
    const response = await apiClient.post(
      OWNER_INIT_SEPAY_WITHDRAWAL_ROUTE(escrowId),
      { paymentMethod },
      { withCredentials: true }
    );
    return response.data;
  },

  async getPendingRefunds(): Promise<{ refunds: Refund[]; count: number }> {
    const response = await apiClient.get(OWNER_GET_REFUNDS_ROUTE, {
      withCredentials: true,
    });
    return response.data;
  },

  async initSepayRefundPayment(
    refundId: string,
    paymentMethod: string = "BANK_TRANSFER"
  ): Promise<{
    checkoutUrl: string;
    formFields: any;
    refund: {
      _id: string;
      refunded_amount: number;
      refund_transaction_id?: string;
      refund_status: string;
    };
  }> {
    const response = await apiClient.post(
      OWNER_INIT_SEPAY_REFUND_ROUTE(refundId),
      { paymentMethod },
      { withCredentials: true }
    );
    return response.data;
  },
};

