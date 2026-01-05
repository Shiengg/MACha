'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, Refund } from '@/services/owner.service';
import Swal from 'sweetalert2';
import {
  RefreshCw,
  XCircle,
  Wallet,
  Search,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Info,
  User,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRefundStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    pending: 'Chờ xử lý',
    completed: 'Hoàn thành',
    failed: 'Thất bại',
    partial: 'Một phần',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    partial: 'bg-blue-100 text-blue-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export default function OwnerRefunds() {
  const searchParams = useSearchParams();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRefunds();
  }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'Hoàn tiền thành công!',
        text: 'Refund đã được chuyển thành công đến người quyên góp.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      fetchRefunds();
    } else if (payment === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'Hoàn tiền thất bại',
        text: 'Có lỗi xảy ra trong quá trình hoàn tiền.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } else if (payment === 'cancelled') {
      Swal.fire({
        icon: 'info',
        title: 'Hoàn tiền đã hủy',
        text: 'Bạn đã hủy quá trình hoàn tiền.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    }
  }, [searchParams]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getPendingRefunds();
      setRefunds(data.refunds || []);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.message || 'Không thể tải danh sách refunds',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowDetailsModal(true);
  };

  const handleProcessRefund = async (refund: Refund) => {
    const result = await Swal.fire({
      title: 'Xác nhận hoàn tiền',
      html: `
        <div class="text-left">
          <p class="mb-2">Bạn sẽ hoàn tiền cho người quyên góp:</p>
          <p class="text-2xl font-bold text-green-600 mb-4">${formatCurrencyVND(refund.refunded_amount)}</p>
          <div class="text-sm text-gray-600 space-y-1">
            <p>Campaign: <strong>${refund.campaign?.title || 'N/A'}</strong></p>
            <p>Người quyên góp: <strong>${refund.donor?.fullname || refund.donor?.username || 'N/A'}</strong></p>
            <p>Email: <strong>${refund.donor?.email || 'N/A'}</strong></p>
            <p class="mt-2">Số tiền gốc: ${formatCurrencyVND(refund.original_amount)}</p>
            <p>Tỷ lệ hoàn: ${(refund.refund_ratio * 100).toFixed(2)}%</p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Xác nhận và chuyển đến SePay',
      cancelButtonText: 'Hủy',
    });

    if (result.isConfirmed) {
      try {
        setIsProcessing(true);
        const paymentData = await ownerService.initSepayRefundPayment(refund._id, 'BANK_TRANSFER');

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentData.checkoutUrl;

        Object.entries(paymentData.formFields).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Không thể khởi tạo hoàn tiền';
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đóng',
          confirmButtonColor: '#dc2626',
        });
        setIsProcessing(false);
      }
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      refund.campaign?.title?.toLowerCase().includes(query) ||
      refund.donor?.fullname?.toLowerCase().includes(query) ||
      refund.donor?.username?.toLowerCase().includes(query) ||
      refund.donor?.email?.toLowerCase().includes(query) ||
      refund.notes?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col ml-64">
          <OwnerHeader />
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang tải...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <OwnerSidebar />
      <div className="flex-1 flex flex-col ml-64">
        <OwnerHeader />
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý hoàn tiền</h1>
              <p className="text-gray-600">Xem và xử lý các yêu cầu hoàn tiền cho người quyên góp</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo campaign, người quyên góp, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {filteredRefunds.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowLeftRight className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Không có refund nào cần xử lý</p>
                  <p className="text-gray-400 text-sm mt-2">Tất cả refunds đã được xử lý hoặc chưa có refund nào</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRefunds.map((refund) => (
                    <div
                      key={refund._id}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <ArrowLeftRight className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {refund.campaign?.title || 'N/A'}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Người quyên góp: {refund.donor?.fullname || refund.donor?.username || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Số tiền hoàn</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrencyVND(refund.refunded_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Số tiền gốc</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrencyVND(refund.original_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(refund.refund_status)}`}>
                                {formatRefundStatus(refund.refund_status)}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Tỷ lệ hoàn</p>
                              <p className="text-sm font-medium text-gray-900">
                                {(refund.refund_ratio * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>

                          {refund.notes && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-1">Ghi chú</p>
                              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                {refund.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{refund.donor?.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDateTime(refund.createdAt)}</span>
                            </div>
                            {refund.refund_method && (
                              <div className="flex items-center gap-1">
                                <Info className="w-4 h-4" />
                                <span>Phương thức: {refund.refund_method === 'escrow' ? 'Escrow' : 'Recovery'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleViewDetails(refund)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                          >
                            Chi tiết
                          </button>
                          {refund.refund_status === 'pending' && (
                            <button
                              onClick={() => handleProcessRefund(refund)}
                              disabled={isProcessing}
                              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Wallet className="w-4 h-4" />
                              Hoàn tiền
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetailsModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Chi tiết refund</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRefund(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Campaign</h3>
                <p className="text-lg font-semibold text-gray-900">{selectedRefund.campaign?.title || 'N/A'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Người quyên góp</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedRefund.donor?.fullname || selectedRefund.donor?.username || 'N/A'}
                </p>
                <p className="text-sm text-gray-500">{selectedRefund.donor?.email || ''}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Số tiền gốc</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrencyVND(selectedRefund.original_amount)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Số tiền hoàn</h3>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrencyVND(selectedRefund.refunded_amount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Tỷ lệ hoàn</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {(selectedRefund.refund_ratio * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Còn lại</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrencyVND(selectedRefund.remaining_refund)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Trạng thái</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRefund.refund_status)}`}>
                  {formatRefundStatus(selectedRefund.refund_status)}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Phương thức</h3>
                <p className="text-gray-900 capitalize">
                  {selectedRefund.refund_method === 'escrow' ? 'Escrow (Từ số tiền còn lại)' : 'Recovery (Từ recovery case)'}
                </p>
              </div>

              {selectedRefund.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Ghi chú</h3>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">
                    {selectedRefund.notes}
                  </p>
                </div>
              )}

              {selectedRefund.refund_transaction_id && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Transaction ID</h3>
                  <p className="text-gray-900 font-mono text-sm">{selectedRefund.refund_transaction_id}</p>
                </div>
              )}

              {selectedRefund.refunded_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Thời gian hoàn tiền</h3>
                  <p className="text-gray-900">{formatDateTime(selectedRefund.refunded_at)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Ngày tạo</h3>
                  <p className="text-gray-900">{formatDateTime(selectedRefund.createdAt)}</p>
                </div>
                {selectedRefund.created_by && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Tạo bởi</h3>
                    <p className="text-gray-900">{selectedRefund.created_by?.username || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRefund(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Đóng
              </button>
              {selectedRefund.refund_status === 'pending' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleProcessRefund(selectedRefund);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Hoàn tiền
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

