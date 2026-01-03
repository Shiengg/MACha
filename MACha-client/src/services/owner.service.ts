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
  OWNER_APPROVAL_HISTORY_ROUTE,
} from "@/constants/api";

export interface Admin {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  avatar?: string;
  createdAt: string;
  is_verified?: boolean;
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
};

