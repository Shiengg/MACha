'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { campaignService, CreateCampaignPayload } from '@/services/campaign.service';
import { kycService } from '@/services/kyc.service';
import { cloudinaryService } from '@/services/cloudinary.service';

interface FormData {
  title: string;
  category: string;
  goal_amount: string;
  end_date: string;
  description: string;
  story: string;
  commitment: string;
  proof_documents: File[];
  media_files: File[];
}

const CATEGORIES = [
  { value: 'children', label: 'Trẻ em' },
  { value: 'elderly', label: 'Người già' },
  { value: 'poverty', label: 'Người nghèo' },
  { value: 'disaster', label: 'Thiên tai' },
  { value: 'medical', label: 'Y tế' },
  { value: 'education', label: 'Giáo dục' },
  { value: 'disability', label: 'Người khuyết tật' },
  { value: 'animal', label: 'Động vật' },
  { value: 'environment', label: 'Môi trường' },
  { value: 'community', label: 'Cộng đồng' },
  { value: 'other', label: 'Khác' },
];

function CreateCampaignContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingKYC, setIsCheckingKYC] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>('');
  const totalSteps = 4;

  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    goal_amount: '',
    end_date: '',
    description: '',
    story: '',
    commitment: '',
    proof_documents: [],
    media_files: [],
  });

  const [previewUrls, setPreviewUrls] = useState<{
    proof_documents: string[];
    media_files: string[];
  }>({
    proof_documents: [],
    media_files: [],
  });

  const steps = [
    { number: 1, title: 'Thông tin cơ bản' },
    { number: 2, title: 'Nội dung chi tiết' },
    { number: 3, title: 'Cam kết & Tài liệu' },
    { number: 4, title: 'Xem lại và gửi' },
  ];

  useEffect(() => {
    checkKYCStatus();
  }, []);

  const checkKYCStatus = async () => {
    try {
      setIsCheckingKYC(true);
      const status = await kycService.getKYCStatus();
      setKycStatus(status.kyc_status);

      if (status.kyc_status !== 'verified') {
        let message = '';
        let icon: 'warning' | 'error' = 'warning';

        switch (status.kyc_status) {
          case 'unverified':
            message = 'Bạn cần xác thực danh tính (KYC) trước khi tạo chiến dịch.';
            break;
          case 'pending':
            message = 'KYC của bạn đang được xét duyệt. Vui lòng đợi admin phê duyệt.';
            break;
          case 'rejected':
            message = `KYC của bạn đã bị từ chối. Lý do: ${status.kyc_rejection_reason || 'Không rõ'}`;
            icon = 'error';
            break;
        }

        await Swal.fire({
          icon,
          title: 'Không thể tạo chiến dịch',
          text: message,
          confirmButtonText: status.kyc_status === 'unverified' ? 'Đi đến KYC' : 'Đóng',
        }).then((result) => {
          if (result.isConfirmed && status.kyc_status === 'unverified') {
            router.push('/kyc');
          } else {
            router.push('/');
          }
        });
      }
    } catch (error: any) {
      console.error('Error checking KYC:', error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể kiểm tra trạng thái KYC. Vui lòng thử lại.',
      }).then(() => router.push('/'));
    } finally {
      setIsCheckingKYC(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: 'proof_documents' | 'media_files', files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Lỗi', `File ${file.name} quá lớn (max 5MB)`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ...validFiles],
    }));

    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => ({
      ...prev,
      [field]: [...prev[field], ...newPreviewUrls],
    }));
  };

  const removeFile = (field: 'proof_documents' | 'media_files', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    
    URL.revokeObjectURL(previewUrls[field][index]);
    setPreviewUrls(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập tiêu đề chiến dịch', 'warning');
          return false;
        }
        if (!formData.category) {
          Swal.fire('Thiếu thông tin', 'Vui lòng chọn danh mục', 'warning');
          return false;
        }
        if (!formData.goal_amount || parseFloat(formData.goal_amount) <= 0) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập mục tiêu quyên góp hợp lệ', 'warning');
          return false;
        }
        if (!formData.end_date) {
          Swal.fire('Thiếu thông tin', 'Vui lòng chọn ngày kết thúc', 'warning');
          return false;
        }
        const endDate = new Date(formData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (endDate <= today) {
          Swal.fire('Ngày không hợp lệ', 'Ngày kết thúc phải sau ngày hôm nay', 'warning');
          return false;
        }
        return true;

      case 2:
        if (!formData.description.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập mô tả ngắn', 'warning');
          return false;
        }
        if (formData.description.length < 50) {
          Swal.fire('Mô tả quá ngắn', 'Mô tả phải có ít nhất 50 ký tự', 'warning');
          return false;
        }
        if (!formData.story.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập câu chuyện chi tiết', 'warning');
          return false;
        }
        if (formData.story.length < 100) {
          Swal.fire('Câu chuyện quá ngắn', 'Câu chuyện phải có ít nhất 100 ký tự', 'warning');
          return false;
        }
        return true;

      case 3:
        if (!formData.commitment.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập cam kết sử dụng', 'warning');
          return false;
        }
        if (formData.commitment.length < 50) {
          Swal.fire('Cam kết quá ngắn', 'Cam kết phải có ít nhất 50 ký tự', 'warning');
          return false;
        }
        if (formData.proof_documents.length === 0) {
          Swal.fire('Thiếu tài liệu', 'Vui lòng upload ít nhất 1 tài liệu chứng minh', 'warning');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Hủy tạo chiến dịch?',
      text: 'Tất cả thông tin bạn đã nhập sẽ bị mất. Bạn có chắc chắn muốn hủy?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Có, hủy tạo',
      cancelButtonText: 'Không, tiếp tục',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      previewUrls.proof_documents.forEach(url => URL.revokeObjectURL(url));
      previewUrls.media_files.forEach(url => URL.revokeObjectURL(url));
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      setIsSubmitting(true);

      const result = await Swal.fire({
        title: 'Xác nhận gửi chiến dịch?',
        html: `
          <div class="text-left space-y-2">
            <p><strong>Tiêu đề:</strong> ${formData.title}</p>
            <p><strong>Mục tiêu:</strong> ${parseFloat(formData.goal_amount).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Danh mục:</strong> ${CATEGORIES.find(c => c.value === formData.category)?.label}</p>
            <p class="text-sm text-gray-600 mt-4">Chiến dịch sẽ được gửi đến admin để xét duyệt.</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Gửi chiến dịch',
        cancelButtonText: 'Kiểm tra lại',
      });

      if (!result.isConfirmed) {
        setIsSubmitting(false);
        return;
      }

      Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang upload tài liệu và tạo chiến dịch',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      let proofDocUrl = '';
      let mediaUrls: string[] = [];

      if (formData.proof_documents.length > 0) {
        const proofResults = await cloudinaryService.uploadMultipleImages(
          formData.proof_documents,
          'campaigns/proofs'
        );
        proofDocUrl = proofResults[0].secure_url;
      }

      if (formData.media_files.length > 0) {
        const mediaResults = await cloudinaryService.uploadMultipleImages(
          formData.media_files,
          'campaigns/media'
        );
        mediaUrls = mediaResults.map(r => r.secure_url);
      }

      const fullDescription = `${formData.description}\n\n--- Câu chuyện ---\n${formData.story}\n\n--- Cam kết ---\n${formData.commitment}`;

      const payload: CreateCampaignPayload = {
        title: formData.title,
        description: fullDescription,
        goal_amount: parseFloat(formData.goal_amount),
        start_date: new Date().toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        category: formData.category,
        proof_documents_url: proofDocUrl,
        media_url: mediaUrls,
      };

      await campaignService.createCampaign(payload);

      previewUrls.proof_documents.forEach(url => URL.revokeObjectURL(url));
      previewUrls.media_files.forEach(url => URL.revokeObjectURL(url));

      await Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        html: `
          <p>Chiến dịch của bạn đã được gửi thành công!</p>
          <p class="text-sm text-gray-600 mt-2">Admin sẽ xem xét và phê duyệt trong thời gian sớm nhất.</p>
        `,
        confirmButtonText: 'Về trang chủ',
      });

      router.push('/');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.response?.data?.message || 'Có lỗi xảy ra khi tạo chiến dịch. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingKYC) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang kiểm tra trạng thái KYC...</p>
        </div>
      </div>
    );
  }

  if (kycStatus !== 'verified') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-[1200px] mx-auto pt-8 pb-12 px-4">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Tạo chiến dịch gây quỹ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Hoàn thành các bước để tạo chiến dịch của bạn
          </p>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between max-w-[800px] mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                      currentStep === step.number
                        ? 'bg-blue-600 text-white scale-110 shadow-lg'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </div>
                  <span
                    className={`mt-2 text-xs text-center font-medium ${
                      currentStep === step.number
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      currentStep > step.number
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                    style={{ marginTop: '-24px' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          
          <div className="min-h-[500px]">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Bước 1: Thông tin cơ bản
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tiêu đề chiến dịch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="VD: Giúp đỡ trẻ em vùng cao có sách vở đến trường"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 ký tự</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mục tiêu quyên góp (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.goal_amount}
                    onChange={(e) => handleInputChange('goal_amount', e.target.value)}
                    placeholder="VD: 50000000"
                    min="0"
                    step="100000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.goal_amount && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {parseFloat(formData.goal_amount).toLocaleString('vi-VN')} VNĐ
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Bước 2: Nội dung chi tiết
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mô tả ngắn <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Tóm tắt ngắn gọn về chiến dịch của bạn (tối thiểu 50 ký tự)"
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 ký tự (tối thiểu 50)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Câu chuyện chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.story}
                    onChange={(e) => handleInputChange('story', e.target.value)}
                    placeholder="Kể câu chuyện đầy đủ về chiến dịch: hoàn cảnh, lý do, mục tiêu cụ thể... (tối thiểu 100 ký tự)"
                    rows={10}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={5000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.story.length}/5000 ký tự (tối thiểu 100)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ảnh minh họa (tùy chọn)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange('media_files', e.target.files)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tối đa 5MB mỗi ảnh</p>
                  
                  {previewUrls.media_files.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {previewUrls.media_files.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt={`Media ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => removeFile('media_files', index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Bước 3: Cam kết & Tài liệu
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cam kết sử dụng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.commitment}
                    onChange={(e) => handleInputChange('commitment', e.target.value)}
                    placeholder="Cam kết rõ ràng về việc sử dụng số tiền quyên góp: sẽ dùng vào việc gì, khi nào, như thế nào... (tối thiểu 50 ký tự)"
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.commitment.length}/2000 ký tự (tối thiểu 50)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tài liệu chứng minh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange('proof_documents', e.target.files)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload giấy tờ chứng minh (giấy xác nhận, hóa đơn, ảnh thực tế...). Tối đa 5MB mỗi ảnh.
                  </p>
                  
                  {previewUrls.proof_documents.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {previewUrls.proof_documents.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt={`Proof ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => removeFile('proof_documents', index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Lưu ý quan trọng</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Tài liệu chứng minh phải rõ ràng, có thể đọc được</li>
                    <li>Cam kết phải cụ thể, minh bạch về việc sử dụng tiền</li>
                    <li>Admin sẽ xem xét kỹ trước khi phê duyệt</li>
                  </ul>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Bước 4: Xem lại và gửi yêu cầu
                </h2>

                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Thông tin cơ bản</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tiêu đề:</span> {formData.title}</p>
                      <p><span className="font-medium">Danh mục:</span> {CATEGORIES.find(c => c.value === formData.category)?.label}</p>
                      <p><span className="font-medium">Mục tiêu:</span> {parseFloat(formData.goal_amount).toLocaleString('vi-VN')} VNĐ</p>
                      <p><span className="font-medium">Ngày kết thúc:</span> {new Date(formData.end_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Nội dung</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium mb-1">Mô tả:</p>
                        <p className="text-gray-700 dark:text-gray-300">{formData.description}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">Câu chuyện:</p>
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{formData.story}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">Ảnh minh họa:</p>
                        <p className="text-gray-700 dark:text-gray-300">{formData.media_files.length} ảnh</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Cam kết & Tài liệu</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium mb-1">Cam kết:</p>
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{formData.commitment}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">Tài liệu chứng minh:</p>
                        <p className="text-gray-700 dark:text-gray-300">{formData.proof_documents.length} tài liệu</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">⚠️ Trước khi gửi</h3>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
                      <li>Kiểm tra kỹ tất cả thông tin đã nhập</li>
                      <li>Chiến dịch sẽ được gửi đến admin để xét duyệt</li>
                      <li>Bạn sẽ nhận được thông báo khi chiến dịch được phê duyệt hoặc từ chối</li>
                      <li>Sau khi gửi, bạn không thể chỉnh sửa cho đến khi được phê duyệt</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {currentStep === 1 ? (
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕ Hủy
              </button>
            ) : (
              <button
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg font-semibold bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Quay lại
              </button>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Bước {currentStep} / {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Đang gửi...
                  </>
                ) : (
                  '✓ Gửi yêu cầu'
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 max-w-[800px] mx-auto">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <ProtectedRoute>
      <CreateCampaignContent />
    </ProtectedRoute>
  );
}
