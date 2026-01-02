'use client';

import { useState, useEffect, useRef } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { 
  getGroupedReports, 
  getReportsByItem, 
  batchUpdateReportsByItem,
  updateReportStatus,
  GroupedReportItem,
  Report, 
  ReportStatus, 
  ReportedType 
} from '@/services/report.service';
import Swal from 'sweetalert2';
import { MoreVertical, ChevronDown, Search, SlidersHorizontal, AlertTriangle, Eye, CheckCircle, XCircle } from 'lucide-react';
import PostCard from '@/components/shared/PostCard';
import CampaignCard from '@/components/campaign/CampaignCard';

export default function AdminReports() {
  const [items, setItems] = useState<GroupedReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReportedType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroupedReportItem | null>(null);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [itemReports, setItemReports] = useState<Report[]>([]);
  const [reportedItem, setReportedItem] = useState<any>(null);
  const [loadingItemDetails, setLoadingItemDetails] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const itemsPerPage = 10;
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'batch' | 'single', status: ReportStatus, item?: GroupedReportItem, reportId?: string, reportedType?: ReportedType} | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<'removed' | 'user_warned' | 'user_banned' | 'no_action'>('no_action');
  const [resolutionDetails, setResolutionDetails] = useState('');

  useEffect(() => {
    fetchGroupedReports();
  }, [currentPage, statusFilter, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node) && showFilters) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters]);

  const fetchGroupedReports = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.reported_type = typeFilter;
      
      const response = await getGroupedReports(filters, currentPage - 1, itemsPerPage);
      setItems(response.items);
      setTotalCount(response.total);
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

  const handleViewItemDetails = async (item: GroupedReportItem) => {
    setSelectedItem(item);
    setLoadingItemDetails(true);
    setShowItemDetailsModal(true);
    try {
      const response = await getReportsByItem(item.reported_type, item.reported_id);
      console.log('Response from getReportsByItem:', response);
      setItemReports(response.reports);
      setReportedItem(response.reported_item);
      console.log('Reported item set:', response.reported_item);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to fetch item details',
      });
    } finally {
      setLoadingItemDetails(false);
    }
  };

  const handleBatchUpdate = async (item: GroupedReportItem, status: ReportStatus) => {
    if (status === 'resolved') {
      // Show resolution modal for approve
      setPendingAction({ type: 'batch', status, item, reportedType: item.reported_type });
      setSelectedResolution('no_action');
      setResolutionDetails('');
      setShowResolutionModal(true);
    } else {
      // For reject, just show confirmation and use no_action
      const result = await Swal.fire({
        title: `Xử lý tất cả ${item.count} báo cáo?`,
        html: `Bạn có chắc muốn <strong>từ chối</strong> tất cả ${item.pending_count} báo cáo đang chờ của item này?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy',
      });

      if (result.isConfirmed) {
        try {
          await batchUpdateReportsByItem(item.reported_type, item.reported_id, {
            status,
            resolution: 'no_action',
          });
          Swal.fire('Success!', `Đã xử lý ${item.count} báo cáo thành công`, 'success');
          fetchGroupedReports();
          if (showItemDetailsModal) {
            setShowItemDetailsModal(false);
          }
        } catch (error: any) {
          Swal.fire('Error', error?.response?.data?.message || 'Failed to batch update reports', 'error');
        }
      }
    }
  };

  const handleUpdateSingleReport = async (reportId: string, status: ReportStatus) => {
    if (status === 'resolved') {
      // Find the report to get reported_type
      const report = itemReports.find(r => r._id === reportId);
      const reportedType = report?.reported_type || selectedItem?.reported_type;
      
      // Show resolution modal for approve
      setPendingAction({ type: 'single', status, reportId, reportedType });
      setSelectedResolution('no_action');
      setResolutionDetails('');
      setShowResolutionModal(true);
    } else {
      // For reject, just show confirmation and use no_action
      const result = await Swal.fire({
        title: 'Từ chối báo cáo?',
        text: 'Bạn có chắc muốn từ chối báo cáo này?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy',
      });

      if (result.isConfirmed) {
        try {
          await updateReportStatus(reportId, {
            status,
            resolution: 'no_action',
          });
          Swal.fire('Success!', 'Report status updated successfully', 'success');
          if (selectedItem) {
            handleViewItemDetails(selectedItem);
          }
          fetchGroupedReports();
        } catch (error: any) {
          Swal.fire('Error', error?.response?.data?.message || 'Failed to update report status', 'error');
        }
      }
    }
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    const itemKey = `${item.reported_type}:${item.reported_id}`;
    return itemKey.toLowerCase().includes(query);
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: ReportedType) => {
    const types: { [key: string]: string } = {
      'post': 'Bài viết',
      'campaign': 'Chiến dịch',
      'user': 'Người dùng',
      'comment': 'Bình luận',
      'event': 'Sự kiện',
    };
    return types[type] || type;
  };

  const getReasonLabel = (reason: string) => {
    const reasons: { [key: string]: string } = {
      'spam': 'Spam',
      'inappropriate_content': 'Nội dung không phù hợp',
      'scam': 'Lừa đảo',
      'fake': 'Giả mạo',
      'harassment': 'Quấy rối',
      'violence': 'Bạo lực',
      'copyright': 'Bản quyền',
      'misinformation': 'Thông tin sai lệch',
      'other': 'Khác',
    };
    return reasons[reason] || reason;
  };

  const getTopReason = (reasons: { [key: string]: number }) => {
    const entries = Object.entries(reasons);
    if (entries.length === 0) return 'N/A';
    entries.sort((a, b) => b[1] - a[1]);
    return getReasonLabel(entries[0][0]);
  };

  const handleConfirmResolution = async () => {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'batch' && pendingAction.item) {
        await batchUpdateReportsByItem(
          pendingAction.item.reported_type,
          pendingAction.item.reported_id,
          {
            status: pendingAction.status,
            resolution: selectedResolution,
            resolution_details: resolutionDetails || undefined,
          }
        );
        Swal.fire('Success!', `Đã xử lý ${pendingAction.item.count} báo cáo thành công`, 'success');
        fetchGroupedReports();
        if (showItemDetailsModal) {
          setShowItemDetailsModal(false);
        }
      } else if (pendingAction.type === 'single' && pendingAction.reportId) {
        await updateReportStatus(pendingAction.reportId, {
          status: pendingAction.status,
          resolution: selectedResolution,
          resolution_details: resolutionDetails || undefined,
        });
        Swal.fire('Success!', 'Report status updated successfully', 'success');
        if (selectedItem) {
          handleViewItemDetails(selectedItem);
        }
        fetchGroupedReports();
      }
      
      setShowResolutionModal(false);
      setPendingAction(null);
      setSelectedResolution('no_action');
      setResolutionDetails('');
    } catch (error: any) {
      Swal.fire('Error', error?.response?.data?.message || 'Failed to update reports', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Quản lý báo cáo</h1>
            <p className="text-gray-600">Xem và xử lý các báo cáo từ người dùng (nhóm theo item).</p>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Items bị báo cáo <span className="text-gray-500 font-normal">({totalCount})</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-bold">Filters</span>
                </button>
                
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Tất cả</option>
                          <option value="pending">Chờ xử lý</option>
                          <option value="resolved">Đã phê duyệt</option>
                          <option value="rejected">Đã từ chối</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 bottom-2.5 pointer-events-none text-gray-400" />
                      </div>
                      
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loại
                        </label>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value as ReportedType | 'all')}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Tất cả</option>
                          <option value="post">Bài viết</option>
                          <option value="campaign">Chiến dịch</option>
                          <option value="user">Người dùng</option>
                          <option value="comment">Bình luận</option>
                          <option value="event">Sự kiện</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 bottom-2.5 pointer-events-none text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Không tìm thấy items bị báo cáo</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Item</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Loại</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Số lượng báo cáo</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Lý do phổ biến</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Ngày báo cáo mới nhất</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={`${item.reported_type}:${item.reported_id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {item.reported_type}:{item.reported_id.slice(-8)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{getTypeLabel(item.reported_type)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            {item.pending_count > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                {item.pending_count} chờ xử lý
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{getTopReason(item.reasons)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDate(item.latest_report_at)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewItemDetails(item)}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Xem chi tiết
                            </button>
                            {item.pending_count > 0 && (
                              <>
                                <button
                                  onClick={() => handleBatchUpdate(item, 'resolved')}
                                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Phê duyệt
                                </button>
                                <button
                                  onClick={() => handleBatchUpdate(item, 'rejected')}
                                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Từ chối
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} / {totalCount} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg transition-all text-sm ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
                  }`}
                >
                  Previous
                </button>
                
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-4 py-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`px-4 py-2 rounded-lg transition-all text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`px-4 py-2 rounded-lg transition-all text-sm ${
                    currentPage === totalPages || totalPages === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showItemDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowItemDetailsModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Chi tiết báo cáo - {getTypeLabel(selectedItem.reported_type)}
                </h2>
                <button
                  onClick={() => setShowItemDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {loadingItemDetails ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Đang tải thông tin item...</p>
                </div>
              ) : reportedItem ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Item được báo cáo:</h3>
                  {selectedItem?.reported_type === 'post' && reportedItem.content_text ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <PostCard 
                        post={{
                          _id: reportedItem._id?.toString() || reportedItem.id?.toString() || '',
                          user: reportedItem.user && typeof reportedItem.user === 'object' 
                            ? reportedItem.user 
                            : { _id: '', username: 'Unknown' },
                          content_text: reportedItem.content_text || '',
                          media_url: reportedItem.media_url || [],
                          hashtags: Array.isArray(reportedItem.hashtags) ? reportedItem.hashtags : [],
                          campaign_id: reportedItem.campaign_id || null,
                          createdAt: reportedItem.createdAt || reportedItem.created_at || new Date().toISOString(),
                          likesCount: 0,
                          commentsCount: 0,
                          isLiked: false
                        }}
                      />
                    </div>
                  ) : selectedItem?.reported_type === 'campaign' && reportedItem.title ? (
                    <div className="bg-white rounded-lg">
                      <CampaignCard 
                        campaign={reportedItem as any}
                        disableNavigation={true}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 overflow-auto max-h-96">
                        {JSON.stringify(reportedItem, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Không tìm thấy thông tin item</p>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Tất cả báo cáo ({itemReports.length})</h3>
                  {selectedItem.pending_count > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBatchUpdate(selectedItem, 'resolved')}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Phê duyệt tất cả
                      </button>
                      <button
                        onClick={() => handleBatchUpdate(selectedItem, 'rejected')}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Từ chối tất cả
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {loadingItemDetails ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600">Đang tải...</p>
                    </div>
                  ) : (
                    itemReports.map((report) => (
                      <div key={report._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-gray-900">{report.reporter?.username || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{formatDate(report.submitted_at)}</div>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            report.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                            report.status === 'resolved' ? 'bg-green-50 text-green-700' :
                            report.status === 'rejected' ? 'bg-red-50 text-red-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {report.status === 'pending' ? 'Chờ xử lý' :
                             report.status === 'resolved' ? 'Đã phê duyệt' :
                             report.status === 'rejected' ? 'Đã từ chối' :
                             report.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Lý do:</strong> {getReasonLabel(report.reported_reason)}
                        </div>
                        {report.description && (
                          <div className="text-sm text-gray-700 mb-3">
                            <strong>Mô tả:</strong> {report.description}
                          </div>
                        )}
                        {report.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleUpdateSingleReport(report._id, 'resolved')}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Phê duyệt
                            </button>
                            <button
                              onClick={() => handleUpdateSingleReport(report._id, 'rejected')}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Selection Modal */}
      {showResolutionModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowResolutionModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Chọn hành động xử lý</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hành động:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="no_action"
                      checked={selectedResolution === 'no_action'}
                      onChange={(e) => setSelectedResolution(e.target.value as any)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Không làm gì</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="removed"
                      checked={selectedResolution === 'removed'}
                      onChange={(e) => setSelectedResolution(e.target.value as any)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Xóa/Ẩn item</span>
                  </label>
                  {/* Chỉ hiển thị "Cảnh báo user" và "Ban user" nếu không phải post, campaign, event */}
                  {pendingAction.reportedType && !['post', 'campaign', 'event'].includes(pendingAction.reportedType) && (
                    <>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="user_warned"
                          checked={selectedResolution === 'user_warned'}
                          onChange={(e) => setSelectedResolution(e.target.value as any)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Cảnh báo user</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="user_banned"
                          checked={selectedResolution === 'user_banned'}
                          onChange={(e) => setSelectedResolution(e.target.value as any)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Ban user</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do (tùy chọn):
                </label>
                <textarea
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  placeholder="Nhập lý do xử lý..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResolutionModal(false);
                  setPendingAction(null);
                  setSelectedResolution('no_action');
                  setResolutionDetails('');
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmResolution}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
