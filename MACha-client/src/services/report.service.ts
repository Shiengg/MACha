import apiClient from "@/lib/api-client";
import {
  CREATE_REPORT_ROUTE,
  GET_REPORTS_ROUTE,
  GET_GROUPED_REPORTS_ROUTE,
  GET_REPORT_BY_ID_ROUTE,
  UPDATE_REPORT_STATUS_ROUTE,
  GET_REPORTS_BY_ITEM_ROUTE,
  BATCH_UPDATE_REPORTS_BY_ITEM_ROUTE,
  GET_ADMIN_REPORTS_ROUTE,
  GET_REPORTS_BY_ADMIN_ROUTE,
} from "@/constants/api";

export type ReportReason =
  | "spam"
  | "inappropriate_content"
  | "scam"
  | "fake"
  | "harassment"
  | "violence"
  | "copyright"
  | "misinformation"
  | "abuse_of_power"
  | "inappropriate_handling"
  | "other";

export type ReportedType = "post" | "campaign" | "user" | "comment" | "event" | "admin";

export type ReportStatus =
  | "pending"
  | "resolved"
  | "rejected"
  | "auto_resolved";

export type ReportResolution =
  | "removed"
  | "user_warned"
  | "user_banned"
  | "admin_warned"
  | "admin_removed"
  | "admin_banned"
  | "no_action";

export interface Reporter {
  _id: string;
  username: string;
  avatar?: string;
  fullname?: string;
}

export interface Report {
  _id: string;
  reporter: Reporter;
  reported_type: ReportedType;
  reported_id: string;
  reported_reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewed_by?: Reporter;
  reviewed_at?: string;
  resolution?: ReportResolution;
  resolution_details?: string;
  submitted_at: string;
  resolved_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportData {
  reported_type: ReportedType;
  reported_id: string;
  reported_reason: ReportReason;
  description?: string;
}

export interface CreateReportResponse {
  report: Report;
}

export interface GetReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetReportsByItemResponse {
  count: number;
  reports: Report[];
}

export interface UpdateReportStatusData {
  status: ReportStatus;
  resolution?: ReportResolution;
  resolution_details?: string;
}

export const createReport = async (
  data: CreateReportData
): Promise<Report> => {
  try {
    const response = await apiClient.post<CreateReportResponse>(
      CREATE_REPORT_ROUTE,
      data
    );
    return response.data.report;
  } catch (error: any) {
    console.error("Error creating report:", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

export const getReports = async (
  filters?: {
    status?: ReportStatus;
    reported_type?: ReportedType;
    reporter_id?: string;
  },
  page?: number,
  limit?: number
): Promise<GetReportsResponse> => {
  try {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.reported_type) params.reported_type = filters.reported_type;
    if (filters?.reporter_id) params.reporter_id = filters.reporter_id;
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;

    const response = await apiClient.get<GetReportsResponse>(GET_REPORTS_ROUTE, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
};

export const getReportById = async (id: string): Promise<Report> => {
  try {
    const response = await apiClient.get<{ report: Report }>(
      GET_REPORT_BY_ID_ROUTE(id)
    );
    return response.data.report;
  } catch (error) {
    console.error(`Error fetching report ${id}:`, error);
    throw error;
  }
};

export const updateReportStatus = async (
  id: string,
  data: UpdateReportStatusData
): Promise<Report> => {
  try {
    const response = await apiClient.put<{ report: Report }>(
      UPDATE_REPORT_STATUS_ROUTE(id),
      data
    );
    return response.data.report;
  } catch (error) {
    console.error(`Error updating report ${id}:`, error);
    throw error;
  }
};

export const getReportsByItem = async (
  reportedType: ReportedType,
  reportedId: string
): Promise<GetReportsByItemResponse & { reported_item?: any }> => {
  try {
    const response = await apiClient.get<GetReportsByItemResponse & { reported_item?: any }>(
      GET_REPORTS_BY_ITEM_ROUTE(reportedType, reportedId)
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching reports for ${reportedType} ${reportedId}:`,
      error
    );
    throw error;
  }
};

export interface GroupedReportItem {
  reported_type: ReportedType;
  reported_id: string;
  reports: Report[];
  count: number;
  pending_count: number;
  latest_report_at: string;
  reasons: { [key: string]: number };
}

export interface GetGroupedReportsResponse {
  items: GroupedReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getGroupedReports = async (
  filters?: {
    status?: ReportStatus;
    reported_type?: ReportedType;
  },
  page?: number,
  limit?: number
): Promise<GetGroupedReportsResponse> => {
  try {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.reported_type) params.reported_type = filters.reported_type;
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;

    const response = await apiClient.get<GetGroupedReportsResponse>(GET_GROUPED_REPORTS_ROUTE, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching grouped reports:", error);
    throw error;
  }
};

export const batchUpdateReportsByItem = async (
  reportedType: ReportedType,
  reportedId: string,
  data: UpdateReportStatusData
): Promise<{ message: string; count: number }> => {
  try {
    const response = await apiClient.put<{ message: string; count: number }>(
      BATCH_UPDATE_REPORTS_BY_ITEM_ROUTE(reportedType, reportedId),
      data
    );
    return response.data;
  } catch (error) {
    console.error(`Error batch updating reports for ${reportedType} ${reportedId}:`, error);
    throw error;
  }
};

export interface GetAdminReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getAdminReports = async (
  filters?: {
    status?: ReportStatus;
    admin_id?: string;
  },
  page?: number,
  limit?: number
): Promise<GetAdminReportsResponse> => {
  try {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.admin_id) params.admin_id = filters.admin_id;
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;

    const response = await apiClient.get<GetAdminReportsResponse>(GET_ADMIN_REPORTS_ROUTE, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching admin reports:", error);
    throw error;
  }
};

export const getReportsByAdmin = async (adminId: string): Promise<Report[]> => {
  try {
    const response = await apiClient.get<{ reports: Report[] }>(
      GET_REPORTS_BY_ADMIN_ROUTE(adminId)
    );
    return response.data.reports;
  } catch (error) {
    console.error(`Error fetching reports for admin ${adminId}:`, error);
    throw error;
  }
};

