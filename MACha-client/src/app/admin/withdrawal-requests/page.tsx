'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminContentWrapper from '@/components/admin/AdminContentWrapper';
import {
  getWithdrawalRequestsForReview,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
} from '@/services/admin/escrow.service';
import { Escrow, WithdrawalRequestStatus, Campaign, User } from '@/services/escrow.service';
import { formatEscrowError, formatWithdrawalStatus, formatCurrencyVND, formatDateTime, formatDateOnly } from '@/utils/escrow.utils';
import Swal from 'sweetalert2';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

export default function AdminWithdrawalRequests() {
  const [withdrawalRequests, setWithdrawalRequests] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Escrow | null>(null);
  const [statusFilter, setStatusFilter] = useState<WithdrawalRequestStatus>('voting_completed');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; isLastTwo: boolean } | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchWithdrawalRequests();
  }, [statusFilter]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (openMenuId && menuRef.current && !menuRef.current.contains(target)) {
        const button = buttonRefs.current[openMenuId];
        if (button && !button.contains(target)) {
          setOpenMenuId(null);
          setMenuPosition(null);
        }
      }
      
      if (filterRef.current && !filterRef.current.contains(target) && showFilters) {
        setShowFilters(false);
      }
    };

    if (openMenuId || showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId, showFilters]);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const data = await getWithdrawalRequestsForReview(statusFilter);
      setWithdrawalRequests(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.message || 'Không thể tải danh sách yêu cầu rút tiền',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMenu = (requestId: string, isLastTwo: boolean) => {
    if (openMenuId === requestId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = buttonRefs.current[requestId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuHeight = 150;
        setMenuPosition({
          top: isLastTwo ? rect.top - menuHeight + 30 : rect.bottom + 8,
          left: rect.right - 192,
          isLastTwo,
        });
      }
      setOpenMenuId(requestId);
    }
  };

  const handleViewDetails = (escrow: Escrow) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    setSelectedRequest(escrow);
    setShowDetailsModal(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filtered = filteredRequests.map(r => r._id);
      setSelectedRequests(new Set(filtered));
    } else {
      setSelectedRequests(new Set());
    }
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    const newSelected = new Set(selectedRequests);
    if (checked) {
      newSelected.add(requestId);
    } else {
      newSelected.delete(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleApprove = async (escrowId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const result = await Swal.fire({
      title: 'Duyệt yêu cầu rút tiền?',
      html: `
        <p style="margin-bottom: 20px;">Yêu cầu sẽ được đánh dấu là đã duyệt. Owner sẽ cần xem và release tiền sau đó.</p>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: flex; align-items: center; cursor: pointer; color: #374151;">
            <input type="checkbox" id="terms-checkbox" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
            <span>Tôi cam kết chịu trách nhiệm với quyết định của mình</span>
          </label>
        </div>
        <div style="text-align: center; margin-top: 10px;">
          <a href="/terms" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 14px;">
            Xem điều khoản cam kết
          </a>
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
        
        // Disable button ban đầu
        if (confirmButton) {
          confirmButton.disabled = true;
          confirmButton.style.opacity = '0.5';
          confirmButton.style.cursor = 'not-allowed';
        }
        
        // Add event listener cho checkbox
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            const confirmButton = Swal.getConfirmButton();
            if (confirmButton) {
              if (checkbox.checked) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
              } else {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
                confirmButton.style.cursor = 'not-allowed';
              }
            }
          });
        }
      },
      preConfirm: () => {
        const checkbox = document.getElementById('terms-checkbox') as HTMLInputElement;
        if (!checkbox || !checkbox.checked) {
          return false;
        }
        return true;
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });

    if (result.isConfirmed) {
      try {
        setIsProcessing(true);
        await approveWithdrawalRequest(escrowId);
        
        // Success toast
        await Swal.fire({
          icon: 'success',
          title: 'Đã duyệt!',
          text: 'Yêu cầu rút tiền đã được duyệt. Chờ owner xem và release tiền.',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        
        fetchWithdrawalRequests();
        setShowDetailsModal(false);
        setSelectedRequest(null);
      } catch (error: any) {
        const errorMessage = formatEscrowError(error);
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async (escrowId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const result = await Swal.fire({
      title: 'Từ chối yêu cầu rút tiền',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; color: #374151; font-weight: 500;">Lý do từ chối</label>
          <textarea id="rejection-reason" placeholder="Nhập lý do từ chối..." style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; resize: vertical;"></textarea>
          <div id="reason-error" style="color: #dc2626; font-size: 14px; margin-top: 5px; display: none;"></div>
        </div>
        <div style="text-align: left; margin-bottom: 15px; margin-top: 20px;">
          <label style="display: flex; align-items: center; cursor: pointer; color: #374151;">
            <input type="checkbox" id="terms-checkbox-reject" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
            <span>Tôi cam kết chịu trách nhiệm với quyết định của mình</span>
          </label>
        </div>
        <div style="text-align: center; margin-top: 10px;">
          <a href="/terms" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 14px;">
            Xem điều khoản cam kết
          </a>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Từ chối',
      cancelButtonText: 'Hủy',
      didOpen: () => {
        const checkbox = document.getElementById('terms-checkbox-reject') as HTMLInputElement;
        const reasonInput = document.getElementById('rejection-reason') as HTMLTextAreaElement;
        const confirmButton = Swal.getConfirmButton();
        const errorDiv = document.getElementById('reason-error');
        
        // Disable button ban đầu
        if (confirmButton) {
          confirmButton.disabled = true;
          confirmButton.style.opacity = '0.5';
          confirmButton.style.cursor = 'not-allowed';
        }
        
        const validateAndUpdateButton = () => {
          const reason = reasonInput?.value?.trim() || '';
          const isCheckboxChecked = checkbox?.checked || false;
          const isValid = reason.length >= 10 && isCheckboxChecked;
          
          if (confirmButton) {
            if (isValid) {
              confirmButton.disabled = false;
              confirmButton.style.opacity = '1';
              confirmButton.style.cursor = 'pointer';
            } else {
              confirmButton.disabled = true;
              confirmButton.style.opacity = '0.5';
              confirmButton.style.cursor = 'not-allowed';
            }
          }
          
          // Update error message
          if (errorDiv) {
            if (reason.length > 0 && reason.length < 10) {
              errorDiv.textContent = 'Lý do từ chối phải có ít nhất 10 ký tự';
              errorDiv.style.display = 'block';
            } else {
              errorDiv.style.display = 'none';
            }
          }
        };
        
        // Add event listeners
        if (checkbox) {
          checkbox.addEventListener('change', validateAndUpdateButton);
        }
        if (reasonInput) {
          reasonInput.addEventListener('input', validateAndUpdateButton);
        }
      },
      preConfirm: () => {
        const checkbox = document.getElementById('terms-checkbox-reject') as HTMLInputElement;
        const reasonInput = document.getElementById('rejection-reason') as HTMLTextAreaElement;
        const reason = reasonInput?.value?.trim() || '';
        
        if (!checkbox || !checkbox.checked) {
          Swal.showValidationMessage('Vui lòng xác nhận cam kết trách nhiệm');
          return false;
        }
        
        if (!reason || reason.length < 10) {
          Swal.showValidationMessage('Vui lòng nhập lý do từ chối (ít nhất 10 ký tự)');
          return false;
        }
        
        return reason;
      },
      allowOutsideClick: () => !Swal.isLoading(),
    });

    if (result.isConfirmed && result.value) {
      const reason = result.value;
      try {
        setIsProcessing(true);
        await rejectWithdrawalRequest(escrowId, reason);
        
        // Success toast
        await Swal.fire({
          icon: 'success',
          title: 'Đã từ chối!',
          text: 'Yêu cầu rút tiền đã bị từ chối',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        
        fetchWithdrawalRequests();
        setShowDetailsModal(false);
        setSelectedRequest(null);
      } catch (error: any) {
        const errorMessage = formatEscrowError(error);
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchWithdrawalRequests();
  };

  const getStatusBadge = (status: WithdrawalRequestStatus) => {
    const label = formatWithdrawalStatus(status);
    switch (status) {
      case 'voting_completed':
        return { label, bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
      case 'admin_approved':
        return { label, bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' };
      case 'admin_rejected':
        return { label, bgColor: 'bg-red-50', textColor: 'text-red-700' };
      case 'released':
        return { label, bgColor: 'bg-green-50', textColor: 'text-green-700' };
      default:
        return { label, bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  };

  const getCampaignTitle = (campaign: string | Campaign | null | undefined): string => {
    if (!campaign) return 'N/A';
    if (typeof campaign === 'string') return 'N/A';
    return campaign.title || 'N/A';
  };

  const getCreatorInfo = (requestedBy: string | User | null | undefined): string => {
    if (!requestedBy) return 'N/A';
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy.fullname || requestedBy.username || 'N/A';
  };

  const getCreatorEmail = (requestedBy: string | User | null | undefined): string => {
    if (!requestedBy) return 'N/A';
    if (typeof requestedBy === 'string') return 'N/A';
    return requestedBy.email || 'N/A';
  };

  const filteredRequests = withdrawalRequests.filter((request) => {
    const query = searchQuery.toLowerCase();
    const campaignTitle = getCampaignTitle(request.campaign).toLowerCase();
    const creatorName = getCreatorInfo(request.requested_by).toLowerCase();
    const creatorEmail = getCreatorEmail(request.requested_by).toLowerCase();
    
    return campaignTitle.includes(query) || 
           creatorName.includes(query) || 
           creatorEmail.includes(query);
  });

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <AdminHeader />

      <AdminContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Main Title */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">Quản lý yêu cầu rút tiền</h1>
            <p className="text-sm sm:text-base text-gray-600">Xem xét và phê duyệt các yêu cầu rút tiền từ campaign creators.</p>
          </div>

          {/* Header with title, count, search and filters */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Tất cả yêu cầu <span className="text-gray-500 font-normal">({filteredRequests.length})</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              {/* Search Bar */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              
              {/* Filters Button */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                  <span className="text-xs sm:text-sm font-bold">Bộ lọc</span>
                </button>
                
                {/* Filters Dropdown */}
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 sm:p-4">
                    <div className="space-y-3 sm:space-y-4">
                      {/* Status Filter */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as WithdrawalRequestStatus)}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="voting_completed">Đã hoàn thành vote</option>
                          <option value="admin_approved">Admin đã duyệt</option>
                          <option value="admin_rejected">Admin từ chối</option>
                          <option value="released">Đã giải ngân</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 bottom-2.5 pointer-events-none text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading || isProcessing}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs sm:text-sm font-medium">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
                    <p className="text-sm sm:text-base text-gray-600">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-sm sm:text-base text-gray-600">Không có yêu cầu rút tiền nào</p>
                </div>
              ) : (
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={filteredRequests.length > 0 && filteredRequests.every(r => selectedRequests.has(r._id))}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Chiến dịch</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 hidden md:table-cell">Người yêu cầu</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Số tiền</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 hidden lg:table-cell">Kết quả vote</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Trạng thái</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 hidden sm:table-cell">Ngày yêu cầu</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRequests.map((request, index) => {
                      const statusBadge = getStatusBadge(request.request_status);
                      const isLastTwo = index >= filteredRequests.length - 2;
                      return (
                        <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedRequests.has(request._id)}
                              onChange={(e) => handleSelectRequest(request._id, e.target.checked)}
                            />
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <div className="font-medium text-gray-900 text-xs sm:text-sm">{getCampaignTitle(request.campaign)}</div>
                            <div className="text-xs text-gray-500 md:hidden mt-1">{getCreatorInfo(request.requested_by)}</div>
                            <div className="text-xs text-gray-500 sm:hidden mt-1">{formatDateOnly(request.createdAt)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="font-medium text-gray-900 text-xs sm:text-sm">{getCreatorInfo(request.requested_by)}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{getCreatorEmail(request.requested_by)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm">{formatCurrencyVND(request.withdrawal_request_amount)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            {request.votingResults && request.votingResults.totalVotes > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs sm:text-sm">
                                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                  <span className="text-green-700 font-medium">{request.votingResults.approvePercentage}%</span>
                                  <span className="text-gray-500">({request.votingResults.approveCount} phiếu)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs sm:text-sm">
                                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                                  <span className="text-red-700 font-medium">{request.votingResults.rejectPercentage}%</span>
                                  <span className="text-gray-500">({request.votingResults.rejectCount} phiếu)</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs sm:text-sm">Chưa có vote</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <span
                              className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden sm:table-cell">
                            <div className="text-xs sm:text-sm text-gray-900">{formatDateTime(request.createdAt)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <button
                              ref={(el) => {
                                buttonRefs.current[request._id] = el;
                              }}
                              onClick={() => handleToggleMenu(request._id, isLastTwo)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </AdminContentWrapper>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-semibold text-gray-900">Chi tiết yêu cầu rút tiền</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-all"
                disabled={isProcessing}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Thông tin chiến dịch
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Tên chiến dịch</p>
                    <p className="text-gray-900 font-medium">
                      {selectedRequest.campaign && typeof selectedRequest.campaign === 'object'
                        ? selectedRequest.campaign.title || 'N/A'
                        : 'N/A'}
                    </p>
                  </div>
                  {typeof selectedRequest.campaign === 'object' && (
                    <>
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Mục tiêu</p>
                        <p className="text-gray-900 font-medium">{formatCurrencyVND(selectedRequest.campaign.goal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Số tiền hiện tại</p>
                        <p className="text-gray-900 font-medium">{formatCurrencyVND(selectedRequest.campaign.current_amount)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Creator Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Thông tin người yêu cầu
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Họ tên</p>
                    <p className="text-gray-900 font-medium">{getCreatorInfo(selectedRequest.requested_by)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Tên đăng nhập</p>
                    <p className="text-gray-900 font-medium">
                      {typeof selectedRequest.requested_by === 'object'
                        ? selectedRequest.requested_by.username
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Email</p>
                    <p className="text-gray-900 font-medium">{getCreatorEmail(selectedRequest.requested_by)}</p>
                  </div>
                </div>
              </div>

              {/* Request Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Thông tin yêu cầu
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Số tiền yêu cầu</p>
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrencyVND(selectedRequest.withdrawal_request_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Trạng thái</p>
                    <div className="mt-1">
                      {(() => {
                        const badge = getStatusBadge(selectedRequest.request_status);
                        return (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${badge.bgColor} ${badge.textColor}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Ngày tạo</p>
                    <p className="text-gray-900 font-medium">{formatDateTime(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Ngày cập nhật</p>
                    <p className="text-gray-900 font-medium">{formatDateTime(selectedRequest.updatedAt)}</p>
                  </div>
                  {selectedRequest.request_reason && (
                    <div className="col-span-2">
                      <p className="text-gray-600 text-sm mb-2">Lý do yêu cầu</p>
                      <p className="text-gray-900 whitespace-pre-wrap bg-white border border-gray-200 p-3 rounded-lg">
                        {selectedRequest.request_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Voting Period */}
              {(selectedRequest.voting_start_date || selectedRequest.voting_end_date) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Thời gian vote
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
                    {selectedRequest.voting_start_date && (
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Bắt đầu</p>
                        <p className="text-gray-900 font-medium">{formatDateTime(selectedRequest.voting_start_date)}</p>
                      </div>
                    )}
                    {selectedRequest.voting_end_date && (
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Kết thúc</p>
                        <p className="text-gray-900 font-medium">{formatDateTime(selectedRequest.voting_end_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Voting Results */}
              {selectedRequest.votingResults && selectedRequest.votingResults.totalVotes > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Kết quả vote
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Approve */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="text-green-700 font-semibold">Đồng ý</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700 mb-1">
                          {selectedRequest.votingResults.approvePercentage}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedRequest.votingResults.approveCount} phiếu
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Tổng trọng số: {formatCurrencyVND(selectedRequest.votingResults.totalApproveWeight)}
                        </div>
                      </div>

                      {/* Reject */}
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                          <span className="text-red-700 font-semibold">Từ chối</span>
                        </div>
                        <div className="text-2xl font-bold text-red-700 mb-1">
                          {selectedRequest.votingResults.rejectPercentage}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedRequest.votingResults.rejectCount} phiếu
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Tổng trọng số: {formatCurrencyVND(selectedRequest.votingResults.totalRejectWeight)}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-200">
                      Tổng: {selectedRequest.votingResults.totalVotes} phiếu bầu
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Review Info */}
              {selectedRequest.admin_reviewed_at && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Thông tin admin review
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Ngày review</p>
                      <p className="text-gray-900 font-medium">{formatDateTime(selectedRequest.admin_reviewed_at)}</p>
                    </div>
                    {selectedRequest.admin_rejection_reason && (
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Lý do từ chối</p>
                        <p className="text-red-600 mt-1 bg-red-50 border border-red-200 p-3 rounded-lg">
                          {selectedRequest.admin_rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedRequest.request_status === 'voting_completed' && (
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedRequest._id)}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Duyệt yêu cầu
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest._id)}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Portal-rendered dropdown menu */}
      {openMenuId && menuPosition && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 9999,
          }}
          className="w-48 bg-white border border-gray-200 rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const request = withdrawalRequests.find(r => r._id === openMenuId);
            if (!request) return null;
            return (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(request);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Xem chi tiết
                </button>
                {request.request_status === 'voting_completed' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(request._id);
                      }}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(request._id);
                      }}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}

