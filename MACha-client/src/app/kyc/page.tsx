'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import apiClient from '@/lib/api-client';
import Swal from 'sweetalert2';
import { SUBMIT_KYC_ROUTE } from '@/constants/api';
import { cloudinaryService } from '@/services/cloudinary.service';

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
    if (!identityFrontFile || !identityBackFile || !selfieFile) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu ảnh',
        text: 'Vui lòng upload đầy đủ ảnh CCCD mặt trước, mặt sau và ảnh selfie',
      });
      return;
    }

    try {
      setLoading(true);

      Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang upload ảnh và gửi yêu cầu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Upload images first
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

      const response = await apiClient.post(SUBMIT_KYC_ROUTE, finalFormData);

      Swal.fire({
        icon: 'success',
        title: 'Gửi thành công!',
        text: response.data.message || 'Yêu cầu KYC của bạn đã được gửi. Vui lòng đợi admin xem xét.',
      }).then(() => {
        router.push('/');
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || error.message || 'Không thể gửi yêu cầu KYC',
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

  // File upload handlers
  const handleIdentityFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (max 5MB)', 'error');
      return;
    }

    if (identityFrontPreview) {
      URL.revokeObjectURL(identityFrontPreview);
    }

    setIdentityFrontFile(file);
    setIdentityFrontPreview(URL.createObjectURL(file));
  };

  const handleIdentityBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (max 5MB)', 'error');
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
      stopCamera();
    }, 'image/jpeg', 0.9);
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
    identity_back_url?: string;
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

      if (identityBackFile) {
        uploadPromises.push(
          cloudinaryService.uploadImage(identityBackFile, 'kyc').then(result => ({
            type: 'identity_back',
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
        identity_back_url?: string;
        selfie_url?: string;
      } = {};

      results.forEach(result => {
        if (result.type === 'identity_front') {
          uploadedUrls.identity_front_url = result.url;
        } else if (result.type === 'identity_back') {
          uploadedUrls.identity_back_url = result.url;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Đang kiểm tra trạng thái...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Xác thực danh tính (KYC)</h1>
          <p className="text-gray-400">
            Hoàn thành xác thực để có thể tạo chiến dịch gây quỹ
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-24 h-1 mx-2 transition-all ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 gap-24">
            <span className={`text-sm ${currentStep >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>
              Thông tin cá nhân
            </span>
            <span className={`text-sm ${currentStep >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>
              Ngân hàng
            </span>
            <span className={`text-sm ${currentStep >= 3 ? 'text-blue-400' : 'text-gray-500'}`}>
              Tài liệu
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-gray-800 rounded-lg p-8 shadow-xl border border-gray-700">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Thông tin cá nhân</h2>
                
                <div>
                  <label className="block text-gray-300 mb-2">
                    Họ và tên (theo CCCD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="identity_verified_name"
                    value={formData.identity_verified_name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="identity_card_number"
                    value={formData.identity_card_number}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="001234567890"
                    pattern="[0-9]{9,12}"
                    required
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    Nhập đầy đủ số CCCD. Dữ liệu sẽ được mã hóa để bảo mật.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Mã số thuế (nếu có)</label>
                  <input
                    type="text"
                    name="tax_code"
                    value={formData.tax_code}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0123456789"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Tỉnh/Thành phố</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Hà Nội"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Quận/Huyện</label>
                    <input
                      type="text"
                      name="address.district"
                      value={formData.address.district}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Hoàn Kiếm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Bank Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Thông tin ngân hàng</h2>
                
                <div>
                  <label className="block text-gray-300 mb-2">Tên ngân hàng</label>
                  <input
                    type="text"
                    name="bank_account.bank_name"
                    value={formData.bank_account.bank_name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Vietcombank"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Số tài khoản</label>
                  <input
                    type="text"
                    name="bank_account.account_number"
                    value={formData.bank_account.account_number}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="1234567890"
                    pattern="[0-9]{8,16}"
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    Nhập đầy đủ số tài khoản. Dữ liệu sẽ được mã hóa để bảo mật.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Chủ tài khoản</label>
                  <input
                    type="text"
                    name="bank_account.account_holder_name"
                    value={formData.bank_account.account_holder_name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="NGUYEN VAN A"
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    💡 <strong>Lưu ý:</strong> Thông tin ngân hàng được sử dụng để nhận tiền từ các chiến dịch thành công.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Tài liệu xác thực</h2>
                
                <div className="space-y-6">
                  {/* CCCD Mặt trước */}
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Ảnh CCCD mặt trước <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIdentityFrontChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {identityFrontPreview && (
                      <div className="mt-4 relative inline-block">
                        <img
                          src={identityFrontPreview}
                          alt="CCCD mặt trước"
                          className="max-w-full h-64 object-contain rounded-lg border border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={removeIdentityFront}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-all"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CCCD Mặt sau */}
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Ảnh CCCD mặt sau <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIdentityBackChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {identityBackPreview && (
                      <div className="mt-4 relative inline-block">
                        <img
                          src={identityBackPreview}
                          alt="CCCD mặt sau"
                          className="max-w-full h-64 object-contain rounded-lg border border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={removeIdentityBack}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-all"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Selfie với CCCD */}
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Ảnh selfie với CCCD <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      {!selfiePreview && !showCamera && (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <span>📷</span> Chụp ảnh selfie
                        </button>
                      )}
                      
                      {showCamera && (
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="relative">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full max-w-md mx-auto rounded-lg bg-black"
                              style={{ transform: 'scaleX(-1)', minHeight: '400px', objectFit: 'cover' }}
                            />
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                          <div className="flex gap-3 mt-4 justify-center">
                            <button
                              type="button"
                              onClick={captureSelfie}
                              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                            >
                              Chụp ảnh
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}

                      {selfiePreview && !showCamera && (
                        <div className="relative inline-block">
                          <img
                            src={selfiePreview}
                            alt="Selfie"
                            className="max-w-full h-64 object-contain rounded-lg border border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={removeSelfie}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-all"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      Vui lòng chụp ảnh selfie với CCCD trong khung hình. Ảnh sẽ được chụp trực tiếp từ camera.
                    </p>
                  </div>

                  {/* Tài liệu bổ sung (tùy chọn) */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Tài liệu bổ sung (tùy chọn)</h3>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">URL giấy tờ thuế (nếu có)</label>
                      <input
                        type="url"
                        name="kyc_documents.tax_document_url"
                        value={formData.kyc_documents.tax_document_url}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="https://example.com/tax-doc.pdf"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-gray-300 mb-2">URL sao kê ngân hàng (nếu có)</label>
                      <input
                        type="url"
                        name="kyc_documents.bank_statement_url"
                        value={formData.kyc_documents.bank_statement_url}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="https://example.com/bank-statement.pdf"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    💡 <strong>Lưu ý:</strong> Ảnh CCCD mặt trước, mặt sau và selfie là bắt buộc. 
                    Ảnh sẽ được upload tự động lên Cloudinary khi bạn gửi yêu cầu.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={currentStep === 1 ? handleCancel : prevStep}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
              >
                {currentStep === 1 ? 'Hủy' : 'Quay lại'}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi yêu cầu'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-3">📝 Tại sao cần xác thực?</h3>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li>✓ Đảm bảo tính minh bạch và uy tín của người tạo chiến dịch</li>
            <li>✓ Bảo vệ người quyên góp khỏi các chiến dịch lừa đảo</li>
            <li>✓ Tuân thủ quy định pháp luật về gây quỹ từ thiện</li>
            <li>✓ Tạo niềm tin cho cộng đồng</li>
          </ul>
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

