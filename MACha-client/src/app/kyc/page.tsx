'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import apiClient from '@/lib/api-client';
import Swal from 'sweetalert2';
import { SUBMIT_KYC_ROUTE } from '@/constants/api';
import { cloudinaryService } from '@/services/cloudinary.service';
import { 
  User, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Calendar,
  Upload,
  Camera,
  X,
  Lock,
  Shield,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RotateCw
} from 'lucide-react';

function KYCSubmissionContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // File upload states
  const [identityFrontFile, setIdentityFrontFile] = useState<File | null>(null);
  const [identityBackFile, setIdentityBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [identityFrontPreview, setIdentityFrontPreview] = useState<string | null>(null);
  const [identityBackPreview, setIdentityBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Rotation states
  const [identityFrontRotation, setIdentityFrontRotation] = useState(0);
  const [selfieRotation, setSelfieRotation] = useState(0);
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    identity_verified_name: '',
    identity_card_number: '', // Lưu full số CCCD (sẽ được mã hóa ở server)
    identity_card_last4: '', // Tự động tạo từ full number
    tax_code: '',
    address: {
      city: '',
      district: '',
    },
    bank_account: {
      bank_name: '',
      account_number: '', // Lưu full số tài khoản (sẽ được mã hóa ở server)
      account_number_last4: '', // Tự động tạo từ full number
      account_holder_name: '',
    },
    kyc_documents: {
      identity_front_url: '',
      identity_back_url: '',
      selfie_url: '',
      tax_document_url: '',
      bank_statement_url: '',
    },
  });

  useEffect(() => {
    // Check if user is already verified or pending
    if (!user) {
      setCheckingStatus(true);
      return;
    }

    setCheckingStatus(false);

    if (user.kyc_status === 'verified') {
      Swal.fire({
        icon: 'info',
        title: 'Đã xác thực',
        text: 'Tài khoản của bạn đã được xác thực',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow submission on step 3
    if (currentStep !== 3) {
      nextStep();
      return;
    }
    
    // Validate required fields (only for step 3)
    if (!formData.identity_verified_name || !formData.identity_card_number) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu thông tin',
        text: 'Vui lòng điền đầy đủ thông tin bắt buộc',
      });
      return;
    }

    // Validate required images
    if (!identityFrontFile || !selfieFile) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu ảnh',
        text: 'Vui lòng upload đầy đủ ảnh CCCD mặt trước và ảnh selfie',
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
        identity_verified_name: formData.identity_verified_name,
        identity_card_number: formData.identity_card_number,
        tax_code: formData.tax_code,
        address: formData.address,
        bank_account: formData.bank_account,
        kyc_documents: {
          ...formData.kyc_documents,
          ...uploadedUrls,
        },
      };

      // Update loading message for OCR processing (keep loading, no buttons)
      Swal.update({
        title: 'Đang xử lý OCR...',
        html: 'Đang nhận diện thông tin từ ảnh CCCD và xác minh<br/><small>Vui lòng đợi trong giây lát</small>',
        showConfirmButton: false,
        allowOutsideClick: false,
      });

      const response = await apiClient.post(SUBMIT_KYC_ROUTE, finalFormData);

      // Check if KYC was rejected due to OCR mismatch
      if (response.data.kyc?.status === 'rejected') {
        const rejectionReason = response.data.rejection_reason || response.data.message || 'Thông tin OCR không khớp với thông tin đã nhập';
        
        // Get comparison details if available
        const verificationResult = response.data.verification_result;
        let detailMessage = rejectionReason;
        
        if (verificationResult?.comparison) {
          const { id_number, name } = verificationResult.comparison;
          detailMessage = `<div style="text-align: left;">
            <strong>Lý do từ chối:</strong><br/>
            ${rejectionReason}<br/><br/>
            ${!id_number.match ? `<strong>Số CCCD:</strong><br/>
              - Bạn nhập: ${id_number.user_input || 'N/A'}<br/>
              - OCR nhận diện: ${id_number.ocr_extracted || 'Không nhận diện được'}<br/><br/>
            ` : ''}
            ${!name.match ? `<strong>Họ tên:</strong><br/>
              - Bạn nhập: ${name.user_input || 'N/A'}<br/>
              - OCR nhận diện: ${name.ocr_extracted || 'Không nhận diện được'}<br/>
            ` : ''}
          </div>`;
        }

        Swal.fire({
          icon: 'error',
          title: 'KYC bị từ chối',
          html: detailMessage,
          confirmButtonText: 'Đã hiểu',
          confirmButtonColor: '#dc2626',
        }).then(() => {
          // Reload page to reset form
          router.refresh();
        });
      } else {
        // KYC is pending for admin review
        // Close loading first
        Swal.close();
        
        // Show success message with better UI
        Swal.fire({
          icon: 'success',
          title: 'Gửi thành công!',
          html: `
            <div style="text-align: center; padding: 20px 0;">
              <div style="margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px; line-height: 1.5;">
                  Yêu cầu KYC của bạn đã được gửi thành công
                </div>
                ${response.data.verification_result?.match ? `
                  <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #10b981; border-radius: 12px; padding: 16px 20px; margin: 20px 0; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.1);">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                      <svg style="width: 24px; height: 24px; color: #059669;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p style="color: #065f46; font-size: 15px; font-weight: 600; margin: 0;">
                        Thông tin OCR đã được xác minh và khớp với thông tin bạn nhập
                      </p>
                    </div>
                  </div>
                ` : ''}
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
          padding: '2rem',
          customClass: {
            popup: 'kyc-success-popup',
            title: 'kyc-success-title',
            htmlContainer: 'kyc-success-content',
            confirmButton: 'kyc-success-button'
          }
        }).then(() => {
          router.push('/');
        });
      }
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error?.response?.data?.message || error.message || 'Không thể gửi yêu cầu KYC';
      const errorData = error?.response?.data;
      
      // Check if it's a rejection error
      if (error?.response?.status === 400 && errorData?.kyc?.status === 'rejected') {
        const rejectionReason = errorData.rejection_reason || errorMessage;
        const verificationResult = errorData.verification_result;
        
        let detailMessage = rejectionReason;
        if (verificationResult?.comparison) {
          const { id_number, name } = verificationResult.comparison;
          detailMessage = `<div style="text-align: left;">
            <strong>Lý do từ chối:</strong><br/>
            ${rejectionReason}<br/><br/>
            ${!id_number.match ? `<strong>Số CCCD:</strong><br/>
              - Bạn nhập: ${id_number.user_input || 'N/A'}<br/>
              - OCR nhận diện: ${id_number.ocr_extracted || 'Không nhận diện được'}<br/><br/>
            ` : ''}
            ${!name.match ? `<strong>Họ tên:</strong><br/>
              - Bạn nhập: ${name.user_input || 'N/A'}<br/>
              - OCR nhận diện: ${name.ocr_extracted || 'Không nhận diện được'}<br/>
            ` : ''}
            <br/>
            <small style="color: #6b7280;">
              💡 Vui lòng kiểm tra lại thông tin bạn nhập và đảm bảo ảnh CCCD rõ ràng, không bị mờ hoặc che khuất.
            </small>
          </div>`;
        }

        Swal.fire({
          icon: 'error',
          title: 'KYC bị từ chối',
          html: detailMessage,
          confirmButtonText: 'Đã hiểu',
          confirmButtonColor: '#dc2626',
        }).then(() => {
          router.refresh();
        });
      } else {
        // Other errors
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: errorMessage,
          confirmButtonText: 'Đã hiểu',
          confirmButtonColor: '#dc2626',
        });
      }
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

  // File upload handlers
  const handleIdentityFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (identityFrontPreview) {
      URL.revokeObjectURL(identityFrontPreview);
    }

    setIdentityFrontFile(file);
    setIdentityFrontPreview(URL.createObjectURL(file));
    setIdentityFrontRotation(0); // Reset rotation when new file is selected
  };

  const handleIdentityBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (identityBackPreview) {
      URL.revokeObjectURL(identityBackPreview);
    }

    setIdentityBackFile(file);
    setIdentityBackPreview(URL.createObjectURL(file));
  };

  const removeIdentityFront = () => {
    if (identityFrontPreview) {
      URL.revokeObjectURL(identityFrontPreview);
    }
    setIdentityFrontFile(null);
    setIdentityFrontPreview(null);
    setFormData(prev => ({
      ...prev,
      kyc_documents: {
        ...prev.kyc_documents,
        identity_front_url: '',
      },
    }));
  };

  const removeIdentityBack = () => {
    if (identityBackPreview) {
      URL.revokeObjectURL(identityBackPreview);
    }
    setIdentityBackFile(null);
    setIdentityBackPreview(null);
    setFormData(prev => ({
      ...prev,
      kyc_documents: {
        ...prev.kyc_documents,
        identity_back_url: '',
      },
    }));
  };

  const removeSelfie = () => {
    if (selfiePreview) {
      URL.revokeObjectURL(selfiePreview);
    }
    setSelfieFile(null);
    setSelfiePreview(null);
    setFormData(prev => ({
      ...prev,
      kyc_documents: {
        ...prev.kyc_documents,
        selfie_url: '',
      },
    }));
  };

  // Camera handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Front camera
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
    
    // Flip horizontally to match mirror effect of video preview
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      
      if (selfiePreview) {
        URL.revokeObjectURL(selfiePreview);
      }

      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      setSelfieRotation(0); // Reset rotation when new selfie is captured
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

        // Calculate new canvas dimensions based on rotation
        if (newRotation === 90 || newRotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Rotate and draw image
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((newRotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Convert to blob and create file
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const file = new File([blob], `image_rotated_${newRotation}.jpg`, { type: 'image/jpeg' });
          const newPreviewUrl = URL.createObjectURL(blob);

          // Update states
          setRotation(newRotation);
          setFile(file);
          setPreview(newPreviewUrl);

          // Cleanup old preview
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

  // Rotate handlers
  const handleRotateIdentityFront = async () => {
    if (!identityFrontPreview || !identityFrontFile) return;
    
    try {
      await rotateImage(
        identityFrontPreview,
        identityFrontRotation,
        setIdentityFrontRotation,
        setIdentityFrontFile,
        setIdentityFrontPreview
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

  // Set video srcObject when camera stream is available
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [showCamera, cameraStream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (identityFrontPreview) URL.revokeObjectURL(identityFrontPreview);
      if (identityBackPreview) URL.revokeObjectURL(identityBackPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [cameraStream, identityFrontPreview, identityBackPreview, selfiePreview]);

  // Upload images to Cloudinary
  const uploadImages = async (): Promise<{
    identity_front_url?: string;
    selfie_url?: string;
  }> => {
    setUploading(true);
    try {
      const uploadPromises: Promise<{ type: string; url: string }>[] = [];

      if (identityFrontFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(identityFrontFile, 'kyc').then(result => ({
            type: 'identity_front',
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

      const results = await Promise.all(uploadPromises);
      
      const uploadedUrls: {
        identity_front_url?: string;
        selfie_url?: string;
      } = {};

      results.forEach(result => {
        if (result.type === 'identity_front') {
          uploadedUrls.identity_front_url = result.url;
        } else if (result.type === 'selfie') {
          uploadedUrls.selfie_url = result.url;
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
    { number: 1, label: 'Thông tin cá nhân', icon: User },
    { number: 2, label: 'Thông tin ngân hàng', icon: Building2 },
    { number: 3, label: 'Tài liệu', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-white py-12 px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-6 border border-blue-100">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">Xác thực danh tính</h1>
          <p className="text-gray-600 text-lg font-medium">
            Hoàn thành xác thực để có thể tạo chiến dịch gây quỹ
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10">
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
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 scale-110'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`mt-3 text-sm font-medium transition-colors ${
                      isActive || isCompleted
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10 backdrop-blur-sm">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Vui lòng điền đầy đủ thông tin theo CCCD</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Họ và tên (theo CCCD) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="identity_verified_name"
                      value={formData.identity_verified_name}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                      name="identity_card_number"
                      value={formData.identity_card_number}
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
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Mã số thuế (nếu có)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="tax_code"
                      value={formData.tax_code}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0123456789"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">Tỉnh/Thành phố</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Hà Nội"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">Quận/Huyện</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        name="address.district"
                        value={formData.address.district}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Hoàn Kiếm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Bank Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Thông tin ngân hàng</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Thông tin để nhận tiền từ chiến dịch</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Tên ngân hàng</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="bank_account.bank_name"
                      value={formData.bank_account.bank_name}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Vietcombank"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Số tài khoản</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="bank_account.account_number"
                      value={formData.bank_account.account_number}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="1234567890"
                      pattern="[0-9]{8,16}"
                    />
                  </div>
                  <div className="flex items-start gap-2 mt-2 text-sm text-gray-500">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>Dữ liệu sẽ được mã hóa để bảo mật</p>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Chủ tài khoản</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="bank_account.account_holder_name"
                      value={formData.bank_account.account_holder_name}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="NGUYEN VAN A"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-700 text-sm">
                    <strong className="font-semibold">Lưu ý:</strong> Thông tin ngân hàng được sử dụng để nhận tiền từ các chiến dịch thành công.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tài liệu xác thực</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Upload các tài liệu cần thiết</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* CCCD Mặt trước */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-3 text-sm">
                      Ảnh CCCD mặt trước <span className="text-red-500">*</span>
                    </label>
                    {!identityFrontPreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-600 transition-colors mb-3" />
                          <p className="mb-2 text-sm text-gray-500 font-medium">
                            <span className="text-blue-600">Click để upload</span> hoặc kéo thả file
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 10MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIdentityFrontChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative group">
                        <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                          <img
                            src={identityFrontPreview}
                            alt="CCCD mặt trước"
                            className="w-full h-64 object-contain rounded-lg"
                            style={{ transform: `rotate(${identityFrontRotation}deg)` }}
                          />
                        </div>
                        <div className="absolute top-6 right-6 flex gap-2">
                          <button
                            type="button"
                            onClick={handleRotateIdentityFront}
                            className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg"
                            title="Xoay ảnh 90°"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={removeIdentityFront}
                            className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                            title="Xóa ảnh"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selfie với CCCD */}
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
                      Vui lòng chụp ảnh selfie với CCCD trong khung hình. Ảnh sẽ được chụp trực tiếp từ camera.
                    </p>
                  </div>

                  {/* Tài liệu bổ sung (tùy chọn) */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tài liệu bổ sung (tùy chọn)</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2 text-sm">URL giấy tờ thuế (nếu có)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <input
                            type="url"
                            name="kyc_documents.tax_document_url"
                            value={formData.kyc_documents.tax_document_url}
                            onChange={handleInputChange}
                            className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="https://example.com/tax-doc.pdf"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-semibold mb-2 text-sm">URL sao kê ngân hàng (nếu có)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <input
                            type="url"
                            name="kyc_documents.bank_statement_url"
                            value={formData.kyc_documents.bank_statement_url}
                            onChange={handleInputChange}
                            className="w-full bg-gray-50 text-gray-900 pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="https://example.com/bank-statement.pdf"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mt-6">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-700 text-sm">
                    <strong className="font-semibold">Lưu ý:</strong> Ảnh CCCD mặt trước, mặt sau và selfie là bắt buộc. 
                    Ảnh sẽ được upload tự động lên Cloudinary khi bạn gửi yêu cầu.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-10 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={currentStep === 1 ? handleCancel : prevStep}
                className="px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                {currentStep === 1 ? 'Hủy' : 'Quay lại'}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  Tiếp tục
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-green-500/30 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Gửi yêu cầu
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-gray-50 rounded-2xl p-6 md:p-8 shadow-lg border border-gray-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 font-bold text-lg mb-4">Tại sao cần xác thực?</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Đảm bảo tính minh bạch và uy tín của người tạo chiến dịch</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Bảo vệ người quyên góp khỏi các chiến dịch lừa đảo</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Tuân thủ quy định pháp luật về gây quỹ từ thiện</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Tạo niềm tin cho cộng đồng</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KYCSubmission() {
  return (
    <ProtectedRoute>
      <KYCSubmissionContent />
    </ProtectedRoute>
  );
}

