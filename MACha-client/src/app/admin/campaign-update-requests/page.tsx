'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminContentWrapper from '@/components/admin/AdminContentWrapper';
import { campaignUpdateRequestService, CampaignUpdateRequest } from '@/services/campaignUpdateRequest.service';
import Swal from 'sweetalert2';
import { Clock, CheckCircle2, XCircle, Eye, ArrowLeftRight, Image as ImageIcon, FileText, Calendar } from 'lucide-react';

export default function AdminCampaignUpdateRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<CampaignUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<CampaignUpdateRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await campaignUpdateRequestService.getUpdateRequests(statusFilter);
      setRequests(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tải danh sách yêu cầu',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    const result = await Swal.fire({
      title: 'Duyệt yêu cầu chỉnh sửa?',
      html: `
        <p style="margin-bottom: 20px;">Các thay đổi sẽ được áp dụng vào campaign ngay lập tức.</p>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: flex; align-items: center; cursor: pointer; color: #374151;">
            <input type="checkbox" id="terms-checkbox" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
            <span>Tôi đã xem xét kỹ các thay đổi và đồng ý duyệt</span>
          </label>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Duyệt',
      cancelButtonText: 'Hủy',
      didOpen: () => {
        const checkbox = document.getElementById('terms-checkbox') as HTMLInputElement;
        const confirmButton = Swal.getConfirmButton();
        
        if (confirmButton && checkbox) {
          confirmButton.disabled = true;
          confirmButton.style.opacity = '0.5';
          
          checkbox.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (confirmButton) {
              confirmButton.disabled = !target.checked;
              confirmButton.style.opacity = target.checked ? '1' : '0.5';
            }
          });
        }
      },
    });

    if (!result.isConfirmed) return;

    try {
      setIsProcessing(true);
      await campaignUpdateRequestService.approveUpdateRequest(requestId);
      
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Yêu cầu chỉnh sửa đã được duyệt và áp dụng thành công',
        confirmButtonText: 'OK'
      });

      fetchRequests();
      if (selectedRequest?._id === requestId) {
        setSelectedRequest(null);
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể duyệt yêu cầu. Vui lòng thử lại.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    const { value: note } = await Swal.fire({
      title: 'Từ chối yêu cầu chỉnh sửa',
      html: `
        <textarea id="rejection-note" class="swal2-textarea" placeholder="Nhập lý do từ chối (tùy chọn)" style="width: 100%; min-height: 100px; margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit;"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Từ chối',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const noteInput = document.getElementById('rejection-note') as HTMLTextAreaElement;
        return noteInput?.value || '';
      },
    });

    if (note === undefined) return;

    try {
      setIsProcessing(true);
      await campaignUpdateRequestService.rejectUpdateRequest(requestId, note || undefined);
      
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Yêu cầu chỉnh sửa đã bị từ chối',
        confirmButtonText: 'OK'
      });

      fetchRequests();
      if (selectedRequest?._id === requestId) {
        setSelectedRequest(null);
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể từ chối yêu cầu. Vui lòng thử lại.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Đã từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <AdminContentWrapper>
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Quản lý yêu cầu chỉnh sửa campaign
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Xem xét và duyệt các yêu cầu chỉnh sửa từ creator
              </p>
            </div>

            {/* Status Filter */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Chờ duyệt
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Đã duyệt
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Đã từ chối
              </button>
            </div>

            {/* Requests List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">
                  Không có yêu cầu nào {statusFilter === 'pending' ? 'chờ duyệt' : statusFilter === 'approved' ? 'đã duyệt' : 'đã từ chối'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {request.campaign?.title || 'Không có'}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>
                            <span className="font-medium">Người tạo:</span> {request.creator?.username || 'Không có'}
                          </p>
                          <p>
                            <span className="font-medium">Gửi lúc:</span> {formatDate(request.createdAt)}
                          </p>
                          {request.reviewed_at && (
                            <p>
                              <span className="font-medium">Xử lý lúc:</span> {formatDate(request.reviewed_at)}
                            </p>
                          )}
                          {request.reviewed_by && (
                            <p>
                              <span className="font-medium">Người xử lý:</span> {request.reviewed_by.username}
                            </p>
                          )}
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request._id)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Từ chối
                          </button>
                          <button
                            onClick={() => setSelectedRequest(request._id === selectedRequest?._id ? null : request)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            {selectedRequest?._id === request._id ? 'Ẩn' : 'Xem'} chi tiết
                          </button>
                        </div>
                      )}
                      {request.status !== 'pending' && (
                        <button
                          onClick={() => setSelectedRequest(request._id === selectedRequest?._id ? null : request)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {selectedRequest?._id === request._id ? 'Ẩn' : 'Xem'} chi tiết
                        </button>
                      )}
                    </div>

                    {/* Admin Note if rejected */}
                    {request.status === 'rejected' && request.admin_note && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Lý do từ chối:</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{request.admin_note}</p>
                      </div>
                    )}

                    {/* Comparison Details */}
                    {selectedRequest?._id === request._id && request.comparison && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <ArrowLeftRight className="w-4 h-4" />
                          So sánh thay đổi
                        </h4>

                        {/* Banner Image Comparison */}
                        {request.requested_changes.banner_image && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                              <ImageIcon className="w-4 h-4" />
                              Ảnh bìa
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Trước</p>
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                  <img
                                    src={request.comparison.banner_image.before || '/placeholder.png'}
                                    alt="Ảnh bìa trước"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sau</p>
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                  <img
                                    src={request.comparison.banner_image.after || '/placeholder.png'}
                                    alt="Ảnh bìa sau"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Gallery Images Comparison */}
                        {request.requested_changes.gallery_images && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                              <ImageIcon className="w-4 h-4" />
                              Thư viện ảnh
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Trước ({request.comparison.gallery_images.before.length} ảnh)</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {request.comparison.gallery_images.before.slice(0, 6).map((url: string, idx: number) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                      <img src={url || '/placeholder.png'} alt={`Ảnh trước ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sau ({request.comparison.gallery_images.after.length} ảnh)</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {request.comparison.gallery_images.after.slice(0, 6).map((url: string, idx: number) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                      <img src={url || '/placeholder.png'} alt={`Ảnh sau ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Description Comparison */}
                        {request.requested_changes.description && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              Mô tả
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Trước</p>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {request.comparison.description.before || '(Trống)'}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sau</p>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {request.comparison.description.after || '(Trống)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* End Date Comparison */}
                        {request.requested_changes.end_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Ngày kết thúc
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Trước</p>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {request.comparison.end_date.before
                                      ? formatDate(request.comparison.end_date.before)
                                      : '(Không có)'}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sau</p>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {request.comparison.end_date.after
                                      ? formatDate(request.comparison.end_date.after)
                                      : '(Không có)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminContentWrapper>
      </div>
    </div>
  );
}

