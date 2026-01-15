'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService, UserHistoryItem } from '@/services/owner.service';
import Swal from 'sweetalert2';
import { ArrowLeft, Calendar, DollarSign, FileText, Flag, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function UserHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<UserHistoryItem[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchHistory();
  }, [userId, currentPage]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getUserHistory(userId, currentPage, itemsPerPage);
      setUser(data.user);
      setHistory(data.history);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.pages);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tải lịch sử người dùng',
      });
      router.push('/owner/users');
    } finally {
      setLoading(false);
    }
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <LogIn className="w-5 h-5 text-blue-600" />;
      case 'donate':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'post':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'report':
        return <Flag className="w-5 h-5 text-red-600" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatHistoryItem = (item: UserHistoryItem) => {
    switch (item.type) {
      case 'login':
        return (
          <div>
            <div className="font-semibold text-gray-900">Tài khoản đã được tạo</div>
            <div className="text-sm text-gray-500">{item.details}</div>
          </div>
        );
      case 'donate':
        return (
          <div>
            <div className="font-semibold text-gray-900">
              Đã quyên góp {item.amount?.toLocaleString()} {item.currency} 
              {item.campaign && ` cho ${item.campaign.title}`}
            </div>
            <div className="text-sm text-gray-500">
              Phương thức: {item.donation_method} | Trạng thái: {item.payment_status}
            </div>
          </div>
        );
      case 'post':
        return (
          <div>
            <div className="font-semibold text-gray-900">Đã tạo bài viết</div>
            <div className="text-sm text-gray-500">
              {item.content_preview}
              {item.campaign && ` | Chiến dịch: ${item.campaign.title}`}
              {item.event && ` | Sự kiện: ${item.event.title}`}
              {item.is_hidden && ' (Đã ẩn)'}
            </div>
          </div>
        );
      case 'report':
        return (
          <div>
            <div className="font-semibold text-gray-900">
              Đã báo cáo {item.reported_type} - {item.reported_reason}
            </div>
            <div className="text-sm text-gray-500">
              Trạng thái: {item.status} {item.resolution && `| Giải quyết: ${item.resolution}`}
            </div>
          </div>
        );
      default:
        return <div className="text-gray-900">{item.action}</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OwnerSidebar />
        <OwnerHeader />
        <OwnerContentWrapper>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Đang tải...</p>
            </div>
          </div>
        </OwnerContentWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6">
            <Link
              href="/owner/users"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-3 sm:mb-4 text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              Quay lại Người dùng
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                Lịch sử người dùng: {user?.username}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">{user?.email}</p>
            </div>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Tổng quyên góp</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{statistics.total_donations}</div>
                  </div>
                  <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Tổng bài viết</div>
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{statistics.total_posts}</div>
                  </div>
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Tổng báo cáo</div>
                    <div className="text-xl sm:text-2xl font-bold text-red-600">{statistics.total_reports}</div>
                  </div>
                  <Flag className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                </div>
              </div>
            </div>
          )}

          {/* History List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Lịch sử hoạt động</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {history.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                  Không tìm thấy lịch sử cho người dùng này
                </div>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="p-4 sm:p-6 hover:bg-gray-50">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getHistoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base">{formatHistoryItem(item)}</div>
                        <div className="mt-2 text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-200 flex-wrap gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Trước
                </button>
                <span className="text-xs sm:text-sm text-gray-700">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </OwnerContentWrapper>
    </div>
  );
}

