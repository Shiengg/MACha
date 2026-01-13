'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import apiClient from '@/lib/api-client';
import Swal from 'sweetalert2';
import { SUBMIT_ORGANIZATION_KYC_ROUTE } from '@/constants/api';
import { cloudinaryService } from '@/services/cloudinary.service';
import { 
  Building2, 
  User, 
  FileText, 
  CheckCircle2, 
  Upload,
  Camera,
  X,
  Lock,
  Shield,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RotateCw,
  CreditCard,
  MapPin
} from 'lucide-react';

function OrganizationKYCSubmissionContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // Legal Representative File upload states
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string | null>(null);
  const [idCardBackPreview, setIdCardBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  
  // Organization Documents File upload states
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [establishmentDecisionFile, setEstablishmentDecisionFile] = useState<File | null>(null);
  const [businessLicensePreview, setBusinessLicensePreview] = useState<string | null>(null);
  const [establishmentDecisionPreview, setEstablishmentDecisionPreview] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  
  // Rotation states
  const [idCardFrontRotation, setIdCardFrontRotation] = useState(0);
  const [selfieRotation, setSelfieRotation] = useState(0);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    legal_representative: {
      fullname: '',
      id_card_number: '',
      position: '',
      id_card_front_url: '',
      id_card_back_url: '',
      selfie_url: '',
    },
    organization_documents: {
      business_license_url: '',
      establishment_decision_url: '',
      tax_code: '',
      organization_name: '',
      organization_address: '',
    },
  });

  useEffect(() => {
    if (!user) {
      setCheckingStatus(true);
      return;
    }

    if (user.role !== 'organization') {
      Swal.fire({
        icon: 'error',
        title: 'Không đủ quyền',
        text: 'Chỉ tổ chức mới có thể thực hiện KYC tổ chức',
      }).then(() => {
        router.push('/');
      });
      return;
    }

    setCheckingStatus(false);

    if (user.kyc_status === 'verified') {
      Swal.fire({
        icon: 'info',
        title: 'Đã xác thực',
        text: 'Tài khoản tổ chức của bạn đã được xác thực',
      }).then(() => {
        router.push('/');
      });
    } else if (user.kyc_status === 'pending') {
      Swal.fire({
        icon: 'info',
        title: 'Đang chờ duyệt',
        text: 'Yêu cầu KYC của bạn đang được xem xét',
      }).then(() => {
        router.push('/');
      });
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('legal_representative.')) {
      const field = name.replace('legal_representative.', '');
      setFormData(prev => ({
        ...prev,
        legal_representative: {
          ...prev.legal_representative,
          [field]: value,
        },
      }));
    } else if (name.startsWith('organization_documents.')) {
      const field = name.replace('organization_documents.', '');
      setFormData(prev => ({
        ...prev,
        organization_documents: {
          ...prev.organization_documents,
          [field]: value,
        },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep !== 3) {
      nextStep();
      return;
    }
    
    // Validate required fields
    if (!formData.legal_representative.fullname || 
        !formData.legal_representative.id_card_number ||
        !formData.legal_representative.position ||
        !formData.organization_documents.organization_name ||
        !formData.organization_documents.organization_address ||
        !formData.organization_documents.tax_code) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu thông tin',
        text: 'Vui lòng điền đầy đủ thông tin bắt buộc',
      });
      return;
    }

    // Validate required images
    if (!idCardFrontFile || !selfieFile) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu ảnh',
        text: 'Vui lòng upload đầy đủ ảnh CCCD mặt trước và ảnh selfie của người đại diện',
      });
      return;
    }

    if (!businessLicenseFile || !establishmentDecisionFile) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu tài liệu',
        text: 'Vui lòng upload đầy đủ giấy phép kinh doanh và quyết định thành lập',
      });
      return;
    }

    try {
      setLoading(true);

      Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang tải thông tin...',
        allowOutsideClick: false,
        showConfirmButton: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Upload images first to Cloudinary
      const uploadedUrls = await uploadImages();
      
      // Update formData with uploaded URLs
      const finalFormData = {
        legal_representative: {
          fullname: formData.legal_representative.fullname,
          id_card_number: formData.legal_representative.id_card_number,
          position: formData.legal_representative.position,
          id_card_front_url: uploadedUrls.id_card_front_url || '',
          id_card_back_url: uploadedUrls.id_card_back_url || '',
          selfie_url: uploadedUrls.selfie_url || '',
        },
        organization_documents: {
          business_license_url: uploadedUrls.business_license_url || '',
          establishment_decision_url: uploadedUrls.establishment_decision_url || '',
          tax_code: formData.organization_documents.tax_code,
          organization_name: formData.organization_documents.organization_name,
          organization_address: formData.organization_documents.organization_address,
        },
      };

      Swal.update({
        title: 'Đang gửi yêu cầu...',
        html: 'Vui lòng đợi trong giây lát',
        showConfirmButton: false,
        allowOutsideClick: false,
      });

      await apiClient.post(SUBMIT_ORGANIZATION_KYC_ROUTE, finalFormData);

      Swal.close();
      
      Swal.fire({
        icon: 'success',
        title: 'Gửi thành công!',
        html: `
          <div style="text-align: center; padding: 20px 0;">
            <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px; line-height: 1.5;">
              Yêu cầu KYC tổ chức của bạn đã được gửi thành công
            </div>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 14px; margin-top: 20px;">
              <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.6;">
                Vui lòng chờ admin xem xét và phê duyệt yêu cầu của bạn
              </p>
            </div>
          </div>
        `,
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#2563eb',
        width: '550px',
      }).then(() => {
        router.push('/');
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || 'Không thể gửi yêu cầu KYC';
      
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: errorMessage,
        confirmButtonText: 'Đã hiểu',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Swal.fire({
      title: 'Hủy xác thực?',
      text: 'Bạn có chắc chắn muốn hủy quá trình xác thực?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Hủy',
      cancelButtonText: 'Tiếp tục',
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/');
      }
    });
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleNextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    nextStep();
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // File upload handlers for Legal Representative
  const handleIdCardFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (max 10MB)', 'error');
      return;
    }

    if (idCardFrontPreview) {
      URL.revokeObjectURL(idCardFrontPreview);
    }

    setIdCardFrontFile(file);
    setIdCardFrontPreview(URL.createObjectURL(file));
    setIdCardFrontRotation(0);
  };

  const handleIdCardBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (max 10MB)', 'error');
      return;
    }

    if (idCardBackPreview) {
      URL.revokeObjectURL(idCardBackPreview);
    }

    setIdCardBackFile(file);
    setIdCardBackPreview(URL.createObjectURL(file));
  };

  const removeIdCardFront = () => {
    if (idCardFrontPreview) {
      URL.revokeObjectURL(idCardFrontPreview);
    }
    setIdCardFrontFile(null);
    setIdCardFrontPreview(null);
  };

  const removeIdCardBack = () => {
    if (idCardBackPreview) {
      URL.revokeObjectURL(idCardBackPreview);
    }
    setIdCardBackFile(null);
    setIdCardBackPreview(null);
  };

  const removeSelfie = () => {
    if (selfiePreview) {
      URL.revokeObjectURL(selfiePreview);
    }
    setSelfieFile(null);
    setSelfiePreview(null);
  };

  // File upload handlers for Organization Documents
  const handleBusinessLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (max 10MB)', 'error');
      return;
    }

    if (businessLicensePreview) {
      URL.revokeObjectURL(businessLicensePreview);
    }

    setBusinessLicenseFile(file);
    setBusinessLicensePreview(URL.createObjectURL(file));
  };

  const handleEstablishmentDecisionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (max 10MB)', 'error');
      return;
    }

    if (establishmentDecisionPreview) {
      URL.revokeObjectURL(establishmentDecisionPreview);
    }

    setEstablishmentDecisionFile(file);
    setEstablishmentDecisionPreview(URL.createObjectURL(file));
  };

  const removeBusinessLicense = () => {
    if (businessLicensePreview) {
      URL.revokeObjectURL(businessLicensePreview);
    }
    setBusinessLicenseFile(null);
    setBusinessLicensePreview(null);
  };

  const removeEstablishmentDecision = () => {
    if (establishmentDecisionPreview) {
      URL.revokeObjectURL(establishmentDecisionPreview);
    }
    setEstablishmentDecisionFile(null);
    setEstablishmentDecisionPreview(null);
  };

  // Camera handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.',
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      
      if (selfiePreview) {
        URL.revokeObjectURL(selfiePreview);
      }

      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      setSelfieRotation(0);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  // Rotate image function
  const rotateImage = async (
    imageUrl: string, 
    currentRotation: number,
    setRotation: (angle: number) => void,
    setFile: (file: File) => void,
    setPreview: (url: string) => void
  ): Promise<void> => {
    const newRotation = (currentRotation + 90) % 360;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        if (newRotation === 90 || newRotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((newRotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const file = new File([blob], `image_rotated_${newRotation}.jpg`, { type: 'image/jpeg' });
          const newPreviewUrl = URL.createObjectURL(blob);

          setRotation(newRotation);
          setFile(file);
          setPreview(newPreviewUrl);

          if (imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
          }

          resolve();
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  };

  const handleRotateIdCardFront = async () => {
    if (!idCardFrontPreview || !idCardFrontFile) return;
    
    try {
      await rotateImage(
        idCardFrontPreview,
        idCardFrontRotation,
        setIdCardFrontRotation,
        setIdCardFrontFile,
        setIdCardFrontPreview
      );
    } catch (error) {
      console.error('Error rotating image:', error);
      Swal.fire('Lỗi', 'Không thể xoay ảnh', 'error');
    }
  };

  const handleRotateSelfie = async () => {
    if (!selfiePreview || !selfieFile) return;
    
    try {
      await rotateImage(
        selfiePreview,
        selfieRotation,
        setSelfieRotation,
        setSelfieFile,
        setSelfiePreview
      );
    } catch (error) {
      console.error('Error rotating selfie:', error);
      Swal.fire('Lỗi', 'Không thể xoay ảnh', 'error');
    }
  };

  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [showCamera, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (idCardFrontPreview) URL.revokeObjectURL(idCardFrontPreview);
      if (idCardBackPreview) URL.revokeObjectURL(idCardBackPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      if (businessLicensePreview) URL.revokeObjectURL(businessLicensePreview);
      if (establishmentDecisionPreview) URL.revokeObjectURL(establishmentDecisionPreview);
    };
  }, [cameraStream, idCardFrontPreview, idCardBackPreview, selfiePreview, businessLicensePreview, establishmentDecisionPreview]);

  // Upload images to Cloudinary
  const uploadImages = async (): Promise<{
    id_card_front_url?: string;
    id_card_back_url?: string;
    selfie_url?: string;
    business_license_url?: string;
    establishment_decision_url?: string;
  }> => {
    setUploading(true);
    try {
      const uploadPromises: Promise<{ type: string; url: string }>[] = [];

      if (idCardFrontFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(idCardFrontFile, 'kyc').then(result => ({
            type: 'id_card_front',
            url: result.secure_url,
          }))
        );
      }

      if (idCardBackFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(idCardBackFile, 'kyc').then(result => ({
            type: 'id_card_back',
            url: result.secure_url,
          }))
        );
      }

      if (selfieFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(selfieFile, 'kyc').then(result => ({
            type: 'selfie',
            url: result.secure_url,
          }))
        );
      }

      if (businessLicenseFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(businessLicenseFile, 'kyc').then(result => ({
            type: 'business_license',
            url: result.secure_url,
          }))
        );
      }

      if (establishmentDecisionFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(establishmentDecisionFile, 'kyc').then(result => ({
            type: 'establishment_decision',
            url: result.secure_url,
          }))
        );
      }

      const results = await Promise.all(uploadPromises);
      
      const uploadedUrls: {
        id_card_front_url?: string;
        id_card_back_url?: string;
        selfie_url?: string;
        business_license_url?: string;
        establishment_decision_url?: string;
      } = {};

      results.forEach(result => {
        if (result.type === 'id_card_front') {
          uploadedUrls.id_card_front_url = result.url;
        } else if (result.type === 'id_card_back') {
          uploadedUrls.id_card_back_url = result.url;
        } else if (result.type === 'selfie') {
          uploadedUrls.selfie_url = result.url;
        } else if (result.type === 'business_license') {
          uploadedUrls.business_license_url = result.url;
        } else if (result.type === 'establishment_decision') {
          uploadedUrls.establishment_decision_url = result.url;
        }
      });

      return uploadedUrls;
    } catch (error: any) {
      console.error('Error uploading images:', error);
      throw new Error('Không thể tải lên hình ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang kiểm tra trạng thái...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, label: 'Người đại diện', icon: User },
    { number: 2, label: 'Thông tin tổ chức', icon: Building2 },
    { number: 3, label: 'Tài liệu', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-white py-6 sm:py-8 md:py-12 px-3 sm:px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-50 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 border border-blue-100">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 tracking-tight">Xác thực tổ chức</h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg font-medium px-2">
            Hoàn thành xác thực để có thể tạo chiến dịch gây quỹ
          </p>
        </div>

        <div className="mb-6 sm:mb-8 md:mb-12">
          <div className="flex items-center justify-between relative px-2 sm:px-4">
            <div className="absolute top-4 sm:top-5 md:top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              ></div>
            </div>

            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 scale-110'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    ) : (
                      <StepIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    )}
                  </div>
                  <span
                    className={`mt-2 sm:mt-3 text-xs sm:text-sm font-medium transition-colors text-center px-1 ${
                      isActive || isCompleted
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.number}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-2xl border border-white/10 backdrop-blur-sm">
            {/* Step 1: Legal Representative */}
            {currentStep === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8 pb-4 sm:pb-5 md:pb-6 border-b border-gray-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Thông tin người đại diện pháp luật</h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Thông tin của người đại diện theo pháp luật</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type="text"
                      name="legal_representative.fullname"
                      value={formData.legal_representative.fullname}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="legal_representative.id_card_number"
                      value={formData.legal_representative.id_card_number}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="001234567890"
                      pattern="[0-9]{9,12}"
                      required
                    />
                  </div>
                  <div className="flex items-start gap-2 mt-2 text-sm text-gray-500">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>Dữ liệu sẽ được mã hóa để bảo mật</p>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Chức vụ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="legal_representative.position"
                      value={formData.legal_representative.position}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Giám đốc / Chủ tịch / Trưởng ban"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">
                    Ảnh CCCD mặt trước <span className="text-red-500">*</span>
                  </label>
                  {!idCardFrontPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                      <div className="flex flex-col items-center justify-center pt-4 sm:pt-5 pb-4 sm:pb-6 px-4">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 group-hover:text-blue-600 transition-colors mb-2 sm:mb-3" />
                        <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 font-medium text-center">
                          <span className="text-blue-600">Click để upload</span> hoặc kéo thả file
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdCardFrontChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative group">
                      <div className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-4 bg-gray-50">
                        <img
                          src={idCardFrontPreview}
                          alt="CCCD mặt trước"
                          className="w-full h-48 sm:h-64 object-contain rounded-lg"
                          style={{ transform: `rotate(${idCardFrontRotation}deg)` }}
                        />
                      </div>
                      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-2">
                        <button
                          type="button"
                          onClick={handleRotateIdCardFront}
                          className="bg-blue-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg"
                          title="Xoay ảnh 90°"
                        >
                          <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={removeIdCardFront}
                          className="bg-red-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                          title="Xóa ảnh"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">
                    Ảnh CCCD mặt sau
                  </label>
                  {!idCardBackPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                      <div className="flex flex-col items-center justify-center pt-4 sm:pt-5 pb-4 sm:pb-6 px-4">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 group-hover:text-blue-600 transition-colors mb-2 sm:mb-3" />
                        <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 font-medium text-center">
                          <span className="text-blue-600">Click để upload</span> hoặc kéo thả file
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdCardBackChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative group">
                      <div className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-4 bg-gray-50">
                        <img
                          src={idCardBackPreview}
                          alt="CCCD mặt sau"
                          className="w-full h-48 sm:h-64 object-contain rounded-lg"
                        />
                      </div>
                      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-2">
                        <button
                          type="button"
                          onClick={removeIdCardBack}
                          className="bg-red-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                          title="Xóa ảnh"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-3 text-sm">
                    Ảnh selfie với CCCD <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {!selfiePreview && !showCamera && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center group"
                      >
                        <Camera className="w-10 h-10 text-gray-400 group-hover:text-blue-600 transition-colors mb-3" />
                        <p className="text-sm text-gray-500 font-medium">Chụp ảnh selfie với CCCD</p>
                      </button>
                    )}
                    
                    {showCamera && (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
                        <div className="relative bg-black rounded-lg overflow-hidden">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full max-w-md mx-auto"
                            style={{ transform: 'scaleX(-1)', minHeight: '400px', objectFit: 'cover' }}
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex gap-3 mt-6 justify-center">
                          <button
                            type="button"
                            onClick={captureSelfie}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg shadow-green-500/30 flex items-center gap-2"
                          >
                            <Camera className="w-5 h-5" />
                            Chụp ảnh
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold flex items-center gap-2"
                          >
                            <X className="w-5 h-5" />
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}

                    {selfiePreview && !showCamera && (
                      <div className="relative group">
                        <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                          <img
                            src={selfiePreview}
                            alt="Selfie"
                            className="w-full h-64 object-contain rounded-lg"
                            style={{ transform: `rotate(${selfieRotation}deg)` }}
                          />
                        </div>
                        <div className="absolute top-6 right-6 flex gap-2">
                          <button
                            type="button"
                            onClick={handleRotateSelfie}
                            className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg"
                            title="Xoay ảnh 90°"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={removeSelfie}
                            className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                            title="Xóa ảnh"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Vui lòng chụp ảnh selfie với CCCD trong khung hình.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Organization Info */}
            {currentStep === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8 pb-4 sm:pb-5 md:pb-6 border-b border-gray-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Thông tin tổ chức</h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Thông tin về tổ chức của bạn</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Tên tổ chức <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="organization_documents.organization_name"
                      value={formData.organization_documents.organization_name}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Tên tổ chức"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Mã số thuế <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="organization_documents.tax_code"
                      value={formData.organization_documents.tax_code}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0123456789"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Địa chỉ tổ chức <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <textarea
                      name="organization_documents.organization_address"
                      value={formData.organization_documents.organization_address}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px]"
                      placeholder="Địa chỉ đầy đủ của tổ chức"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8 pb-4 sm:pb-5 md:pb-6 border-b border-gray-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Tài liệu tổ chức</h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Upload các tài liệu cần thiết</p>
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">
                      Giấy phép kinh doanh <span className="text-red-500">*</span>
                    </label>
                    {!businessLicensePreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-4 sm:pt-5 pb-4 sm:pb-6 px-4">
                          <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 group-hover:text-blue-600 transition-colors mb-2 sm:mb-3" />
                          <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 font-medium text-center">
                            <span className="text-blue-600">Click để upload</span> hoặc kéo thả file
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 10MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBusinessLicenseChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative group">
                        <div className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-4 bg-gray-50">
                          <img
                            src={businessLicensePreview}
                            alt="Giấy phép kinh doanh"
                            className="w-full h-48 sm:h-64 object-contain rounded-lg"
                          />
                        </div>
                        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-2">
                          <button
                            type="button"
                            onClick={removeBusinessLicense}
                            className="bg-red-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                            title="Xóa file"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">
                      Quyết định thành lập <span className="text-red-500">*</span>
                    </label>
                    {!establishmentDecisionPreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-40 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-4 sm:pt-5 pb-4 sm:pb-6 px-4">
                          <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 group-hover:text-blue-600 transition-colors mb-2 sm:mb-3" />
                          <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 font-medium text-center">
                            <span className="text-blue-600">Click để upload</span> hoặc kéo thả file
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 10MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEstablishmentDecisionChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative group">
                        <div className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-4 bg-gray-50">
                          <img
                            src={establishmentDecisionPreview}
                            alt="Quyết định thành lập"
                            className="w-full h-48 sm:h-64 object-contain rounded-lg"
                          />
                        </div>
                        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-2">
                          <button
                            type="button"
                            onClick={removeEstablishmentDecision}
                            className="bg-red-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                            title="Xóa file"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-700 text-sm">
                    <strong className="font-semibold">Lưu ý:</strong> Tất cả các tài liệu sẽ được upload tự động lên Cloudinary khi bạn gửi yêu cầu.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-6 md:pt-8 border-t border-gray-200 gap-2 sm:gap-4">
              <button
                type="button"
                onClick={currentStep === 1 ? handleCancel : prevStep}
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3.5 text-xs sm:text-sm md:text-base bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-all font-semibold flex items-center gap-1.5 sm:gap-2"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{currentStep === 1 ? 'Hủy' : 'Quay lại'}</span>
                <span className="sm:hidden">{currentStep === 1 ? 'Hủy' : '←'}</span>
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3.5 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-1.5 sm:gap-2"
                >
                  <span className="hidden sm:inline">Tiếp tục</span>
                  <span className="sm:hidden">Tiếp</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3.5 text-xs sm:text-sm md:text-base bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-green-500/30 flex items-center gap-1.5 sm:gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">Đang gửi...</span>
                      <span className="sm:hidden">Gửi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Gửi yêu cầu</span>
                      <span className="sm:hidden">Gửi</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="mt-4 sm:mt-6 md:mt-8 bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border border-gray-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 font-bold text-base sm:text-lg mb-3 sm:mb-4">Tại sao cần xác thực tổ chức?</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-600">
                <li className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Đảm bảo tính minh bạch và uy tín của tổ chức</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Bảo vệ người quyên góp khỏi các chiến dịch lừa đảo</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Tuân thủ quy định pháp luật về gây quỹ từ thiện</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Tạo niềm tin cho cộng đồng</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationKYCSubmission() {
  return (
    <ProtectedRoute>
      <OrganizationKYCSubmissionContent />
    </ProtectedRoute>
  );
}

