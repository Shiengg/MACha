'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { getAdminReports, getReportsByAdmin, updateReportStatus, type Report, type ReportStatus, type ReportResolution } from '@/services/report.service';
import { ownerService } from '@/services/owner.service';
import Swal from 'sweetalert2';
import { Flag, Eye, Check, X, AlertTriangle, Ban, UserMinus, Search, Filter } from 'lucide-react';

export default function OwnerAdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [adminFilter, setAdminFilter] = useState<string>('');
  const [admins, setAdmins] = useState<Array<{ _id: string; username: string }>>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'warn' | 'remove' | 'ban' | 'no_action' | null>(null);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const limit = 20;

  useEffect(() => {
    fetchAdmins();
    fetchReports();
  }, [currentPage, statusFilter, adminFilter]);

  const fetchAdmins = async () => {
    try {
      const data = await ownerService.getAdmins({ page: 1, limit: 100 });
      setAdmins(data.admins.map(a => ({ _id: a._id, username: a.username })));
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (adminFilter) filters.admin_id = adminFilter;

      const result = await getAdminReports(filters, currentPage, limit);
      setReports(result.reports);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to fetch reports',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleAction = (report: Report, action: 'warn' | 'remove' | 'ban' | 'no_action') => {
    setSelectedReport(report);
    setSelectedAction(action);
    setResolutionDetails('');
    setShowActionModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedReport || !selectedAction) return;

    try {
      let resolution: ReportResolution = 'no_action';
      if (selectedAction === 'warn') resolution = 'admin_warned';
      else if (selectedAction === 'remove') resolution = 'admin_removed';
      else if (selectedAction === 'ban') resolution = 'admin_banned';

      await updateReportStatus(selectedReport._id, {
        status: 'resolved',
        resolution,
        resolution_details: resolutionDetails || undefined,
      });

      if (selectedAction === 'ban' && selectedReport.reported_id) {
        await ownerService.banAdmin(selectedReport.reported_id, resolutionDetails || 'Banned due to reports');
      } else if (selectedAction === 'remove' && selectedReport.reported_id) {
        await ownerService.deleteAdmin(selectedReport.reported_id);
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Report ${selectedAction === 'warn' ? 'resolved with warning' : selectedAction === 'remove' ? 'resolved - admin removed' : selectedAction === 'ban' ? 'resolved - admin banned' : 'resolved'}`,
      });

      setShowActionModal(false);
      setSelectedReport(null);
      setSelectedAction(null);
      setResolutionDetails('');
      fetchReports();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to update report',
      });
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: { [key: string]: string } = {
      spam: 'Spam',
      inappropriate_content: 'Nội dung không phù hợp',
      scam: 'Lừa đảo',
      fake: 'Giả mạo',
      harassment: 'Quấy rối',
      violence: 'Bạo lực',
      copyright: 'Bản quyền',
      misinformation: 'Thông tin sai',
      abuse_of_power: 'Lạm quyền',
      inappropriate_handling: 'Xử lý sai',
      other: 'Khác',
    };
    return labels[reason] || reason;
  };

  const getStatusBadge = (status: ReportStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      auto_resolved: 'bg-blue-100 text-blue-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getReportedAdmin = (report: Report) => {
    // Backend populates reported_id as admin object for admin reports
    const reportedId = (report as any).reported_id;
    if (reportedId && typeof reportedId === 'object' && reportedId.username) {
      return reportedId;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Báo cáo về Admin</h1>
            <p className="text-gray-600">Xem và xử lý các báo cáo về admin</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as ReportStatus | '');
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tất cả</option>
                  <option value="pending">Đang chờ</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="rejected">Đã từ chối</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin</label>
                <select
                  value={adminFilter}
                  onChange={(e) => {
                    setAdminFilter(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tất cả Admin</option>
                  {admins.map((admin) => (
                    <option key={admin._id} value={admin._id}>
                      {admin.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Không có báo cáo nào</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người báo cáo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin được báo cáo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lý do</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày báo cáo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reports.map((report) => {
                      const reportedAdmin = getReportedAdmin(report);
                      return (
                        <tr key={report._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {report.reporter.avatar ? (
                                <img className="h-8 w-8 rounded-full" src={report.reporter.avatar} alt={report.reporter.username} />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                  {report.reporter.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{report.reporter.fullname || report.reporter.username}</div>
                                <div className="text-sm text-gray-500">@{report.reporter.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {reportedAdmin ? (
                              <div className="text-sm text-gray-900">{reportedAdmin.username || 'N/A'}</div>
                            ) : (
                              <div className="text-sm text-gray-400">N/A</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{getReasonLabel(report.reported_reason)}</div>
                            {report.description && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{report.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(report.status)}`}>
                              {report.status === 'pending' ? 'Đang chờ' : report.status === 'resolved' ? 'Đã xử lý' : report.status === 'rejected' ? 'Đã từ chối' : report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(report.submitted_at).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetail(report)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              {report.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleAction(report, 'warn')}
                                    className="text-yellow-600 hover:text-yellow-900"
                                    title="Cảnh báo"
                                  >
                                    <AlertTriangle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleAction(report, 'remove')}
                                    className="text-orange-600 hover:text-orange-900"
                                    title="Gỡ admin"
                                  >
                                    <UserMinus className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleAction(report, 'ban')}
                                    className="text-red-600 hover:text-red-900"
                                    title="Cấm admin"
                                  >
                                    <Ban className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleAction(report, 'no_action')}
                                    className="text-gray-600 hover:text-gray-900"
                                    title="Không xử lý"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Chi tiết Báo cáo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Người báo cáo</label>
                <div className="mt-1 flex items-center">
                  {selectedReport.reporter.avatar ? (
                    <img className="h-10 w-10 rounded-full" src={selectedReport.reporter.avatar} alt={selectedReport.reporter.username} />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                      {selectedReport.reporter.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{selectedReport.reporter.fullname || selectedReport.reporter.username}</div>
                    <div className="text-sm text-gray-500">@{selectedReport.reporter.username}</div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Lý do</label>
                <div className="mt-1 text-sm text-gray-900">{getReasonLabel(selectedReport.reported_reason)}</div>
              </div>
              {selectedReport.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedReport.description}</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                <div className="mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedReport.status)}`}>
                    {selectedReport.status === 'pending' ? 'Đang chờ' : selectedReport.status === 'resolved' ? 'Đã xử lý' : selectedReport.status === 'rejected' ? 'Đã từ chối' : selectedReport.status}
                  </span>
                </div>
              </div>
              {selectedReport.resolution && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giải quyết</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedReport.resolution}</div>
                </div>
              )}
              {selectedReport.resolution_details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Chi tiết giải quyết</label>
                  <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedReport.resolution_details}</div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && selectedReport && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedAction === 'warn' ? 'Cảnh báo Admin' : selectedAction === 'remove' ? 'Gỡ Admin' : selectedAction === 'ban' ? 'Cấm Admin' : 'Không xử lý'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chi tiết (tùy chọn)</label>
                <textarea
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Nhập chi tiết giải quyết..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedReport(null);
                  setSelectedAction(null);
                  setResolutionDetails('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-white rounded-lg ${
                  selectedAction === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                  selectedAction === 'remove' ? 'bg-orange-600 hover:bg-orange-700' :
                  selectedAction === 'warn' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

