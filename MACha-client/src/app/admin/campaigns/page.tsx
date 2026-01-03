'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getAllCampaigns, approveCampaign, rejectCampaign, Campaign } from '@/services/admin/campaign.service';
import Swal from 'sweetalert2';
import { MoreVertical, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';

export default function AdminCampaignApproval() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; isLastTwo: boolean } | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

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

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getAllCampaigns();
      setCampaigns(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to fetch campaigns',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMenu = (campaignId: string, isLastTwo: boolean) => {
    if (openMenuId === campaignId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = buttonRefs.current[campaignId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuHeight = 150;
        setMenuPosition({
          top: isLastTwo ? rect.top - menuHeight + 30 : rect.bottom + 8,
          left: rect.right - 192,
          isLastTwo,
        });
      }
      setOpenMenuId(campaignId);
    }
  };

  const handleApprove = async (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const result = await Swal.fire({
      title: 'Duyệt chiến dịch?',
      html: `
        <p style="margin-bottom: 20px;">Chiến dịch sẽ được kích hoạt và hiển thị trên hệ thống.</p>
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
        await approveCampaign(id);
        Swal.fire('Đã duyệt!', 'Chiến dịch đã được duyệt thành công', 'success');
        fetchCampaigns();
      } catch (error: any) {
        Swal.fire('Lỗi', error?.response?.data?.message || 'Không thể duyệt chiến dịch', 'error');
      }
    }
  };

  const handleViewDetails = (campaignId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    router.push(`/admin/campaigns/${campaignId}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(new Set(paginatedCampaigns.map(c => c._id)));
    } else {
      setSelectedCampaigns(new Set());
    }
  };

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaigns);
    if (checked) {
      newSelected.add(campaignId);
    } else {
      newSelected.delete(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const handleReject = async (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const { value: reason } = await Swal.fire({
      title: 'Reject Campaign',
      input: 'textarea',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Enter reason...',
      inputAttributes: {
        'aria-label': 'Enter rejection reason',
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason!';
        }
      },
    });

    if (reason) {
      try {
        await rejectCampaign(id, reason);
        Swal.fire('Rejected!', 'Campaign has been rejected', 'success');
        fetchCampaigns();
      } catch (error: any) {
        Swal.fire('Error', error?.response?.data?.message || 'Failed to reject campaign', 'error');
      }
    }
  };

  const filteredCampaigns = campaigns
    .filter((campaign) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        campaign.title?.toLowerCase().includes(query) ||
        campaign.creator?.username?.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Đang hoạt động', bgColor: 'bg-green-50', textColor: 'text-green-700' };
      case 'pending':
        return { label: 'Chờ duyệt', bgColor: 'bg-amber-50', textColor: 'text-amber-700' };
      case 'rejected':
        return { label: 'Từ chối', bgColor: 'bg-red-50', textColor: 'text-red-700' };
      case 'completed':
        return { label: 'Hoàn thành', bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
      case 'cancelled':
        return { label: 'Đã hủy', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
      default:
        return { label: status, bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          {/* Main Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Quản lý chiến dịch</h1>
            <p className="text-gray-600">Quản lý, tìm kiếm và lọc các chiến dịch trong hệ thống.</p>
          </div>

          {/* Header with title, count, search and filters */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Tất cả chiến dịch <span className="text-gray-500 font-normal">({filteredCampaigns.length})</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
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
              
              {/* Filters Button */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-lg border border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-bold">Filters</span>
                </button>
                
                {/* Filters Dropdown */}
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                    <div className="space-y-4">
                      {/* Status Filter */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Tất cả</option>
                          <option value="pending">Chờ duyệt</option>
                          <option value="active">Đang hoạt động</option>
                          <option value="rejected">Từ chối</option>
                          <option value="completed">Hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 bottom-2.5 pointer-events-none text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Không tìm thấy chiến dịch</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="px-6 py-3 text-left">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every(c => selectedCampaigns.has(c._id))}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Tên chiến dịch</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Người tạo</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Mục tiêu</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Ngày tạo</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Trạng thái</th>
                      <th className="px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedCampaigns.map((campaign, index) => {
                      const statusBadge = getStatusBadge(campaign.status);
                      const isLastTwo = index >= paginatedCampaigns.length - 2;
                      return (
                        <tr key={campaign._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedCampaigns.has(campaign._id)}
                              onChange={(e) => handleSelectCampaign(campaign._id, e.target.checked)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{campaign.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{campaign.creator?.fullname || campaign.creator?.username || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatCurrency(campaign.goal_amount || 0)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDate(campaign.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              ref={(el) => {
                                buttonRefs.current[campaign._id] = el;
                              }}
                              onClick={() => handleToggleMenu(campaign._id, isLastTwo)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredCampaigns.length)} / {filteredCampaigns.length} chiến dịch
                {searchQuery && ` (lọc từ ${campaigns.length} tổng)`}
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
            const campaign = campaigns.find(c => c._id === openMenuId);
            if (!campaign) return null;
            return (
              <>
                {campaign.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(campaign._id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(campaign._id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Từ chối
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(campaign._id);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Xem chi tiết
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}

