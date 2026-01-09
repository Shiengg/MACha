import apiClient from '@/lib/api-client';
import { ADMIN_DASHBOARD_ROUTE } from '@/constants/api';

export interface AdminDashboardData {
  overview: {
    total_users: number;
    total_campaigns: number;
    total_events: number;
    total_donations: number;
    active_campaigns: number;
  };
  pending: {
    campaigns: number;
    events: number;
    reports: number;
    kyc: number;
    withdrawals: number;
  };
  admin_stats: {
    total_approvals: number;
    total_rejections: number;
    campaign_approvals: number;
    campaign_rejections: number;
    event_approvals: number;
    event_rejections: number;
    kyc_approvals: number;
    kyc_rejections: number;
    withdrawal_approvals: number;
    withdrawal_rejections: number;
    report_resolutions: number;
  };
  approvals_rejections: {
    today: {
      approvals: number;
      rejections: number;
    };
    week: {
      approvals: number;
      rejections: number;
    };
    month: {
      approvals: number;
      rejections: number;
    };
  };
  user_growth_by_month: Array<{
    month: string;
    count: number;
  }>;
  campaign_activity_by_month: Array<{
    month: string;
    created: number;
    approved: number;
  }>;
  recent_actions: Array<{
    type: string;
    item: string;
    status: 'approved' | 'rejected';
    date: string;
    id: string;
  }>;
}

export const adminService = {
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const response = await apiClient.get(ADMIN_DASHBOARD_ROUTE, { withCredentials: true });
    return response.data;
  },
};

