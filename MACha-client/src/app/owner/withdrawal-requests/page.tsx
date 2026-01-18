'use client';

import { useState, useEffect, useRef } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService } from '@/services/owner.service';
import { escrowService } from '@/services/escrow.service';
import { cloudinaryService } from '@/services/cloudinary.service';
import { Escrow, Campaign, User } from '@/services/escrow.service';
import { formatCurrencyVND, formatDateTime, formatWithdrawalStatus } from '@/utils/escrow.utils';
import Swal from 'sweetalert2';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  MoreVertical,
  Search,
  Wallet,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function OwnerWithdrawalRequests() {
  const searchParams = useSearchParams();
  const [withdrawalRequests, setWithdrawalRequests] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Escrow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseEscrow, setReleaseEscrow] = useState<Escrow | null>(null);
  const [proofImages, setProofImages] = useState<File[]>([]);
  const [proofImageUrls, setProofImageUrls] = useState<string[]>([]);
  const [disbursementNote, setDisbursementNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper functions to safely access nested properties
  const getCampaignTitle = (campaign: string | Campaign | undefined): string => {
    if (!campaign) return 'N/A';
    return typeof campaign === 'string' ? campaign : campaign.title || 'N/A';
  };

  const getUserName = (user: string | User | undefined | null): string => {
    if (!user) return 'N/A';
    if (typeof user === 'string') return user;
    return user.fullname || user.username || 'N/A';
  };

  const getUserEmail = (user: string | User | undefined | null): string => {
    if (!user) return '';
    if (typeof user === 'string') return '';
    return user.email || '';
  };

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const escrowId = searchParams.get('escrowId');
    
    if (payment === 'success') {
      // Nếu có escrowId, tự động mở modal upload bill giải ngân
      if (escrowId) {
        // Fetch lại danh sách và tìm escrow từ response (tránh closure issue)
        ownerService.getAdminApprovedWithdrawalRequests()
          .then((data) => {
            const escrows = data.escrows || [];
            const escrow = escrows.find((e: Escrow) => e._id === escrowId);
            
            // Update state
            setWithdrawalRequests(escrows);
            
            if (escrow) {
              // Mở modal sau một chút để đảm bảo state đã update
              setTimeout(() => {
                handleReleaseEscrow(escrow);
                // Xóa params khỏi URL
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('payment');
                newUrl.searchParams.delete('escrowId');
                window.history.replaceState({}, '', newUrl.toString());
              }, 100);
            }
          })
          .catch((error) => {
            console.error('Error fetching withdrawal requests:', error);
            fetchWithdrawalRequests();
          });
        
        Swal.fire({
          icon: 'success',
          title: 'Thanh toán thành công!',
          text: 'Vui lòng upload bill giải ngân để hoàn tất quá trình.',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
      } else {
        // Không có escrowId, chỉ hiển thị thông báo
        Swal.fire({
          icon: 'success',
          title: 'Thanh toán thành công!',
          text: 'Thanh toán đã được ghi nhận.',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        fetchWithdrawalRequests();
      }
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
  }, [searchParams]);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getAdminApprovedWithdrawalRequests();
      setWithdrawalRequests(data.escrows || []);
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

  const handleViewDetails = (escrow: Escrow) => {
    setOpenMenuId(null);
    setSelectedRequest(escrow);
    setShowDetailsModal(true);
  };

  const handleReleaseEscrow = (escrow: Escrow) => {
    setOpenMenuId(null);
    setReleaseEscrow(escrow);
    setShowReleaseModal(true);
    setProofImages([]);
    setProofImageUrls([]);
    setDisbursementNote('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Vui lòng chọn file ảnh hợp lệ (jpg, png)',
      });
      return;
    }

    // Validate file size (max 5MB per image)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = imageFiles.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: `Một số file vượt quá 5MB. Vui lòng chọn file nhỏ hơn.`,
      });
      return;
    }

    // Limit to 10 images
    const remainingSlots = 10 - proofImages.length;
    if (imageFiles.length > remainingSlots) {
      Swal.fire({
        icon: 'warning',
        title: 'Cảnh báo',
        text: `Chỉ có thể upload tối đa 10 ảnh. Đã chọn ${remainingSlots} ảnh đầu tiên.`,
      });
      imageFiles.splice(remainingSlots);
    }

    setProofImages([...proofImages, ...imageFiles]);
    
    // Create preview URLs
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofImageUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setProofImages(prev => prev.filter((_, i) => i !== index));
    setProofImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRelease = async () => {
    if (proofImages.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Vui lòng upload ít nhất 1 ảnh bill giải ngân',
      });
      return;
    }

    if (!releaseEscrow) return;

    const result = await Swal.fire({
      title: 'Xác nhận giải ngân',
      html: `
        <div class="text-left">
          <p class="mb-2">Bạn sắp giải ngân escrow với:</p>
          <p class="text-lg font-semibold mb-2">${formatCurrencyVND(releaseEscrow.withdrawal_request_amount)}</p>
          <p class="text-sm text-gray-600 mb-4">${proofImages.length} ảnh bill giải ngân</p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Bill giải ngân là bằng chứng tài chính bắt buộc và sẽ được công khai để đảm bảo minh bạch cho cộng đồng.
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Xác nhận giải ngân',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      setIsReleasing(true);
      setIsUploading(true);

      // Upload images to Cloudinary
      const uploadResults = await cloudinaryService.uploadMultipleImages(proofImages, 'escrow-proofs');
      const imageUrls = uploadResults.map(result => result.secure_url);

      // Release escrow
      const result = await escrowService.releaseEscrow(releaseEscrow._id, {
        disbursement_proof_images: imageUrls,
        disbursement_note: disbursementNote || undefined,
      });

      // Reset loading state trước khi hiển thị Swal để tránh block
      setIsReleasing(false);
      setIsUploading(false);

      // Reset form and close modal
      setShowReleaseModal(false);
      setReleaseEscrow(null);
      setProofImages([]);
      setProofImageUrls([]);
      setDisbursementNote('');
      
      // Refresh list
      await fetchWithdrawalRequests();

      // Hiển thị thông báo thành công sau khi đã reset state
      Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: 'Escrow đã được giải ngân thành công với bill giải ngân',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error('Error releasing escrow:', error);
      
      // Reset loading state ngay lập tức
      setIsReleasing(false);
      setIsUploading(false);

      // Kiểm tra xem escrow đã được release chưa (có thể đã thành công nhưng response lỗi)
      try {
        await fetchWithdrawalRequests();
        const updatedEscrows = await ownerService.getAdminApprovedWithdrawalRequests();
        const updatedEscrow = updatedEscrows.escrows?.find((e: Escrow) => e._id === releaseEscrow._id);
        
        if (updatedEscrow && updatedEscrow.request_status === 'released' && updatedEscrow.disbursement_proof_images && updatedEscrow.disbursement_proof_images.length > 0) {
          // Escrow đã được release thành công, chỉ là response có vấn đề
          setShowReleaseModal(false);
          setReleaseEscrow(null);
          setProofImages([]);
          setProofImageUrls([]);
          setDisbursementNote('');
          
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: 'Escrow đã được giải ngân thành công với minh chứng giải ngân',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          return;
        }
      } catch (checkError) {
        console.error('Error checking escrow status:', checkError);
      }

      // Nếu không phải đã release, hiển thị lỗi
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || error?.message || 'Không thể giải ngân escrow',
      });
    }
  };

  const handleProcessPayment = async (escrow: Escrow) => {
    setOpenMenuId(null);

    const campaignTitle =
      typeof escrow.campaign === 'string' ? escrow.campaign : escrow.campaign?.title;

    const requesterName =
      typeof escrow.requested_by === 'string'
        ? escrow.requested_by
        : escrow.requested_by?.fullname || escrow.requested_by?.username;

    const result = await Swal.fire({
      title: 'Xác nhận chuyển khoản',
      html: `
        <div class="text-left">
          <p class="mb-2">Bạn sẽ chuyển khoản số tiền:</p>
          <p class="text-2xl font-bold text-green-600 mb-4">${formatCurrencyVND(escrow.withdrawal_request_amount)}</p>
          <p class="text-sm text-gray-600 mb-2">Campaign: <strong>${campaignTitle || 'N/A'}</strong></p>
          <p class="text-sm text-gray-600">Người yêu cầu: <strong>${requesterName || 'N/A'}</strong></p>
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
        const paymentData = await ownerService.initSepayWithdrawalPayment(escrow._id, 'BANK_TRANSFER');

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

  const filteredRequests = withdrawalRequests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    const campaignTitle = typeof request.campaign === 'string' 
      ? request.campaign 
      : request.campaign?.title;
    
    const requesterName = typeof request.requested_by === 'string'
      ? request.requested_by
      : request.requested_by?.fullname || request.requested_by?.username;
    
    const requesterUsername = typeof request.requested_by === 'string'
      ? request.requested_by
      : request.requested_by?.username;
    
    return (
      campaignTitle?.toLowerCase().includes(query) ||
      requesterName?.toLowerCase().includes(query) ||
      requesterUsername?.toLowerCase().includes(query) ||
      request.request_reason?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <OwnerSidebar />
        <OwnerHeader />
        <OwnerContentWrapper>
          <div className="p-4 sm:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang tải...</p>
            </div>
          </div>
        </OwnerContentWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <OwnerSidebar />
      <OwnerHeader />
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Yêu cầu rút tiền đã duyệt</h1>
              <p className="text-sm sm:text-base text-gray-600">Xem và xử lý các yêu cầu rút tiền đã được admin duyệt</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo campaign, người yêu cầu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Không có yêu cầu rút tiền nào</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredRequests.map((request) => (
                    <div
                      key={request._id}
                      className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-0">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 sm:gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                                {getCampaignTitle(request.campaign)}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-500">
                                Yêu cầu bởi: {getUserName(request.requested_by)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Số tiền</p>
                              <p className="text-base sm:text-lg font-bold text-green-600">
                                {formatCurrencyVND(request.withdrawal_request_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {formatWithdrawalStatus(request.request_status)}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Ngày tạo</p>
                              <p className="text-xs sm:text-sm font-medium text-gray-900">
                                {formatDateTime(request.createdAt)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Admin duyệt</p>
                              <p className="text-xs sm:text-sm font-medium text-gray-900">
                                {getUserName(request.admin_reviewed_by)}
                              </p>
                            </div>
                          </div>

                          {request.request_reason && (
                            <div className="mb-3 sm:mb-4">
                              <p className="text-xs text-gray-500 mb-1">Lý do yêu cầu</p>
                              <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 sm:p-3 rounded-lg">
                                {request.request_reason}
                              </p>
                            </div>
                          )}

                          {request.votingResults && (
                            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-2">Kết quả voting</p>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                <span className="text-green-600">
                                  ✓ Phê duyệt: {request.votingResults.approveCount} ({request.votingResults.approvePercentage}
                                  %)
                                </span>
                                <span className="text-red-600">
                                  ✗ Từ chối: {request.votingResults.rejectCount} ({request.votingResults.rejectPercentage}
                                  %)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-4">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex-1 sm:flex-none"
                          >
                            Chi tiết
                          </button>
                          {request.request_status === 'admin_approved' && (
                            <>
                              <button
                                onClick={() => handleProcessPayment(request)}
                                disabled={isProcessing}
                                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-1 sm:flex-none justify-center"
                              >
                                <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Chuyển khoản</span>
                                <span className="sm:hidden">Chuyển</span>
                              </button>
                            </>
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
      </OwnerContentWrapper>

      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Chi tiết yêu cầu rút tiền</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Chiến dịch</h3>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{getCampaignTitle(selectedRequest.campaign)}</p>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Người yêu cầu</h3>
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {getUserName(selectedRequest.requested_by)}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">{getUserEmail(selectedRequest.requested_by)}</p>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Số tiền yêu cầu</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrencyVND(selectedRequest.withdrawal_request_amount)}
                </p>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">Lý do yêu cầu</h3>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-3 sm:p-4 rounded-lg">
                  {selectedRequest.request_reason || 'Không có'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Trạng thái</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  {formatWithdrawalStatus(selectedRequest.request_status)}
                </span>
              </div>

              {selectedRequest.votingResults && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Kết quả voting</h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tổng số vote:</span>
                      <span className="font-semibold">{selectedRequest.votingResults.totalVotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Phê duyệt:</span>
                      <span className="font-semibold text-green-600">
                        {selectedRequest.votingResults.approveCount} ({selectedRequest.votingResults.approvePercentage}
                        %)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Từ chối:</span>
                      <span className="font-semibold text-red-600">
                        {selectedRequest.votingResults.rejectCount} ({selectedRequest.votingResults.rejectPercentage}
                        %)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Ngày tạo</h3>
                  <p className="text-gray-900">{formatDateTime(selectedRequest.createdAt)}</p>
                </div>
                {selectedRequest.admin_reviewed_at && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Ngày admin duyệt</h3>
                    <p className="text-gray-900">{formatDateTime(selectedRequest.admin_reviewed_at)}</p>
                  </div>
                )}
              </div>

              {selectedRequest.admin_reviewed_by && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Admin đã duyệt</h3>
                  <p className="text-gray-900">
                    {getUserName(selectedRequest.admin_reviewed_by)}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Đóng
              </button>
              {selectedRequest.request_status === 'admin_approved' && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleReleaseEscrow(selectedRequest);
                    }}
                    disabled={isReleasing}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Giải ngân với bill
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleProcessPayment(selectedRequest);
                    }}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Chuyển khoản
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Release Escrow Modal */}
      {showReleaseModal && releaseEscrow && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={(e) => {
            // Ngăn đóng modal khi click outside
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-center">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Giải ngân Escrow</h2>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                    <p>Bill giải ngân là bằng chứng tài chính bắt buộc và sẽ được công khai để đảm bảo minh bạch cho cộng đồng.</p>
                  </div>
                </div>
              </div>

              {/* Campaign Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Chiến dịch</h3>
                <p className="text-lg font-semibold text-gray-900">{getCampaignTitle(releaseEscrow.campaign)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Số tiền giải ngân</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrencyVND(releaseEscrow.withdrawal_request_amount)}
                </p>
              </div>

              {/* Upload Bill Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill giải ngân <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isReleasing || proofImages.length >= 10}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReleasing || proofImages.length >= 10}
                    className="w-full flex flex-col items-center justify-center py-6 text-gray-600 hover:text-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-10 h-10 mb-2" />
                    <p className="text-sm font-medium">Click để upload ảnh bill</p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG (tối đa 5MB/ảnh, tối đa 10 ảnh)
                    </p>
                    {proofImages.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Đã chọn: {proofImages.length}/10 ảnh
                      </p>
                    )}
                  </button>
                </div>

                {/* Image Previews */}
                {proofImageUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {proofImageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={url}
                            alt={`Bill ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          disabled={isReleasing}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Disbursement Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú giải ngân (tùy chọn)
                </label>
                <textarea
                  value={disbursementNote}
                  onChange={(e) => setDisbursementNote(e.target.value)}
                  placeholder="Nhập ghi chú về việc giải ngân (nếu có)..."
                  rows={4}
                  maxLength={1000}
                  disabled={isReleasing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {disbursementNote.length}/1000 ký tự
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-center gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleSubmitRelease}
                disabled={isReleasing || isUploading || proofImages.length === 0}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isReleasing || isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Xác nhận giải ngân
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

