'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { kycService } from '@/services/kyc.service';
import { cloudinaryService } from '@/services/cloudinary.service';
import { imageValidator } from '@/utils/image-validator';
import Swal from 'sweetalert2';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  User,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  X
} from 'lucide-react';

interface VNPTKYCFormProps {
  onBack?: () => void;
}

export default function VNPTKYCForm({ onBack }: VNPTKYCFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [identityFrontFile, setIdentityFrontFile] = useState<File | null>(null);
  const [identityBackFile, setIdentityBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [identityFrontPreview, setIdentityFrontPreview] = useState<string | null>(null);
  const [identityBackPreview, setIdentityBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any>(null);

  const [ocrData, setOcrData] = useState<any>(null);
  const [manualEdit, setManualEdit] = useState(false);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null); 
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    identity_verified_name: '',
    identity_card_number: '',
    tax_code: '',
    address: {
      city: '',
      district: '',
      ward: '',
    },
    bank_account: {
      bank_name: '',
      account_number: '',
      account_holder_name: '',
    },
    kyc_documents: {
      identity_front_url: '',
      identity_back_url: '',
      selfie_url: '',
    }
  });

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

    context.save();
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const preview = URL.createObjectURL(blob);
        
        setSelfieFile(file);
        setSelfiePreview(preview);
        stopCamera();
        
        Swal.fire({
          icon: 'success',
          title: 'Đã chụp ảnh!',
          text: 'Ảnh selfie đã được lưu',
          timer: 1500,
          showConfirmButton: false
        });
      }
    }, 'image/jpeg', 0.95);
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
      if (identityFrontPreview) URL.revokeObjectURL(identityFrontPreview);
      if (identityBackPreview) URL.revokeObjectURL(identityBackPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [cameraStream, identityFrontPreview, identityBackPreview, selfiePreview]);

  const handleFileSelect = async (file: File, type: 'front' | 'back' | 'selfie') => {
    let validationResult;
    
    if (type === 'selfie') {
      validationResult = await imageValidator.validateSelfieImage(file);
    } else {
      validationResult = await imageValidator.validateCardImage(file);
    }

    if (!validationResult.isValid) {
      Swal.fire({
        icon: 'error',
        title: 'Ảnh không hợp lệ',
        text: validationResult.error,
      });
      return;
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Cảnh báo',
        html: `<div class="text-left">
          <p class="mb-2">Ảnh của bạn có một số vấn đề:</p>
          <ul class="list-disc pl-5 text-sm">
            ${validationResult.warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
          <p class="mt-3 text-sm text-gray-600">Bạn vẫn có thể tiếp tục, nhưng chất lượng OCR có thể không tốt.</p>
        </div>`,
        showCancelButton: true,
        confirmButtonText: 'Tiếp tục',
        cancelButtonText: 'Chọn ảnh khác'
      }).then((result) => {
        if (!result.isConfirmed) {
          return;
        }
      });
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'front') {
        setIdentityFrontFile(file);
        setIdentityFrontPreview(preview);
      } else if (type === 'back') {
        setIdentityBackFile(file);
        setIdentityBackPreview(preview);
      } else {
        setSelfieFile(file);
        setSelfiePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const verifyImageQuality = async (imageUrl: string, type: string) => {
    try {
      const result = await kycService.verifyDocumentQuality(imageUrl);
      
      if (!result.success) {
        await Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          html: `<div class="text-left">
            <p class="font-semibold mb-2">${type}:</p>
            <p>${result.message}</p>
          </div>`,
        });
        return false;
      }
      
      if (!result.is_real) {
        const livenessMsg = result.liveness_msg || 'Không phải ảnh gốc';
        await Swal.fire({
          icon: 'warning',
          title: '⚠️ Cảnh báo: Ảnh chưa đạt chuẩn VNPT',
          html: `<div class="text-left">
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
              <p class="font-semibold text-yellow-800">${type}</p>
              <p class="text-sm text-yellow-700 mt-1">${livenessMsg}</p>
            </div>
            
            <div class="bg-blue-50 p-3 rounded mb-3">
              <p class="text-sm text-gray-700"><strong>📋 Loại giấy tờ:</strong> ${result.card_type}</p>
            </div>
            
            <div class="text-sm text-gray-700 mb-2">
              <strong>🤔 VNPT phát hiện ảnh này có thể:</strong>
            </div>
            <ul class="text-sm text-gray-600 list-disc ml-5 space-y-1">
              <li>Chụp từ <strong>màn hình thiết bị khác</strong> (điện thoại, máy tính)</li>
              <li>Là bản <strong>photocopy hoặc scan</strong></li>
              <li>Chụp qua <strong>lớp nhựa bảo vệ</strong> (gây phản chiếu)</li>
              <li>Chất lượng kém (mờ, tối, góc chụp sai)</li>
            </ul>
            
            <div class="bg-green-50 border-l-4 border-green-400 p-3 mt-3">
              <p class="text-sm text-green-700"><strong>✅ Gợi ý:</strong></p>
              <ul class="text-sm text-green-600 list-disc ml-5 mt-1 space-y-1">
                <li>Chụp <strong>trực tiếp</strong> từ CCCD gốc</li>
                <li>Tháo khỏi ví/lớp bảo vệ</li>
                <li>Ánh sáng tự nhiên, không flash</li>
                <li>Camera ổn định, không rung</li>
              </ul>
            </div>
            
            <div class="bg-gray-50 p-3 rounded mt-3">
              <p class="text-xs text-gray-600">
                💡 <strong>Lưu ý:</strong> Bạn có thể tiếp tục nhưng KYC sẽ được admin xem xét thủ công để đảm bảo an toàn.
              </p>
            </div>
          </div>`,
          confirmButtonText: 'Tôi đã hiểu, tiếp tục',
          width: '600px'
        });
      } else {
        await Swal.fire({
          icon: 'success',
          title: '✅ Ảnh đạt chuẩn',
          html: `<div class="text-center">
                   <p class="text-green-600 font-semibold">${result.message}</p>
                   <p class="text-sm text-gray-600 mt-2">📋 ${result.card_type}</p>
                 </div>`,
          timer: 1500,
          showConfirmButton: false
        });
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi kiểm tra chất lượng:', error);
      return true;
    }
  };

  const performOCR = async (frontUrl: string, backUrl?: string) => {
    try {
      setVerifying(true);
      const result = await kycService.ocrDocument(frontUrl, backUrl);
      
      if (result.success && result.extracted_data) {
        setOcrData(result);
        setFormData(prev => ({
          ...prev,
          identity_card_number: result.extracted_data.identity_card_number || '',
          identity_verified_name: result.extracted_data.identity_verified_name || '',
          address: {
            ...prev.address,
            city: result.extracted_data.address?.split(',').pop()?.trim() || '',
            district: '',
            ward: '',
          }
        }));

        Swal.fire({
          icon: 'success',
          title: 'Trích xuất thông tin thành công',
          html: `<div class="text-left">
            <p><strong>Họ tên:</strong> ${result.extracted_data.identity_verified_name}</p>
            <p><strong>Số CCCD:</strong> ${result.extracted_data.identity_card_number}</p>
            <p><strong>Ngày sinh:</strong> ${result.extracted_data.date_of_birth || 'N/A'}</p>
            <p class="text-sm text-gray-600 mt-2">Độ tin cậy: ${(result.confidence * 100).toFixed(1)}%</p>
          </div>`,
          confirmButtonText: 'Tiếp tục'
        });

        setCurrentStep(3);
      } else {
        Swal.fire('Lỗi', result.message || 'Không thể trích xuất thông tin', 'error');
      }
    } catch (error: any) {
      Swal.fire('Lỗi', error.response?.data?.message || 'Lỗi khi trích xuất thông tin', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!identityFrontFile) {
      Swal.fire('Lỗi', 'Vui lòng chụp/tải ảnh mặt trước CCCD', 'error');
      return;
    }

    setLoading(true);

    try {
      Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang upload và xác thực ảnh',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const frontResponse = await cloudinaryService.uploadImage(identityFrontFile);
      const frontUrl = frontResponse.secure_url;
      await verifyImageQuality(frontUrl, 'Ảnh mặt trước CCCD');

      let backUrl: string | undefined;
      if (identityBackFile) {
        const backResponse = await cloudinaryService.uploadImage(identityBackFile);
        backUrl = backResponse.secure_url;
        await verifyImageQuality(backUrl, 'Ảnh mặt sau CCCD');
      }

      Swal.close();
      await performOCR(frontUrl, backUrl);

      setFormData(prev => ({
        ...prev,
        kyc_documents: {
          ...prev.kyc_documents,
          identity_front_url: frontUrl,
          identity_back_url: backUrl || '',
        }
      }));

    } catch (error: any) {
      console.error('Lỗi upload:', error);
      Swal.fire('Lỗi', error.message || 'Có lỗi xảy ra khi xử lý ảnh', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    if (!selfieFile) {
      Swal.fire('Lỗi', 'Vui lòng chụp/tải ảnh chân dung', 'error');
      return;
    }

    setLoading(true);

    try {
      Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang upload và so sánh khuôn mặt',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const selfieResponse = await cloudinaryService.uploadImage(selfieFile);
      const selfieUrl = selfieResponse.secure_url;

      const compareResult = await kycService.compareFaces(
        formData.kyc_documents.identity_front_url,
        selfieUrl
      );

      Swal.close();

      if (compareResult.success) {
        if (compareResult.is_match) {
          Swal.fire({
            icon: 'success',
            title: 'Khuôn mặt khớp!',
            html: `<p>${compareResult.result_text}</p>
                   <p class="text-sm text-gray-600 mt-2">Độ tương đồng: ${compareResult.probability.toFixed(1)}%</p>`,
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Khuôn mặt không khớp',
            html: `<p>${compareResult.result_text}</p>
                   <p class="text-sm text-gray-600 mt-2">Độ tương đồng: ${compareResult.probability.toFixed(1)}%</p>
                   <p class="text-sm mt-2">Bạn có thể tiếp tục nhưng KYC sẽ cần được duyệt thủ công.</p>`,
          });
        }
      }

      setFormData(prev => ({
        ...prev,
        kyc_documents: {
          ...prev.kyc_documents,
          selfie_url: selfieUrl,
        }
      }));

      setCurrentStep(4);

    } catch (error: any) {
      console.error('Lỗi:', error);
      Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!formData.identity_verified_name || !formData.identity_card_number) {
      Swal.fire('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      return;
    }

    setLoading(true);

    try {
      Swal.fire({
        title: 'Đang gửi KYC...',
        html: 'Hệ thống VNPT eKYC đang xác thực thông tin của bạn',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const payload = {
        kyc_documents: formData.kyc_documents,
        identity_card_number: formData.identity_card_number,
        identity_verified_name: formData.identity_verified_name,
        tax_code: formData.tax_code || undefined,
        address: formData.address,
        bank_account: formData.bank_account.account_number ? formData.bank_account : undefined,
      };

      const result = await kycService.submitKYCWithVNPT(payload);

      Swal.close();

      if (result.kyc?.status === 'verified') {
        await Swal.fire({
          icon: 'success',
          title: 'Xác thực thành công!',
          html: `<div class="text-left">
            <p class="mb-2">${result.message}</p>
            <p class="text-sm text-gray-600">Tài khoản của bạn đã được xác thực tự động bởi VNPT eKYC.</p>
          </div>`,
          confirmButtonText: 'Hoàn tất'
        });
        router.push('/');
      } else if (result.kyc?.status === 'pending') {
        await Swal.fire({
          icon: 'info',
          title: 'Đã gửi yêu cầu',
          html: `<div class="text-left">
            <p class="mb-2">${result.message}</p>
            <p class="text-sm text-gray-600">Vui lòng đợi admin duyệt KYC của bạn.</p>
          </div>`,
          confirmButtonText: 'Đã hiểu'
        });
        router.push('/');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'KYC bị từ chối',
          html: `<div class="text-left">
            <p class="mb-2">${result.message}</p>
            <p class="text-sm text-red-600 mt-2">Lý do: ${result.kyc?.rejection_reason}</p>
            <p class="text-sm text-gray-600 mt-2">Bạn có thể thử lại với ảnh khác hoặc liên hệ hỗ trợ.</p>
          </div>`,
        });
      }

    } catch (error: any) {
      Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi gửi KYC', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
            ${currentStep >= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {step}
          </div>
          {step < 4 && (
            <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="text-center space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
        <div className="flex justify-center mb-4">
          <Sparkles className="w-16 h-16 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Xác thực KYC với VNPT eKYC
        </h2>
        <p className="text-gray-600 mb-6">
          Hệ thống tự động xác thực danh tính bằng công nghệ AI hiện đại
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <FileCheck className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-semibold mb-1">Trích xuất tự động</h3>
            <p className="text-sm text-gray-600">OCR thông tin từ CCCD</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <Camera className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-semibold mb-1">Xác thực khuôn mặt</h3>
            <p className="text-sm text-gray-600">So sánh với ảnh trên giấy tờ</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-semibold mb-1">Duyệt nhanh</h3>
            <p className="text-sm text-gray-600">Tự động hoặc thủ công</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Yêu cầu chất lượng ảnh (theo tiêu chuẩn VNPT):
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1 ml-7">
              <li>Ảnh gốc, không scan hay photocopy</li>
              <li>Định dạng: JPG, JPEG, PNG (tối đa 5MB)</li>
              <li>Độ phân giải tối thiểu: 600x900 pixel</li>
              <li>Khuyến nghị: 1200x1800 pixel để đạt kết quả tốt nhất</li>
              <li>Đủ 4 góc rõ ràng, không bị cắt mép</li>
              <li>Không mờ nhòe, lóa sáng, tẩy xóa</li>
              <li>Giấy tờ chiếm 1/3 đến 4/5 diện tích ảnh</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Hướng dẫn chụp ảnh CCCD:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 ml-7">
              <li>Đặt giấy tờ lên mặt bàn phẳng</li>
              <li>Chụp từ phía trên, song song với giấy tờ</li>
              <li>Đảm bảo ánh sáng đủ và đều</li>
              <li>Không để ngón tay che góc hoặc thông tin</li>
              <li>Không chụp lại từ màn hình điện thoại/máy tính</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-left">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Hướng dẫn chụp ảnh chân dung:
            </h4>
            <ul className="text-sm text-green-700 space-y-1 ml-7">
              <li>Độ phân giải tối thiểu: 480x480 pixel</li>
              <li>Khuyến nghị: 720x1280 pixel</li>
              <li>Chỉ có 1 người trong ảnh</li>
              <li>Khuôn mặt chiếm 1/4 đến 4/5 diện tích ảnh</li>
              <li>Không đeo khẩu trang, kính đen</li>
              <li>Chụp ở nơi có ánh sáng tốt</li>
              <li>Không mờ nhòe</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={() => setCurrentStep(2)}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center"
      >
        Bắt đầu xác thực
        <ArrowRight className="ml-2 w-5 h-5" />
      </button>

      {onBack && (
        <button
          onClick={onBack}
          className="w-full text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center justify-center"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Quay lại
        </button>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload ảnh CCCD
        </h2>
        <p className="text-gray-600">
          Chụp hoặc tải lên ảnh CCCD mặt trước và mặt sau
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">
              Mặt trước CCCD <span className="text-red-500">*</span>
            </span>
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], 'front')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {identityFrontPreview ? (
                <img src={identityFrontPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click để chọn ảnh</p>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">
              Mặt sau CCCD (tùy chọn)
            </span>
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], 'back')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {identityBackPreview ? (
                <img src={identityBackPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click để chọn ảnh</p>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setCurrentStep(1)}
          className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center"
          disabled={loading || verifying}
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={handleStep2Submit}
          disabled={!identityFrontFile || loading || verifying}
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              Tiếp tục
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Chụp ảnh chân dung
        </h2>
        <p className="text-gray-600">
          Chụp ảnh khuôn mặt của bạn để xác thực
        </p>
      </div>

      {ocrData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Thông tin đã trích xuất:
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Họ tên:</strong> {ocrData.extracted_data.identity_verified_name}</p>
            <p><strong>Số CCCD:</strong> {ocrData.extracted_data.identity_card_number}</p>
            <p><strong>Ngày sinh:</strong> {ocrData.extracted_data.date_of_birth || 'N/A'}</p>
            <p><strong>Giới tính:</strong> {ocrData.extracted_data.gender || 'N/A'}</p>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Ảnh chân dung <span className="text-red-500">*</span>
        </label>
        
        {!selfiePreview && !showCamera && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={startCamera}
              className="w-full h-48 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors flex flex-col items-center justify-center group"
            >
              <Camera className="w-12 h-12 text-blue-500 group-hover:text-blue-600 transition-colors mb-3" />
              <p className="text-sm text-blue-700 font-semibold">Mở camera để chụp selfie</p>
              <p className="text-xs text-blue-600 mt-1">Khuyến nghị để có kết quả tốt nhất</p>
            </button>
            
            <div className="text-center text-gray-500 text-sm">hoặc</div>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Tải ảnh từ thiết bị</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], 'selfie')}
                className="hidden"
              />
            </label>
          </div>
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
          <div className="relative">
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <img src={selfiePreview} alt="Selfie" className="max-h-64 mx-auto rounded" />
            </div>
            <button
              type="button"
              onClick={() => {
                setSelfieFile(null);
                setSelfiePreview(null);
              }}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Ảnh chân dung cần rõ mặt, không đeo kính hoặc khẩu trang. Chụp trực tiếp từ camera để đạt kết quả tốt nhất.</span>
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setCurrentStep(2)}
          className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={handleStep3Submit}
          disabled={!selfieFile || loading}
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              Tiếp tục
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Xác nhận thông tin
        </h2>
        <p className="text-gray-600">
          Kiểm tra và bổ sung thông tin còn thiếu
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Họ tên <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.identity_verified_name}
            onChange={(e) => setFormData({ ...formData, identity_verified_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="VD: NGUYỄN VĂN A"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số CCCD <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.identity_card_number}
            onChange={(e) => setFormData({ ...formData, identity_card_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="VD: 001234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mã số thuế (tùy chọn)
          </label>
          <input
            type="text"
            value={formData.tax_code}
            onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="VD: 0123456789"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tỉnh/Thành phố
            </label>
            <input
              type="text"
              value={formData.address.city}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, city: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="VD: Hà Nội"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quận/Huyện
            </label>
            <input
              type="text"
              value={formData.address.district}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, district: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="VD: Hoàn Kiếm"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Thông tin ngân hàng (tùy chọn)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên ngân hàng
              </label>
              <input
                type="text"
                value={formData.bank_account.bank_name}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  bank_account: { ...formData.bank_account, bank_name: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: Vietcombank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số tài khoản
              </label>
              <input
                type="text"
                value={formData.bank_account.account_number}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  bank_account: { ...formData.bank_account, account_number: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: 0123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên chủ tài khoản
              </label>
              <input
                type="text"
                value={formData.bank_account.account_holder_name}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  bank_account: { ...formData.bank_account, account_holder_name: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: NGUYEN VAN A"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setCurrentStep(3)}
          className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Quay lại
        </button>
        <button
          onClick={handleFinalSubmit}
          disabled={loading || !formData.identity_verified_name || !formData.identity_card_number}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 w-5 h-5" />
              Hoàn tất KYC
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStepIndicator()}
      
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
}

