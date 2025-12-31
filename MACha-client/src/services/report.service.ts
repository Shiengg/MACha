import apiClient from "@/lib/api-client";
import {
  CREATE_REPORT_ROUTE,
  GET_REPORTS_ROUTE,
  GET_REPORT_BY_ID_ROUTE,
  UPDATE_REPORT_STATUS_ROUTE,
  GET_REPORTS_BY_ITEM_ROUTE,
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
  | "other";

export type ReportedType = "post" | "campaign" | "user" | "comment";

export type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "rejected"
  | "auto_resolved";

export type ReportResolution =
  | "removed"
  | "user_warned"
  | "user_banned"
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
): Promise<GetReportsByItemResponse> => {
  try {
    const response = await apiClient.get<GetReportsByItemResponse>(
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

