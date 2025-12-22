'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import apiClient from '@/lib/api-client';
import Swal from 'sweetalert2';
import { SUBMIT_KYC_ROUTE } from '@/constants/api';

function KYCSubmissionContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  const [formData, setFormData] = useState({
    identity_verified_name: '',
    identity_card_last4: '',
    tax_code: '',
    address: {
      city: '',
      district: '',
    },
    bank_account: {
      bank_name: '',
      account_number_last4: '',
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
    
    // Validate required fields
    if (!formData.identity_verified_name || !formData.identity_card_last4) {
      Swal.fire({
        icon: 'error',
        title: 'Thiếu thông tin',
        text: 'Vui lòng điền đầy đủ thông tin bắt buộc',
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await apiClient.post(SUBMIT_KYC_ROUTE, formData);

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

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
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
                    Số CCCD (4 số cuối) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="identity_card_last4"
                    value={formData.identity_card_last4}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="1234"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                  />
                  <p className="text-gray-400 text-sm mt-1">Chỉ nhập 4 số cuối để bảo mật</p>
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
                  <label className="block text-gray-300 mb-2">Số tài khoản (4 số cuối)</label>
                  <input
                    type="text"
                    name="bank_account.account_number_last4"
                    value={formData.bank_account.account_number_last4}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="5678"
                    maxLength={4}
                    pattern="[0-9]{4}"
                  />
                  <p className="text-gray-400 text-sm mt-1">Chỉ nhập 4 số cuối để bảo mật</p>
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
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">URL ảnh CCCD mặt trước</label>
                    <input
                      type="url"
                      name="kyc_documents.identity_front_url"
                      value={formData.kyc_documents.identity_front_url}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="https://example.com/cccd-front.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">URL ảnh CCCD mặt sau</label>
                    <input
                      type="url"
                      name="kyc_documents.identity_back_url"
                      value={formData.kyc_documents.identity_back_url}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="https://example.com/cccd-back.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">URL ảnh selfie với CCCD</label>
                    <input
                      type="url"
                      name="kyc_documents.selfie_url"
                      value={formData.kyc_documents.selfie_url}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="https://example.com/selfie.jpg"
                    />
                  </div>

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

                  <div>
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

                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ <strong>Lưu ý:</strong> Hiện tại bạn cần upload ảnh lên dịch vụ lưu trữ (như Imgur, Cloudinary) 
                    và dán link vào. Chức năng upload trực tiếp sẽ được bổ sung sau.
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
                  onClick={nextStep}
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

