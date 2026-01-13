import apiClient from './apiClient';
import {
  CREATE_REPORT_ROUTE,
  GET_REPORTS_BY_ITEM_ROUTE,
} from '../constants/api';

export const reportService = {
  async createReport(data) {
    const response = await apiClient.post(CREATE_REPORT_ROUTE, data);
    return response.data.report;
  },

  async getReportsByItem(reportedType, reportedId) {
    const response = await apiClient.get(GET_REPORTS_BY_ITEM_ROUTE(reportedType, reportedId));
    return response.data;
  },
};

