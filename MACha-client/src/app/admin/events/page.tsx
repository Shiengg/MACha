'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminContentWrapper from '@/components/admin/AdminContentWrapper';
import EventDetailModal from '@/components/admin/EventDetailModal';
import { getPendingEvents, getAllEvents, approveEvent, rejectEvent, AdminEvent } from '@/services/admin/event.service';
import Swal from 'sweetalert2';
import { MoreVertical, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';

export default function AdminEventApproval() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; isLastTwo: boolean } | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchEvents();
  }, [statusFilter]);

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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let data: AdminEvent[] = [];
      
      if (statusFilter === 'pending') {
        data = await getPendingEvents();
      } else if (statusFilter === 'all') {
        data = await getAllEvents();
      } else {
        data = await getAllEvents({ status: statusFilter });
      }
      
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tải danh sách sự kiện',
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMenu = (eventId: string, isLastTwo: boolean) => {
    if (openMenuId === eventId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = buttonRefs.current[eventId];
      if (button) {
        const rect = button.getBoundingClientRect();
        // Estimate menu height is about 150px for 3 items
        const menuHeight = 150;
        setMenuPosition({
          top: isLastTwo ? rect.top - menuHeight + 30 : rect.bottom + 8,
          left: rect.right - 192, // 192 = w-48 (12rem = 192px)
          isLastTwo,
        });
      }
      setOpenMenuId(eventId);
    }
  };

  const handleApprove = async (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const result = await Swal.fire({
      title: 'Duyệt sự kiện?',
      html: `
        <p style="margin-bottom: 20px;">Sự kiện sẽ được kích hoạt và hiển thị trên hệ thống.</p>
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
        
        if (confirmButton) {
          confirmButton.disabled = true;
          confirmButton.style.opacity = '0.5';
          confirmButton.style.cursor = 'not-allowed';
        }
        
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
        await approveEvent(id);
        Swal.fire('Đã duyệt!', 'Sự kiện đã được duyệt thành công', 'success');
        fetchEvents();
        if (showDetailModal && selectedEventId === id) {
          setShowDetailModal(false);
          setSelectedEventId(null);
        }
      } catch (error: any) {
        Swal.fire('Lỗi', error?.response?.data?.message || 'Không thể duyệt sự kiện', 'error');
      }
    }
  };

  const handleViewDetails = (eventId: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    setSelectedEventId(eventId);
    setShowDetailModal(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEvents(new Set(paginatedEvents.map(e => e._id)));
    } else {
      setSelectedEvents(new Set());
    }
  };

  const handleSelectEvent = (eventId: string, checked: boolean) => {
    const newSelected = new Set(selectedEvents);
    if (checked) {
      newSelected.add(eventId);
    } else {
      newSelected.delete(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const handleReject = async (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    const { value: reason } = await Swal.fire({
      title: 'Từ chối sự kiện',
      input: 'textarea',
      inputLabel: 'Lý do từ chối',
      inputPlaceholder: 'Nhập lý do...',
      inputAttributes: {
        'aria-label': 'Enter rejection reason',
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Từ chối',
      inputValidator: (value) => {
        if (!value) {
          return 'Bạn cần cung cấp lý do!';
        }
      },
    });

    if (reason) {
      try {
        await rejectEvent(id, reason);
        Swal.fire('Đã từ chối!', 'Sự kiện đã được từ chối', 'success');
        fetchEvents();
        if (showDetailModal && selectedEventId === id) {
          setShowDetailModal(false);
          setSelectedEventId(null);
        }
      } catch (error: any) {
        Swal.fire('Lỗi', error?.response?.data?.message || 'Không thể từ chối sự kiện', 'error');
      }
    }
  };

  const filteredEvents = events
    .filter((event) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        event.title?.toLowerCase().includes(query) ||
        event.creator?.username?.toLowerCase().includes(query);
      
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { label: 'Đã xuất bản', bgColor: 'bg-green-50', textColor: 'text-green-700' };
      case 'pending':
        return { label: 'Chờ duyệt', bgColor: 'bg-amber-50', textColor: 'text-amber-700' };
      case 'rejected':
        return { label: 'Từ chối', bgColor: 'bg-red-50', textColor: 'text-red-700' };
      case 'cancelled':
        return { label: 'Đã hủy', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
      case 'completed':
        return { label: 'Hoàn thành', bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
      default:
        return { label: status, bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      'volunteering': 'Tình nguyện',
      'fundraising': 'Gây quỹ',
      'charity_event': 'Sự kiện từ thiện',
      'donation_drive': 'Tập hợp đóng góp',
    };
    return categories[category] || category;
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <AdminHeader />
      
      <AdminContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Main Title */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">Quản lý sự kiện</h1>
            <p className="text-sm sm:text-base text-gray-600">Quản lý, tìm kiếm và lọc các sự kiện trong hệ thống.</p>
          </div>

          {/* Header with title, count, search and filters */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {statusFilter === 'pending' ? 'Sự kiện chờ duyệt' : 
                 statusFilter === 'all' ? 'Tất cả sự kiện' :
                 `Sự kiện ${getStatusBadge(statusFilter).label.toLowerCase()}`}
                <span className="text-gray-500 font-normal"> ({filteredEvents.length})</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search"
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
                  <span className="text-xs sm:text-sm font-bold">Filters</span>
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
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Tất cả</option>
                          <option value="pending">Chờ duyệt</option>
                          <option value="published">Đã xuất bản</option>
                          <option value="rejected">Từ chối</option>
                          <option value="cancelled">Đã hủy</option>
                          <option value="completed">Hoàn thành</option>
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
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
                    <p className="text-sm sm:text-base text-gray-600">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-sm sm:text-base text-gray-600 mb-2">
                    {statusFilter === 'pending' 
                      ? 'Không có sự kiện nào đang chờ duyệt'
                      : searchQuery
                      ? 'Không tìm thấy sự kiện phù hợp với từ khóa'
                      : `Không có sự kiện nào với trạng thái "${getStatusBadge(statusFilter).label}"`}
                  </p>
                  {statusFilter === 'pending' && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      Các sự kiện mới tạo sẽ có trạng thái "Chờ duyệt" và xuất hiện ở đây
                    </p>
                  )}
                </div>
              ) : (
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={paginatedEvents.length > 0 && paginatedEvents.every(e => selectedEvents.has(e._id))}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Tên sự kiện</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 hidden md:table-cell">Người tạo</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 hidden lg:table-cell">Loại</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900 hidden sm:table-cell">Ngày bắt đầu</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Trạng thái</th>
                      <th className="px-3 sm:px-4 lg:px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEvents.map((event, index) => {
                      const statusBadge = getStatusBadge(event.status);
                      const isLastTwo = index >= paginatedEvents.length - 2;
                      return (
                        <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedEvents.has(event._id)}
                              onChange={(e) => handleSelectEvent(event._id, e.target.checked)}
                            />
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <div className="font-medium text-gray-900 text-xs sm:text-sm">{event.title}</div>
                            <div className="text-xs text-gray-500 md:hidden mt-1">{event.creator?.fullname || event.creator?.username || 'Unknown'}</div>
                            <div className="text-xs text-gray-500 lg:hidden mt-1">{getCategoryLabel(event.category)}</div>
                            <div className="text-xs text-gray-500 sm:hidden mt-1">{formatDate(event.start_date)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="text-xs sm:text-sm text-gray-900">{event.creator?.fullname || event.creator?.username || 'Unknown'}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <div className="text-xs sm:text-sm text-gray-900">{getCategoryLabel(event.category)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hidden sm:table-cell">
                            <div className="text-xs sm:text-sm text-gray-900">{formatDate(event.start_date)}</div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <span
                              className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            <button
                              ref={(el) => {
                                buttonRefs.current[event._id] = el;
                              }}
                              onClick={() => handleToggleMenu(event._id, isLastTwo)}
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

            {/* Pagination */}
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 bg-gray-50">
              <div className="text-xs sm:text-sm text-gray-600">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} / {filteredEvents.length} sự kiện
                {searchQuery && <span className="hidden sm:inline"> (lọc từ {events.length} tổng)</span>}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-400'
                  }`}
                >
                  Previous
                </button>
                
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 sm:px-4 py-2 text-gray-400 text-xs sm:text-sm">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm ${
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
                  className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm ${
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
      </AdminContentWrapper>

      {/* Event Detail Modal */}
      {selectedEventId && (
        <EventDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEventId(null);
          }}
          eventId={selectedEventId}
          onEventUpdated={() => {
            fetchEvents();
          }}
        />
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
            const event = events.find(e => e._id === openMenuId);
            if (!event) return null;
            return (
              <>
                {event.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(event._id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(event._id);
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
                    handleViewDetails(event._id);
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

