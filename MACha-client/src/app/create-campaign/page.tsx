'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { campaignService, CreateCampaignPayload } from '@/services/campaign.service';
import { kycService } from '@/services/kyc.service';
import { cloudinaryService } from '@/services/cloudinary.service';

interface Milestone {
  percentage: number;
  commitment_days: number;
  commitment_description: string;
}

interface TimelineItem {
  month: string; // Format: "MM/YYYY" hoặc "Tháng MM/YYYY"
  description: string;
}

interface FormData {
  // Step 1: Contact Information
  fullname: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  twitter: string;
  website: string;
  address: string;
  // Step 2: Campaign Information (Basic + Detailed Content)
  title: string;
  category: string;
  goal_amount: string;
  start_date: string;
  end_date: string;
  description: string;
  story: string;
  hashtag: string; // Single hashtag
  // Step 3: Commitment & Documents
  milestones: Milestone[];
  expected_timeline: TimelineItem[];
  commitment: string;
  proof_documents: File[];
  banner_image: File | null;
  gallery_images: File[];
}

const CATEGORIES = [
  { value: 'children', label: 'Trẻ em' },
  { value: 'elderly', label: 'Người già' },
  { value: 'poverty', label: 'Người nghèo' },
  { value: 'disaster', label: 'Thiên tai' },
  { value: 'medical', label: 'Y tế' },
  {value: 'hardship', label: 'Hoàn cảnh khó khăn'},
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
    // Step 1: Contact Information
    fullname: user?.fullname || '',
    phone: '',
    email: user?.email || '',
    facebook: '',
    instagram: '',
    twitter: '',
    website: '',
    address: '',
    // Step 2: Campaign Information
    title: '',
    category: '',
    goal_amount: '',
    start_date: '',
    end_date: '',
    description: '',
    story: '',
    hashtag: '',
    // Step 3: Commitment & Documents
    milestones: [
      // Mốc 100% cố định - không thể xóa
      { percentage: 100, commitment_days: 0, commitment_description: '' }
    ],
    expected_timeline: [],
    commitment: '',
    proof_documents: [],
    banner_image: null,
    gallery_images: [],
  });

  const [previewUrls, setPreviewUrls] = useState<{
    proof_documents: string[];
    banner_image: string | null;
    gallery_images: string[];
  }>({
    proof_documents: [],
    banner_image: null,
    gallery_images: [],
  });

  const steps = [
    { number: 1, title: 'Thông tin liên hệ' },
    { number: 2, title: 'Thông tin chiến dịch' },
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

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { percentage: 0, commitment_days: 0, commitment_description: '' }
      ]
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => {
      // Không cho phép xóa mốc 100% (mốc cuối cùng)
      const milestoneToRemove = prev.milestones[index];
      if (milestoneToRemove.percentage === 100) {
        Swal.fire('Không thể xóa', 'Mốc 100% là bắt buộc và không thể xóa', 'warning');
        return prev;
      }
      return {
        ...prev,
        milestones: prev.milestones.filter((_, i) => i !== index)
      };
    });
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: number | string) => {
    setFormData(prev => {
      const updatedMilestones = prev.milestones.map((milestone, i) => {
        if (i === index) {
          // Nếu đang cập nhật mốc 100%, không cho phép thay đổi percentage
          if (field === 'percentage' && milestone.percentage === 100) {
            Swal.fire('Không thể thay đổi', 'Mốc 100% là cố định và không thể thay đổi phần trăm', 'warning');
            return milestone;
          }
          // Validate percentage trong khoảng 0-100
          if (field === 'percentage') {
            const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
            if (isNaN(numValue) || numValue < 0 || numValue > 100) {
              Swal.fire('Giá trị không hợp lệ', 'Phần trăm phải nằm trong khoảng 0-100', 'warning');
              return milestone;
            }
            // Nếu đang cập nhật percentage của mốc khác, không cho phép đặt thành 100% (vì đã có mốc 100% rồi)
            if (numValue === 100) {
              const has100Percent = prev.milestones.some((m, idx) => idx !== index && m.percentage === 100);
              if (has100Percent) {
                Swal.fire('Không hợp lệ', 'Đã có mốc 100% rồi, không thể thêm mốc 100% khác', 'warning');
                return milestone;
              }
            }
            return { ...milestone, [field]: numValue };
          }
          return { ...milestone, [field]: value };
        }
        return milestone;
      });
      return {
        ...prev,
        milestones: updatedMilestones
      };
    });
  };

  const addTimelineItem = () => {
    setFormData(prev => ({
      ...prev,
      expected_timeline: [
        ...prev.expected_timeline,
        { month: '', description: '' }
      ]
    }));
  };

  const removeTimelineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      expected_timeline: prev.expected_timeline.filter((_, i) => i !== index)
    }));
  };

  const updateTimelineItem = (index: number, field: keyof TimelineItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      expected_timeline: prev.expected_timeline.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleBannerChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Lỗi', `File quá lớn (max 5MB)`, 'error');
      return;
    }

    if (previewUrls.banner_image) {
      URL.revokeObjectURL(previewUrls.banner_image);
    }

    setFormData(prev => ({
      ...prev,
      banner_image: file,
    }));

    setPreviewUrls(prev => ({
      ...prev,
      banner_image: URL.createObjectURL(file),
    }));
  };

  const removeBanner = () => {
    if (previewUrls.banner_image) {
      URL.revokeObjectURL(previewUrls.banner_image);
    }
    setFormData(prev => ({
      ...prev,
      banner_image: null,
    }));
    setPreviewUrls(prev => ({
      ...prev,
      banner_image: null,
    }));
  };

  const handleFileChange = (field: 'proof_documents' | 'gallery_images', files: FileList | null) => {
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

  const removeFile = (field: 'proof_documents' | 'gallery_images', index: number) => {
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
        // Contact Information
        if (!formData.fullname.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập họ và tên', 'warning');
          return false;
        }
        if (!formData.phone.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập số điện thoại', 'warning');
          return false;
        }
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
          Swal.fire('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại hợp lệ (10-11 số)', 'warning');
          return false;
        }
        if (!formData.email.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập email', 'warning');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          Swal.fire('Email không hợp lệ', 'Vui lòng nhập email hợp lệ', 'warning');
          return false;
        }
        if (!formData.address.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập địa chỉ', 'warning');
          return false;
        }
        return true;

      case 2:
        // Campaign Information (Basic + Detailed Content)
        if (!formData.title.trim()) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập tiêu đề chiến dịch', 'warning');
          return false;
        }
        if (!formData.category) {
          Swal.fire('Thiếu thông tin', 'Vui lòng chọn danh mục', 'warning');
          return false;
        }
        if (!formData.goal_amount || parseInt(formData.goal_amount, 10) <= 0) {
          Swal.fire('Thiếu thông tin', 'Vui lòng nhập mục tiêu quyên góp hợp lệ', 'warning');
          return false;
        }
        if (!formData.start_date) {
          Swal.fire('Thiếu thông tin', 'Vui lòng chọn ngày bắt đầu', 'warning');
          return false;
        }
        if (!formData.end_date) {
          Swal.fire('Thiếu thông tin', 'Vui lòng chọn ngày kết thúc', 'warning');
          return false;
        }
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        if (startDate < today) {
          Swal.fire('Ngày không hợp lệ', 'Ngày bắt đầu không thể trước ngày hôm nay', 'warning');
          return false;
        }
        if (endDate <= startDate) {
          Swal.fire('Ngày không hợp lệ', 'Ngày kết thúc phải sau ngày bắt đầu', 'warning');
          return false;
        }
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
        
        // Validate timeline items if any
        if (formData.expected_timeline.length > 0) {
          for (let i = 0; i < formData.expected_timeline.length; i++) {
            const item = formData.expected_timeline[i];
            if (!item.month.trim()) {
              Swal.fire('Thiếu thông tin', `Mốc ${i + 1}: Vui lòng nhập tháng/năm`, 'warning');
              return false;
            }
            if (!item.description.trim()) {
              Swal.fire('Thiếu thông tin', `Mốc ${i + 1}: Vui lòng nhập mô tả`, 'warning');
              return false;
            }
          }
        }
        
        return true;

      case 3:
        // Commitment & Documents
        if (formData.milestones.length === 0) {
          Swal.fire('Thiếu thông tin', 'Vui lòng thêm ít nhất một mốc milestone', 'warning');
          return false;
        }
        
        // Kiểm tra xem có mốc 100% không
        const has100Percent = formData.milestones.some(m => m.percentage === 100);
        if (!has100Percent) {
          Swal.fire('Thiếu mốc bắt buộc', 'Mốc 100% là bắt buộc. Vui lòng đảm bảo có mốc 100%', 'warning');
          return false;
        }
        
        // Validate each milestone
        for (let i = 0; i < formData.milestones.length; i++) {
          const milestone = formData.milestones[i];
          if (!milestone.percentage || milestone.percentage < 1 || milestone.percentage > 100) {
            Swal.fire('Mốc không hợp lệ', `Mốc ${i + 1}: Phần trăm phải từ 1 đến 100`, 'warning');
            return false;
          }
          if (!milestone.commitment_days || milestone.commitment_days < 1) {
            Swal.fire('Mốc không hợp lệ', `Mốc ${i + 1}: Số ngày cam kết phải lớn hơn 0`, 'warning');
            return false;
          }
          if (!milestone.commitment_description.trim()) {
            Swal.fire('Mốc không hợp lệ', `Mốc ${i + 1}: Vui lòng nhập mô tả cam kết`, 'warning');
            return false;
          }
        }

        // Check for duplicate percentages
        const percentages = formData.milestones.map(m => m.percentage);
        const uniquePercentages = new Set(percentages);
        if (percentages.length !== uniquePercentages.size) {
          Swal.fire('Mốc trùng lặp', 'Các mốc không được có cùng phần trăm', 'warning');
          return false;
        }

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
        if (!formData.banner_image) {
          Swal.fire('Thiếu ảnh banner', 'Vui lòng upload ảnh banner cho chiến dịch', 'warning');
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
      if (previewUrls.banner_image) URL.revokeObjectURL(previewUrls.banner_image);
      previewUrls.gallery_images.forEach(url => URL.revokeObjectURL(url));
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
          <div style="text-align: left; margin-bottom: 20px;">
            <p><strong>Tiêu đề:</strong> ${formData.title}</p>
            <p><strong>Mục tiêu:</strong> ${parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Danh mục:</strong> ${CATEGORIES.find(c => c.value === formData.category)?.label}</p>
            <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">Chiến dịch sẽ được gửi đến admin để xét duyệt.</p>
          </div>
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
        confirmButtonText: 'Gửi chiến dịch',
        cancelButtonText: 'Kiểm tra lại',
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

      // Upload proof documents
      if (formData.proof_documents.length === 0) {
        throw new Error('Vui lòng upload tài liệu chứng minh');
      }
      const proofResults = await cloudinaryService.uploadMultipleImages(
        formData.proof_documents,
        'campaigns/proofs'
      );
      const proofDocUrl = proofResults[0].secure_url;

      // Upload banner image (required)
      if (!formData.banner_image) {
        throw new Error('Vui lòng upload ảnh banner');
      }
      const bannerResult = await cloudinaryService.uploadMultipleImages(
        [formData.banner_image],
        'campaigns/banners'
      );
      const bannerImage = bannerResult[0].secure_url;

      // Upload gallery images (optional)
      let galleryImages: string[] = [];
      if (formData.gallery_images.length > 0) {
        const galleryResults = await cloudinaryService.uploadMultipleImages(
          formData.gallery_images,
          'campaigns/gallery'
        );
        galleryImages = galleryResults.map(r => r.secure_url);
      }

      const fullDescription = `${formData.description}\n\n--- Câu chuyện ---\n${formData.story}\n\n--- Cam kết ---\n${formData.commitment}`;

      const payload: CreateCampaignPayload = {
        contact_info: {
          fullname: formData.fullname,
          phone: formData.phone,
          email: formData.email,
          social_links: {
            facebook: formData.facebook || undefined,
            instagram: formData.instagram || undefined,
            twitter: formData.twitter || undefined,
            website: formData.website || undefined,
          },
          address: formData.address,
        },
        title: formData.title,
        description: fullDescription,
        goal_amount: parseInt(formData.goal_amount || '0', 10),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        category: formData.category,
        banner_image: bannerImage,
        gallery_images: galleryImages.length > 0 ? galleryImages : undefined,
        proof_documents_url: proofDocUrl,
        milestones: formData.milestones,
        expected_timeline: formData.expected_timeline.length > 0 ? formData.expected_timeline : undefined,
        hashtag: formData.hashtag.trim() ? formData.hashtag.trim() : undefined,
      };

      await campaignService.createCampaign(payload);

      previewUrls.proof_documents.forEach(url => URL.revokeObjectURL(url));
      if (previewUrls.banner_image) URL.revokeObjectURL(previewUrls.banner_image);
      previewUrls.gallery_images.forEach(url => URL.revokeObjectURL(url));

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
                  Bước 1: Thông tin liên hệ
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Thông tin này sẽ được sử dụng để liên hệ với bạn về chiến dịch
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullname}
                    onChange={(e) => handleInputChange('fullname', e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="VD: 0901234567"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="VD: example@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Địa chỉ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Liên kết mạng xã hội (tùy chọn)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Facebook
                      </label>
                      <input
                        type="url"
                        value={formData.facebook}
                        onChange={(e) => handleInputChange('facebook', e.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Instagram
                      </label>
                      <input
                        type="url"
                        value={formData.instagram}
                        onChange={(e) => handleInputChange('instagram', e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Twitter
                      </label>
                      <input
                        type="url"
                        value={formData.twitter}
                        onChange={(e) => handleInputChange('twitter', e.target.value)}
                        placeholder="https://twitter.com/..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  Bước 2: Thông tin chiến dịch
                </h2>

                {/* Basic Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📋 Thông tin cơ bản</h3>
                </div>

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
                    type="text"
                    value={formData.goal_amount}
                    onChange={(e) => {
                      // Chỉ cho phép nhập số nguyên
                      const value = e.target.value.replace(/[^\d]/g, '');
                      handleInputChange('goal_amount', value);
                    }}
                    placeholder="VD: 50000000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.goal_amount && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')} VNĐ
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ngày bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ngày kết thúc <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      min={formData.start_date || new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Detailed Content */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-8 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📝 Nội dung chi tiết</h3>
                </div>

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

                {/* Hashtag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hashtag (tùy chọn)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Nhập 1 hashtag để giúp người dùng dễ dàng tìm kiếm campaign của bạn.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.hashtag}
                      onChange={(e) => {
                        const value = e.target.value.replace(/^#/, '').toLowerCase();
                        handleInputChange('hashtag', value);
                      }}
                      placeholder="VD: gopquy, trogiup, thiennguyen"
                      className="w-full px-4 py-3 pl-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={50}
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500">#</span>
                    {formData.hashtag && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('hashtag', '')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.hashtag ? `#${formData.hashtag}` : 'Chưa có hashtag'}
                  </p>
                </div>

                {/* Expected Timeline */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-8 mb-6">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Tiến độ dự kiến</h3>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tiến độ dự kiến (tùy chọn)
                    </label>
                    <button
                      type="button"
                      onClick={addTimelineItem}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm"
                    >
                      + Thêm mốc
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Thêm các mốc thời gian dự kiến cho chiến dịch (ví dụ: Tháng 10/2025: Hoàn thành gây quỹ)
                  </p>

                  {formData.expected_timeline.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Chưa có mốc thời gian nào. Nhấn "Thêm mốc" để thêm.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.expected_timeline.map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700/50"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Mốc {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeTimelineItem(index)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm"
                            >
                              Xóa
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tháng/Năm <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.month}
                                onChange={(e) => updateTimelineItem(index, 'month', e.target.value)}
                                placeholder="VD: Tháng 10/2025 hoặc 10/2025"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Mô tả <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateTimelineItem(index, 'description', e.target.value)}
                                placeholder="VD: Hoàn thành gây quỹ"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                maxLength={200}
                              />
                              <p className="text-xs text-gray-500 mt-1">{item.description.length}/200 ký tự</p>
                            </div>
                          </div>
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

                {/* Progress Card - Hiển thị mục tiêu từ step 2 */}
                {formData.goal_amount && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xl">Mục tiêu quyên góp </span>
                        <span className="text-3xl font-bold text-orange-500">
                          {parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with Milestone Markers */}
                    <div className="relative mb-8">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-visible relative">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: '0%',
                            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)'
                          }}
                        />
                        
                        {/* Milestone Markers */}
                        {formData.milestones.length > 0 && formData.milestones
                          .filter(m => m.percentage > 0)
                          .sort((a, b) => a.percentage - b.percentage)
                          .map((milestone, index) => {
                            const is100Percent = milestone.percentage === 100;
                            return (
                              <div
                                key={index}
                                className="absolute top-0 transform -translate-x-1/2"
                                style={{ left: `${milestone.percentage}%` }}
                              >
                                {/* Marker Line */}
                                <div 
                                  className={`w-0.5 h-6 ${
                                    is100Percent 
                                      ? 'bg-green-500 dark:bg-green-400' 
                                      : 'bg-blue-500 dark:bg-blue-400'
                                  }`}
                                  style={{ marginTop: '-3px' }}
                                />
                                
                                {/* Marker Dot */}
                                <div 
                                  className={`w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-lg transform -translate-x-1/2 ${
                                    is100Percent 
                                      ? 'bg-green-500 dark:bg-green-400' 
                                      : 'bg-blue-500 dark:bg-blue-400'
                                  }`}
                                  style={{ marginTop: '-10px' }}
                                />
                                
                                {/* Percentage Label */}
                                <div 
                                  className={`absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${
                                    is100Percent 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-blue-600 dark:text-blue-400'
                                  }`}
                                >
                                  <div className={`text-xs font-bold px-2 py-1 rounded ${
                                    is100Percent 
                                      ? 'bg-green-100 dark:bg-green-900/30' 
                                      : 'bg-blue-100 dark:bg-blue-900/30'
                                  }`}>
                                    {milestone.percentage}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      
                      {/* Milestone Info Below */}
                      {formData.milestones.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Các mốc giải ngân:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {formData.milestones
                              .filter(m => m.percentage > 0)
                              .sort((a, b) => a.percentage - b.percentage)
                              .map((milestone, index) => {
                                const is100Percent = milestone.percentage === 100;
                                const milestoneAmount = Math.round((parseInt(formData.goal_amount || '0', 10) * milestone.percentage) / 100);
                                return (
                                  <div
                                    key={index}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                      is100Percent
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}
                                  >
                                    <span className="font-bold">{milestone.percentage}%</span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      ({milestoneAmount.toLocaleString('vi-VN')}đ)
                                    </span>
                                    {milestone.commitment_days > 0 && (
                                      <span className="text-gray-500 dark:text-gray-400">
                                        • {milestone.commitment_days} ngày
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Chiến dịch chưa bắt đầu - Số tiền sẽ được cập nhật sau khi chiến dịch được phê duyệt
                    </p>
                  </div>
                )}

                {/* Milestones */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tiến độ giải ngân <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                    >
                      + Thêm mốc
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Định nghĩa các mốc phần trăm và cam kết thực hiện cho từng mốc. Mốc 100% là bắt buộc và không thể xóa.
                  </p>

                  {formData.milestones.length === 0 ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400">
                        Chưa có mốc nào. Vui lòng thêm ít nhất một mốc milestone.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.milestones.map((milestone, index) => {
                        const is100Percent = milestone.percentage === 100;
                        return (
                          <div
                          key={index}
                          className={`border rounded-lg p-4 ${
                            is100Percent 
                              ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                Mốc {index + 1}
                              </h4>
                              {is100Percent && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                  Bắt buộc
                                </span>
                              )}
                            </div>
                            {formData.milestones.length > 1 && !is100Percent && (
                              <button
                                type="button"
                                onClick={() => removeMilestone(index)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm"
                              >
                                Xóa
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phần trăm (%) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={milestone.percentage || ''}
                                onChange={(e) => {
                                  // Chỉ cho phép nhập số
                                  const value = e.target.value.replace(/[^\d]/g, '');
                                  // Giới hạn tối đa 3 chữ số (0-100)
                                  const limitedValue = value.length > 3 ? value.slice(0, 3) : value;
                                  // Validate và cập nhật
                                  if (limitedValue === '' || limitedValue === '0') {
                                    updateMilestone(index, 'percentage', 0);
                                  } else {
                                    const numValue = parseInt(limitedValue, 10);
                                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                      updateMilestone(index, 'percentage', numValue);
                                    } else if (numValue > 100) {
                                      // Nếu vượt quá 100, tự động set về 100
                                      updateMilestone(index, 'percentage', 100);
                                    }
                                  }
                                }}
                                placeholder="VD: 30"
                                disabled={is100Percent}
                                className={`w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  is100Percent ? 'opacity-60 cursor-not-allowed' : ''
                                }`}
                              />
                              {is100Percent && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Mốc 100% là cố định, dùng cho khi campaign đạt 100% hoặc hết hạn
                                </p>
                              )}
                              {!is100Percent && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Nhập số từ 0 đến 100
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cam kết thực hiện sau (ngày) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={milestone.commitment_days || ''}
                                onChange={(e) => {
                                  // Chỉ cho phép nhập số nguyên dương
                                  const value = e.target.value.replace(/[^\d]/g, '');
                                  if (value === '' || value === '0') {
                                    updateMilestone(index, 'commitment_days', 0);
                                  } else {
                                    const numValue = parseInt(value, 10);
                                    if (!isNaN(numValue) && numValue > 0) {
                                      updateMilestone(index, 'commitment_days', numValue);
                                    }
                                  }
                                }}
                                placeholder="VD: 30"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Nhập số ngày lớn hơn 0
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Cam kết sử dụng <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={milestone.commitment_description}
                              onChange={(e) =>
                                updateMilestone(
                                  index,
                                  'commitment_description',
                                  e.target.value
                                )
                              }
                              placeholder="VD: Tôi cam kết sẽ khai báo hoạt động xây cầu sau 30 ngày kể từ khi đạt mốc này"
                              rows={3}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              maxLength={500}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {milestone.commitment_description.length}/500 ký tự
                            </p>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cam kết sử dụng quỹ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.commitment}
                    onChange={(e) => handleInputChange('commitment', e.target.value)}
                    placeholder="Cam kết cụ thể về việc sử dụng số tiền quyên góp (tối thiểu 50 ký tự)"
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.commitment.length}/2000 ký tự (tối thiểu 50)</p>
                </div>

                {/* Banner Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ảnh Banner <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Ảnh chính hiển thị đầu tiên cho chiến dịch (tỷ lệ 16:9 khuyến nghị)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBannerChange(e.target.files)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tối đa 5MB</p>
                  
                  {previewUrls.banner_image && (
                    <div className="relative mt-4 w-full h-64">
                      <img 
                        src={previewUrls.banner_image} 
                        alt="Banner preview" 
                        className="w-full h-full object-cover rounded-lg border-2 border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={removeBanner}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Banner chính
                      </div>
                    </div>
                  )}
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ảnh Gallery (tùy chọn)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Thêm các ảnh minh họa khác cho chiến dịch</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange('gallery_images', e.target.files)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tối đa 5MB mỗi ảnh, có thể chọn nhiều ảnh</p>
                  
                  {previewUrls.gallery_images.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {previewUrls.gallery_images.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url} 
                            alt={`Gallery ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-lg border border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('gallery_images', index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proof Documents */}
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
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Thông tin liên hệ</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Họ và tên:</span> {formData.fullname}</p>
                      <p><span className="font-medium">Số điện thoại:</span> {formData.phone}</p>
                      <p><span className="font-medium">Email:</span> {formData.email}</p>
                      <p><span className="font-medium">Địa chỉ:</span> {formData.address}</p>
                      {(formData.facebook || formData.instagram || formData.twitter || formData.website) && (
                        <div>
                          <p className="font-medium mb-1">Mạng xã hội:</p>
                          <div className="space-y-1 ml-4">
                            {formData.facebook && <p>• Facebook: {formData.facebook}</p>}
                            {formData.instagram && <p>• Instagram: {formData.instagram}</p>}
                            {formData.twitter && <p>• Twitter: {formData.twitter}</p>}
                            {formData.website && <p>• Website: {formData.website}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Thông tin cơ bản</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tiêu đề:</span> {formData.title}</p>
                      <p><span className="font-medium">Danh mục:</span> {CATEGORIES.find(c => c.value === formData.category)?.label}</p>
                      <p><span className="font-medium">Mục tiêu:</span> {parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')} VNĐ</p>
                      <p><span className="font-medium">Ngày bắt đầu:</span> {new Date(formData.start_date).toLocaleDateString('vi-VN')}</p>
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
                        <p className="font-medium mb-1">Hình ảnh:</p>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span>✅ Banner: {formData.banner_image ? '1 ảnh' : 'Chưa có'}</span>
                          <span>•</span>
                          <span>📷 Gallery: {formData.gallery_images.length} ảnh</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Milestones</h3>
                    <div className="space-y-3 text-sm">
                      {formData.milestones.length === 0 ? (
                        <p className="text-gray-700 dark:text-gray-300">Chưa có mốc nào</p>
                      ) : (
                        formData.milestones.map((milestone, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              Mốc {index + 1}: {milestone.percentage}%
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 text-xs mt-1">
                              Cam kết thực hiện sau: {milestone.commitment_days} ngày
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 text-xs mt-1">
                              {milestone.commitment_description}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {formData.expected_timeline.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tiến độ dự kiến</h3>
                      <div className="space-y-2 text-sm">
                        {formData.expected_timeline.map((item, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-green-500' :
                              index === formData.expected_timeline.length - 1 ? 'bg-blue-300' :
                              'bg-blue-500'
                            }`}></div>
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.month}: {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
