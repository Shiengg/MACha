'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService, ApprovalHistoryItem } from '@/services/owner.service';
import { History, Filter, ExternalLink, X } from 'lucide-react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

export default function OwnerApprovalHistory() {
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    adminId: '',
    startDate: '',
    endDate: '',
  });
  const [admins, setAdmins] = useState<User[]>([]);
  const [sortField, setSortField] = useState<'type' | 'action' | 'admin' | 'timestamp' | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<ApprovalHistoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage, filters]);

  const fetchAdmins = async () => {
    try {
      const adminsData = await ownerService.getAdmins({ page: 1, limit: 100 });
      setAdmins(adminsData.admins.map(a => ({
        _id: a._id,
        username: a.username,
        email: a.email,
        role: 'admin'
      })));
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await ownerService.getApprovalHistory({ 
        ...filters, 
        page: currentPage, 
        limit: 20 
      });
      setHistory(result.history);
      setTotalPages(result.pagination.pages);
    } catch (error) {
      console.error('Error fetching approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action === 'approved') return 'bg-green-100 text-green-800';
    if (action === 'verified') return 'bg-blue-100 text-blue-800';
    if (action === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      campaign: 'Chiến dịch',
      event: 'Sự kiện',
      kyc: 'KYC',
      report: 'Báo cáo',
      escrow: 'Rút tiền',
    };
    return labels[type] || type;
  };

  const handleSort = (field: 'type' | 'action' | 'admin' | 'timestamp') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: 'type' | 'action' | 'admin' | 'timestamp') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  const sortedHistory = [...history].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'action':
        aValue = a.action;
        bValue = b.action;
        break;
      case 'admin':
        aValue = a.admin?.username || '';
        bValue = b.admin?.username || '';
        break;
      case 'timestamp':
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
        break;
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleExport = () => {
    const csvContent = [
      ['Loại', 'Hành động', 'Nội dung', 'Admin', 'Lý do', 'Ngày'].join(','),
      ...sortedHistory.map(item => {
        const reason =           item.action === 'rejected' 
          ? (item.item?.rejection_reason || item.item?.rejected_reason || item.item?.admin_rejection_reason || 'Không có lý do')
          : (item.item?.approval_reason || 'N/A');
        const itemName = item.type === 'campaign' ? (item.item?.title || 'N/A') :
          item.type === 'event' ? (item.item?.title || 'N/A') :
          item.type === 'escrow' ? (item.item?.campaign?.title || 'N/A') :
          item.type === 'report' ? (item.item?.reported_type || 'N/A') :
          item.type === 'kyc' ? (item.item?.user?.username || item.item?.user?.fullname || 'N/A') :
          'N/A';
        
        return [
          getTypeLabel(item.type),
          item.action,
          itemName,
          item.admin?.username || 'N/A',
          reason.replace(/,/g, ';'),
          new Date(item.timestamp).toLocaleString('vi-VN')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approval-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (item: ApprovalHistoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  // Close modal on ESC key and prevent body scroll
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setSelectedItem(null);
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderModalContent = () => {
    if (!selectedItem) return null;

    const { type, action, item, admin, timestamp } = selectedItem;
    const reason = action === 'rejected' 
      ? (item?.rejection_reason || item?.rejected_reason || item?.admin_rejection_reason || 'Không có lý do')
      : (item?.approval_reason || 'N/A');

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header Info */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Loại</label>
              <p className="text-sm font-semibold text-gray-900">{getTypeLabel(type)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hành động</label>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(action)}`}>
                {action === 'approved' ? 'Đã duyệt' : action === 'rejected' ? 'Đã từ chối' : action === 'verified' ? 'Đã xác minh' : action}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Admin xử lý</label>
              <p className="text-sm text-gray-900">{admin?.username || admin?.fullname || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Thời gian xử lý</label>
              <p className="text-sm text-gray-900">{formatDate(timestamp)}</p>
            </div>
          </div>
        </div>

        {/* Reason Section */}
        {reason && reason !== 'N/A' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {action === 'rejected' ? 'Lý do từ chối' : 'Lý do duyệt'}
            </label>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{reason}</p>
            </div>
          </div>
        )}

        {/* Detailed Information */}
        <div className="border-t pt-3 sm:pt-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Thông tin chi tiết</h3>
          <div className="space-y-3 sm:space-y-4">
            {type === 'campaign' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tiêu đề</label>
                  <p className="text-sm font-semibold text-gray-900">{item?.title || 'N/A'}</p>
                </div>
                {item?.description && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                    <p className="text-sm text-gray-900 line-clamp-3">{item.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.status || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Danh mục</label>
                  <p className="text-sm text-gray-900">{item?.category || 'N/A'}</p>
                </div>
                {item?.goal_amount && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mục tiêu</label>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(item.goal_amount)}</p>
                  </div>
                )}
                {item?.current_amount !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đã quyên góp</label>
                    <p className="text-sm font-semibold text-blue-600">{formatCurrency(item.current_amount)}</p>
                  </div>
                )}
                {item?.start_date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày bắt đầu</label>
                    <p className="text-sm text-gray-900">{formatDate(item.start_date)}</p>
                  </div>
                )}
                {item?.end_date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày kết thúc</label>
                    <p className="text-sm text-gray-900">{formatDate(item.end_date)}</p>
                  </div>
                )}
                {item?.location?.location_name && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Địa điểm</label>
                    <p className="text-sm text-gray-900">{item.location.location_name}</p>
                  </div>
                )}
                {item?.creator && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Người tạo</label>
                    <p className="text-sm text-gray-900">{item.creator.username || item.creator.fullname || 'N/A'}</p>
                  </div>
                )}
                {item?.contact_info && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Liên hệ</label>
                    <p className="text-sm text-gray-900">{item.contact_info.fullname || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{item.contact_info.email || ''}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-xs text-gray-600 font-mono break-all">{item?._id || 'N/A'}</p>
                </div>
                {item?.createdAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày tạo</label>
                    <p className="text-sm text-gray-900">{formatDate(item.createdAt)}</p>
                  </div>
                )}
                {item?.updatedAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cập nhật lần cuối</label>
                    <p className="text-sm text-gray-900">{formatDate(item.updatedAt)}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'event' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tiêu đề</label>
                  <p className="text-sm font-semibold text-gray-900">{item?.title || 'N/A'}</p>
                </div>
                {item?.description && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                    <p className="text-sm text-gray-900 line-clamp-3">{item.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.status || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Danh mục</label>
                  <p className="text-sm text-gray-900">{item?.category || 'N/A'}</p>
                </div>
                {item?.start_date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày bắt đầu</label>
                    <p className="text-sm text-gray-900">{formatDate(item.start_date)}</p>
                  </div>
                )}
                {item?.end_date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày kết thúc</label>
                    <p className="text-sm text-gray-900">{formatDate(item.end_date)}</p>
                  </div>
                )}
                {item?.location?.location_name && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Địa điểm</label>
                    <p className="text-sm text-gray-900">{item.location.location_name}</p>
                  </div>
                )}
                {item?.capacity && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sức chứa</label>
                    <p className="text-sm text-gray-900">{item.capacity} người</p>
                  </div>
                )}
                {item?.creator && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Người tạo</label>
                    <p className="text-sm text-gray-900">{item.creator.username || item.creator.fullname || 'N/A'}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-xs text-gray-600 font-mono break-all">{item?._id || 'N/A'}</p>
                </div>
                {item?.createdAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày tạo</label>
                    <p className="text-sm text-gray-900">{formatDate(item.createdAt)}</p>
                  </div>
                )}
                {item?.updatedAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cập nhật lần cuối</label>
                    <p className="text-sm text-gray-900">{formatDate(item.updatedAt)}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'kyc' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Người dùng</label>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-sm font-semibold text-gray-900">{item?.user?.fullname || item?.user?.username || 'N/A'}</p>
                    {item?.user?.email && (
                      <p className="text-xs text-gray-500">{item.user.email}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.status || 'N/A'}</p>
                </div>
                {item?.submitted_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày nộp</label>
                    <p className="text-sm text-gray-900">{formatDate(item.submitted_at)}</p>
                  </div>
                )}
                {item?.processed_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày xử lý</label>
                    <p className="text-sm text-gray-900">{formatDate(item.processed_at)}</p>
                  </div>
                )}
                {item?.ai_processing?.provider && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nhà cung cấp AI</label>
                    <p className="text-sm text-gray-900">{item.ai_processing.provider}</p>
                  </div>
                )}
                {item?.ai_processing?.recommendation && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đề xuất AI</label>
                    <p className="text-sm text-gray-900">{item.ai_processing.recommendation}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-xs text-gray-600 font-mono break-all">{item?._id || 'N/A'}</p>
                </div>
                {item?.createdAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày tạo</label>
                    <p className="text-sm text-gray-900">{formatDate(item.createdAt)}</p>
                  </div>
                )}
                {item?.updatedAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cập nhật lần cuối</label>
                    <p className="text-sm text-gray-900">{formatDate(item.updatedAt)}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'report' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Loại báo cáo</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.reported_type || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lý do báo cáo</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.reported_reason || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.status || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Giải quyết</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.resolution || 'N/A'}</p>
                </div>
                {item?.description && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">{item.description}</p>
                  </div>
                )}
                {item?.resolution_details && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Chi tiết giải quyết</label>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">{item.resolution_details}</p>
                  </div>
                )}
                {item?.reporter && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Người báo cáo</label>
                    <p className="text-sm text-gray-900">{item.reporter.username || item.reporter.fullname || 'N/A'}</p>
                  </div>
                )}
                {item?.submitted_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày báo cáo</label>
                    <p className="text-sm text-gray-900">{formatDate(item.submitted_at)}</p>
                  </div>
                )}
                {item?.resolved_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày giải quyết</label>
                    <p className="text-sm text-gray-900">{formatDate(item.resolved_at)}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-xs text-gray-600 font-mono break-all">{item?._id || 'N/A'}</p>
                </div>
                {item?.createdAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày tạo</label>
                    <p className="text-sm text-gray-900">{formatDate(item.createdAt)}</p>
                  </div>
                )}
                {item?.updatedAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cập nhật lần cuối</label>
                    <p className="text-sm text-gray-900">{formatDate(item.updatedAt)}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'escrow' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Chiến dịch</label>
                  <p className="text-sm font-semibold text-gray-900">{item?.campaign?.title || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái yêu cầu</label>
                  <p className="text-sm text-gray-900 capitalize">{item?.request_status || 'N/A'}</p>
                </div>
                {item?.milestone_percentage && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phần trăm milestone</label>
                    <p className="text-sm text-gray-900">{item.milestone_percentage}%</p>
                  </div>
                )}
                {item?.total_amount !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tổng số tiền</label>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total_amount)}</p>
                  </div>
                )}
                {item?.remaining_amount !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Số tiền còn lại</label>
                    <p className="text-sm font-semibold text-blue-600">{formatCurrency(item.remaining_amount)}</p>
                  </div>
                )}
                {item?.withdrawal_request_amount !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Số tiền yêu cầu rút</label>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(item.withdrawal_request_amount)}</p>
                  </div>
                )}
                {item?.request_reason && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Lý do yêu cầu</label>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">{item.request_reason}</p>
                  </div>
                )}
                {item?.requested_by && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Người yêu cầu</label>
                    <p className="text-sm text-gray-900">{item.requested_by.username || item.requested_by.fullname || 'N/A'}</p>
                  </div>
                )}
                {item?.campaign?.goal_amount && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mục tiêu campaign</label>
                    <p className="text-sm text-gray-900">{formatCurrency(item.campaign.goal_amount)}</p>
                  </div>
                )}
                {item?.campaign?.current_amount !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đã quyên góp</label>
                    <p className="text-sm text-gray-900">{formatCurrency(item.campaign.current_amount)}</p>
                  </div>
                )}
                {item?.voting_start_date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày bắt đầu vote</label>
                    <p className="text-sm text-gray-900">{formatDate(item.voting_start_date)}</p>
                  </div>
                )}
                {item?.voting_end_date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày kết thúc vote</label>
                    <p className="text-sm text-gray-900">{formatDate(item.voting_end_date)}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                  <p className="text-xs text-gray-600 font-mono break-all">{item?._id || 'N/A'}</p>
                </div>
                {item?.createdAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ngày tạo</label>
                    <p className="text-sm text-gray-900">{formatDate(item.createdAt)}</p>
                  </div>
                )}
                {item?.updatedAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cập nhật lần cuối</label>
                    <p className="text-sm text-gray-900">{formatDate(item.updatedAt)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Lịch sử duyệt/từ chối</h1>
              <p className="text-sm sm:text-base text-gray-600">Lịch sử tất cả các hoạt động duyệt/từ chối</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Xuất CSV</span>
              <span className="sm:hidden">Xuất</span>
            </button>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Bộ lọc</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tất cả loại</option>
                  <option value="campaign">Chiến dịch</option>
                  <option value="event">Sự kiện</option>
                  <option value="kyc">KYC</option>
                  <option value="report">Báo cáo</option>
                  <option value="escrow">Rút tiền</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                <select
                  value={filters.adminId}
                  onChange={(e) => setFilters({ ...filters, adminId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tất cả Admin</option>
                  {admins.map((admin) => (
                    <option key={admin._id} value={admin._id}>
                      {admin.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Đang tải...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center gap-2">
                          Loại
                          {getSortIcon('type')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('action')}
                      >
                        <div className="flex items-center gap-2">
                          Hành động
                          {getSortIcon('action')}
                        </div>
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
                      <th 
                        className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('admin')}
                      >
                        <div className="flex items-center gap-2">
                          Admin
                          {getSortIcon('admin')}
                        </div>
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Lý do</th>
                      <th 
                        className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-2">
                          Ngày
                          {getSortIcon('timestamp')}
                        </div>
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedHistory.map((item, index) => {
                      const getItemName = () => {
                        if (item.type === 'campaign') return item.item?.title || 'N/A';
                        if (item.type === 'event') return item.item?.title || 'N/A';
                        if (item.type === 'escrow') return item.item?.campaign?.title || 'N/A';
                        if (item.type === 'report') return item.item?.reported_type || 'N/A';
                        if (item.type === 'kyc') return item.item?.user?.username || item.item?.user?.fullname || 'N/A';
                        return 'N/A';
                      };

                      const getReason = () => {
                        if (item.action === 'rejected' || item.action === 'rejected') {
                          return item.item?.rejection_reason || item.item?.rejected_reason || item.item?.admin_rejection_reason || 'Không có lý do';
                        }
                        return item.item?.approval_reason || 'N/A';
                      };

                      const reason = getReason();
                      const itemName = getItemName();

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{getTypeLabel(item.type)}</span>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(item.action)}`}>
                              {item.action === 'approved' ? 'Đã duyệt' : item.action === 'rejected' ? 'Đã từ chối' : item.action === 'verified' ? 'Đã xác minh' : item.action}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-none truncate">
                              {itemName}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-900">{item.admin?.username || 'N/A'}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="text-xs sm:text-sm text-gray-600 max-w-xs truncate" title={reason}>
                              {reason}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleDateString('vi-VN')}
                            </div>
                            <div className="text-xs text-gray-400 md:hidden">
                              {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors text-xs sm:text-sm"
                            >
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Xem chi tiết</span>
                              <span className="sm:hidden">Xem</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-200 flex-wrap gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
                >
                  Trước
                </button>
                <span className="text-gray-600 text-sm">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </OwnerContentWrapper>

      {/* Detail Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseModal}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] bg-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Chi tiết lịch sử duyệt/từ chối
              </h2>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-all hover:scale-110 flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

