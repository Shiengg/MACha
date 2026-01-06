'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { recoveryService, RecoveryCase } from '@/services/recovery.service';
import Swal from 'sweetalert2';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  Wallet,
  XCircle,
  FileText,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    legal_action: 'bg-purple-100 text-purple-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

function formatStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    pending: 'Chờ thanh toán',
    in_progress: 'Đang xử lý',
    completed: 'Đã hoàn thành',
    failed: 'Thất bại',
    legal_action: 'Hành động pháp lý',
  };
  return statusMap[status] || status;
}

function getDaysRemaining(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function PaymentNotificationHandler({ onPaymentSuccess }: { onPaymentSuccess: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'Thanh toán thành công!',
        text: 'Thanh toán của bạn đã được ghi nhận. Chúng tôi sẽ xử lý và hoàn tiền cho người quyên góp.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      onPaymentSuccess();
    } else if (payment === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'Thanh toán thất bại',
        text: 'Có lỗi xảy ra trong quá trình thanh toán.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } else if (payment === 'cancelled') {
      Swal.fire({
        icon: 'info',
        title: 'Thanh toán đã hủy',
        text: 'Bạn đã hủy quá trình thanh toán.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    }
  }, [searchParams, onPaymentSuccess]);

  return null;
}

function CreatorRecoveryCasesContent() {
  const router = useRouter();
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRecoveryCases();
  }, []);

  const fetchRecoveryCases = async () => {
    try {
      setLoading(true);
      const data = await recoveryService.getRecoveryCasesByCreator();
      setRecoveryCases(data.recoveryCases || []);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.message || 'Không thể tải danh sách recovery cases',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (recoveryCase: RecoveryCase) => {
    try {
      const data = await recoveryService.getRecoveryCaseById(recoveryCase._id);
      setSelectedCase(data.recoveryCase);
      setShowDetailsModal(true);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.message || 'Không thể tải chi tiết recovery case',
      });
    }
  };

  const handlePayment = async (recoveryCase: RecoveryCase) => {
    const remainingAmount = recoveryCase.total_amount - recoveryCase.recovered_amount;

    const result = await Swal.fire({
      title: 'Xác nhận thanh toán',
      html: `
        <div class="text-left">
          <p class="mb-2">Bạn sẽ thanh toán số tiền còn lại:</p>
          <p class="text-2xl font-bold text-green-600 mb-4">${formatCurrencyVND(remainingAmount)}</p>
          <div class="text-sm text-gray-600 space-y-1">
            <p>Campaign: <strong>${recoveryCase.campaign?.title || 'N/A'}</strong></p>
            <p>Tổng số tiền cần hoàn: <strong>${formatCurrencyVND(recoveryCase.total_amount)}</strong></p>
            <p>Đã hoàn: <strong>${formatCurrencyVND(recoveryCase.recovered_amount)}</strong></p>
            <p class="font-semibold text-gray-900">Còn lại cần thanh toán: <strong class="text-orange-600">${formatCurrencyVND(remainingAmount)}</strong></p>
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
        const paymentData = await recoveryService.initSepayRecoveryPayment(
          recoveryCase._id,
          'BANK_TRANSFER'
        );

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
        const errorMessage = error?.response?.data?.message || error?.message || 'Không thể khởi tạo thanh toán';
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

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <PaymentNotificationHandler onPaymentSuccess={fetchRecoveryCases} />
      </Suspense>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Các trường hợp hoàn tiền</h1>
            <p className="text-gray-600">Quản lý các trường hợp cần hoàn tiền từ các campaign đã bị hủy</p>
          </div>

          {recoveryCases.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Chưa có trường hợp nào
              </h3>
              <p className="text-gray-600">
                Bạn chưa có campaign nào cần hoàn tiền
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recoveryCases.map((recoveryCase) => {
                const remainingAmount = recoveryCase.total_amount - recoveryCase.recovered_amount;
                const progressPercentage = (recoveryCase.recovered_amount / recoveryCase.total_amount) * 100;
                const daysRemaining = getDaysRemaining(recoveryCase.deadline);
                const isOverdue = daysRemaining < 0;

                return (
                  <div
                    key={recoveryCase._id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {recoveryCase.campaign?.title || 'N/A'}
                              </h3>
                              <Link
                                href={`/campaigns/${recoveryCase.campaign._id}`}
                                className="text-purple-600 hover:text-purple-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                            <p className="text-sm text-gray-500">
                              Deadline: {formatDate(recoveryCase.deadline)}
                              {isOverdue && (
                                <span className="ml-2 text-red-600 font-semibold">
                                  (Quá hạn {Math.abs(daysRemaining)} ngày)
                                </span>
                              )}
                              {!isOverdue && daysRemaining > 0 && (
                                <span className="ml-2 text-orange-600 font-semibold">
                                  (Còn {daysRemaining} ngày)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Tiến độ hoàn tiền</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrencyVND(recoveryCase.recovered_amount)} / {formatCurrencyVND(recoveryCase.total_amount)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-green-500 h-3 rounded-full transition-all"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tổng số tiền</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrencyVND(recoveryCase.total_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Đã hoàn</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrencyVND(recoveryCase.recovered_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Còn lại</p>
                            <p className="text-lg font-bold text-orange-600">
                              {formatCurrencyVND(remainingAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recoveryCase.status)}`}>
                              {formatStatus(recoveryCase.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleViewDetails(recoveryCase)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                          Chi tiết
                        </button>
                        {recoveryCase.status !== 'completed' && remainingAmount > 0 && (
                          <button
                            onClick={() => handlePayment(recoveryCase)}
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <Wallet className="w-4 h-4" />
                            Thanh toán
                          </button>
                        )}
                        {recoveryCase.status === 'completed' && (
                          <div className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle2 className="w-4 h-4 inline mr-2" />
                            Đã hoàn thành
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showDetailsModal && selectedCase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Chi tiết recovery case</h2>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedCase(null);
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
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCase.campaign?.title || 'N/A'}
                    </p>
                    <Link
                      href={`/campaigns/${selectedCase.campaign._id}`}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Tổng số tiền</h3>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrencyVND(selectedCase.total_amount)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Đã hoàn</h3>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrencyVND(selectedCase.recovered_amount)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Còn lại</h3>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrencyVND(selectedCase.total_amount - selectedCase.recovered_amount)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Trạng thái</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCase.status)}`}>
                      {formatStatus(selectedCase.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Deadline</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(selectedCase.deadline)}</p>
                    {getDaysRemaining(selectedCase.deadline) < 0 && (
                      <span className="ml-2 text-red-600 font-semibold">
                        (Quá hạn {Math.abs(getDaysRemaining(selectedCase.deadline))} ngày)
                      </span>
                    )}
                  </div>
                </div>

                {selectedCase.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Ghi chú</h3>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">
                      {selectedCase.notes}
                    </p>
                  </div>
                )}

                {selectedCase.timeline && selectedCase.timeline.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Lịch sử</h3>
                    <div className="space-y-3">
                      {selectedCase.timeline.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-900">{item.action}</p>
                              <p className="text-xs text-gray-500">{formatDateTime(item.date)}</p>
                            </div>
                            {item.amount !== 0 && (
                              <p className="text-sm text-gray-600 mb-1">
                                Số tiền: <span className="font-semibold">{formatCurrencyVND(item.amount)}</span>
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-sm text-gray-600">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCase(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Đóng
                </button>
                {selectedCase.status !== 'completed' && (selectedCase.total_amount - selectedCase.recovered_amount) > 0 && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handlePayment(selectedCase);
                    }}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Thanh toán
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function CreatorRecoveryCases() {
  return <CreatorRecoveryCasesContent />;
}

