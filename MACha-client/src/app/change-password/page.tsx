'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { CHANGE_PASSWORD_ROUTE, SEND_OTP_ROUTE, VERIFY_OTP_ROUTE } from '@/constants/api';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

function ChangePasswordContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [passwordData, setPasswordData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (!user?.email) {
      Swal.fire('Lỗi', 'Không tìm thấy email', 'error');
      return;
    }

    try {
      setOtpLoading(true);
      await apiClient.post(SEND_OTP_ROUTE, {});

      Swal.fire({
        icon: 'success',
        title: 'OTP đã được gửi!',
        text: `Mã OTP đã được gửi đến email ${user.email}`,
        timer: 3000,
        showConfirmButton: false,
      });

      setOtpSent(true);
      setOtpVerified(false);
      setOtpTimer(600)
      setStep(2);
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
      if (status && status >= 400 && status < 500) {
        // Business/4xx lỗi: chỉ alert, không log console
        Swal.fire({ icon: 'error', title: 'Gửi OTP thất bại', text: message });
      } else {
        console.error('Error sending OTP:', error);
        Swal.fire({ icon: 'error', title: 'Gửi OTP thất bại', text: message });
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    // Nếu đã verify thành công rồi (ví dụ quay lại bước 2) thì bỏ qua gọi API
    if (otpVerified) {
      setStep(3);
      return;
    }

    if (!otpSent) {
      Swal.fire('Lỗi', 'Vui lòng gửi mã OTP trước', 'error');
      return;
    }

    if (!passwordData.otp || passwordData.otp.length !== 6) {
      Swal.fire('Lỗi', 'Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(VERIFY_OTP_ROUTE, { otp: passwordData.otp });

      Swal.fire({
        icon: 'success',
        title: 'Xác thực OTP thành công!',
        text: 'Bạn có thể đặt mật khẩu mới.',
        timer: 2000,
        showConfirmButton: false,
      });

      setOtpVerified(true);
      setStep(3);
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
      if (status && status >= 400 && status < 500) {
        Swal.fire({ icon: 'error', title: 'Xác thực OTP thất bại', text: message });
      } else {
        console.error('Error verifying OTP:', error);
        Swal.fire({ icon: 'error', title: 'Xác thực OTP thất bại', text: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nếu chưa tới bước 3, bỏ qua submit (tránh Enter ở bước OTP gây lỗi)
    if (step < 3) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire('Lỗi', 'Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Swal.fire('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(CHANGE_PASSWORD_ROUTE, {
        newPassword: passwordData.newPassword,
      });

      Swal.fire({
        icon: 'success',
        title: 'Đổi mật khẩu thành công!',
        text: 'Mật khẩu của bạn đã được thay đổi',
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        router.push('/login');
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn';
      if (status && status >= 400 && status < 500) {
        Swal.fire({ icon: 'error', title: 'Đổi mật khẩu thất bại', text: message });
      } else {
        console.error('Error changing password:', error);
        Swal.fire({ icon: 'error', title: 'Đổi mật khẩu thất bại', text: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Đổi mật khẩu</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            Xác thực bằng mã OTP gửi về email và đặt mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {/* Step indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2">
              {/* Step 1 */}
              <div className="flex-1 flex items-center">
                <div className={`flex flex-col items-center flex-1 ${step === 1 ? 'text-emerald-600' : step > 1 ? 'text-emerald-500' : 'text-gray-400'}`}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${step >= 1 ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-300'}`}
                  >
                    1
                  </div>
                  <span className="mt-1 text-xs font-medium">Email</span>
                </div>
              </div>

              {/* Line between 1 and 2 */}
              <div className={`h-0.5 w-10 md:w-16 ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />

              {/* Step 2 */}
              <div className="flex-1 flex items-center justify-center">
                <div className={`flex flex-col items-center flex-1 ${step === 2 ? 'text-emerald-600' : step > 2 ? 'text-emerald-500' : 'text-gray-400'}`}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${step >= 2 ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-300'}`}
                  >
                    2
                  </div>
                  <span className="mt-1 text-xs font-medium">Nhập OTP</span>
                </div>
              </div>

              {/* Line between 2 and 3 */}
              <div className={`h-0.5 w-10 md:w-16 ${step === 3 ? 'bg-emerald-500' : 'bg-gray-200'}`} />

              {/* Step 3 */}
              <div className="flex-1 flex items-center justify-end">
                <div className={`flex flex-col items-center flex-1 ${step === 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${step === 3 ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-300'}`}
                  >
                    3
                  </div>
                  <span className="mt-1 text-xs font-medium text-center">Mật khẩu mới</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {/* STEP 1 UI */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Bước 1: Xác nhận email</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Chúng tôi sẽ gửi mã OTP đến địa chỉ email đã đăng ký để xác nhận danh tính của bạn.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm md:text-base cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || otpTimer > 0}
                      className="px-5 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {otpLoading
                        ? 'Đang gửi...'
                        : otpTimer > 0
                          ? `Gửi lại (${formatTime(otpTimer)})`
                          : 'Gửi mã OTP'}
                    </button>
                  </div>
                  {otpSent && (
                    <p className="mt-2 text-sm text-emerald-600">
                      ✓ Mã OTP đã được gửi đến email của bạn
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2 UI */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Bước 2: Nhập mã OTP</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Nhập mã gồm 6 chữ số đã được gửi đến email{' '}
                    <span className="font-medium text-gray-700">{user?.email}</span>. Nhấn
                    &nbsp;<span className="font-semibold">Tiếp tục</span> để xác thực OTP.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      id="otp"
                      type="text"
                      value={passwordData.otp}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, otp: e.target.value });
                        setOtpVerified(false); // nếu người dùng thay đổi OTP sau khi đã verify, cần verify lại
                      }}
                      maxLength={6}
                      className="flex-1 px-4 py-3 rounded-xl border border-emerald-400/60 bg-white text-center text-2xl tracking-[0.4em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="000000"
                      disabled={otpVerified}
                    />
                    {otpVerified && (
                      <span className="text-sm text-emerald-600 font-medium mt-2 sm:mt-0">
                        ✓ OTP đã xác thực
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 UI */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Bước 3: Đặt mật khẩu mới</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Mật khẩu nên có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số để tăng độ bảo mật.
                  </p>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-emerald-400/60 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm md:text-base"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-emerald-400/60 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm md:text-base"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>
            )}

            {/* Submit / Next Button */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (step === 1) {
                    if (!otpSent) {
                      router.back();
                    } else {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Xác nhận',
                        text: 'Bạn có chắc muốn quay lại? Tiến trình đổi mật khẩu sẽ bị hủy.',
                        showCancelButton: true,
                        confirmButtonColor: '#ff7a1a',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Có, quay lại',
                        cancelButtonText: 'Hủy',
                      }).then((result) => {
                        if (result.isConfirmed) {
                          router.back();
                        }
                      });
                    }
                  } else {
                    // Ở các bước khác: quay lại bước trước
                    setStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : prev));
                  }
                }}
                className="px-5 py-2.5 rounded-full border border-gray-300 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Quay lại
              </button>

              {step === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (otpSent) {
                      setStep(2);
                    }
                  }}
                  disabled={!otpSent || loading}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#ff7a1a] hover:bg-[#ff6500] text-white text-sm md:text-base font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  Tiếp tục
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || (!otpVerified && passwordData.otp.length !== 6)}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#ff7a1a] hover:bg-[#ff6500] text-white text-sm md:text-base font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Đang kiểm tra...' : otpVerified ? 'Tiếp tục' : 'Tiếp tục'}
                </button>
              )}

              {step === 3 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#ff7a1a] hover:bg-[#ff6500] text-white text-sm md:text-base font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Đang xử lý...' : 'Lưu mật khẩu mới'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute>
      <ChangePasswordContent />
    </ProtectedRoute>
  );
}


