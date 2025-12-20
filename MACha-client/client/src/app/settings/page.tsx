'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { cloudinaryService } from '@/services/cloudinary.service';
import apiClient from '@/lib/api-client';
import { UPDATE_USER_ROUTE, SEND_OTP_ROUTE, CHANGE_PASSWORD_ROUTE } from '@/constants/api';
import Swal from 'sweetalert2';

type TabType = 'profile' | 'security' | 'notifications';

function SettingsContent() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    fullname: '',
    email: '',
    bio: '',
    avatar: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Password form state
  const [passwordData, setPasswordData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullname: user.fullname || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Lỗi', 'Chỉ chấp nhận file ảnh', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Lỗi', 'File quá lớn (tối đa 5MB)', 'error');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    if (avatarFile && avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      Swal.fire('Lỗi', 'Không tìm thấy thông tin người dùng', 'error');
      return;
    }

    try {
      setLoading(true);
      
      let avatarUrl = profileData.avatar;
      
      // Upload avatar nếu có file mới
      if (avatarFile) {
        const uploadResult = await cloudinaryService.uploadImage(avatarFile, 'avatars');
        avatarUrl = uploadResult.secure_url;
      }

      // Update user
      const updatePayload: any = {};
      if (profileData.fullname) updatePayload.fullname = profileData.fullname;
      if (profileData.email) updatePayload.email = profileData.email;
      if (profileData.bio !== undefined) updatePayload.bio = profileData.bio;
      if (avatarUrl) updatePayload.avatar = avatarUrl;

      const response = await apiClient.patch(UPDATE_USER_ROUTE(user.id), updatePayload);
      
      // Refresh user data
      await login();
      
      Swal.fire({
        icon: 'success',
        title: 'Cập nhật thành công!',
        text: 'Thông tin của bạn đã được cập nhật',
        timer: 2000,
        showConfirmButton: false,
      });

      // Cleanup preview URL
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview('');
        setAvatarFile(null);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Cập nhật thất bại',
        text: error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!user?.email) {
      Swal.fire('Lỗi', 'Không tìm thấy email', 'error');
      return;
    }

    try {
      setOtpLoading(true);
      const response = await apiClient.post(SEND_OTP_ROUTE, {});
      
      Swal.fire({
        icon: 'success',
        title: 'OTP đã được gửi!',
        text: `Mã OTP đã được gửi đến email ${user.email}`,
        timer: 3000,
        showConfirmButton: false,
      });

      setOtpSent(true);
      setOtpTimer(600); // 10 minutes countdown
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gửi OTP thất bại',
        text: error?.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire('Lỗi', 'Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Swal.fire('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }

    if (!passwordData.otp) {
      Swal.fire('Lỗi', 'Vui lòng nhập mã OTP', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(CHANGE_PASSWORD_ROUTE, {
        otp: passwordData.otp,
        newPassword: passwordData.newPassword,
      });

      Swal.fire({
        icon: 'success',
        title: 'Đổi mật khẩu thành công!',
        text: 'Mật khẩu của bạn đã được thay đổi',
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        // Reset form
        setPasswordData({
          otp: '',
          newPassword: '',
          confirmPassword: '',
        });
        setOtpSent(false);
        setOtpTimer(0);
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      Swal.fire({
        icon: 'error',
        title: 'Đổi mật khẩu thất bại',
        text: error?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Hồ sơ', icon: '👤' },
    { id: 'security' as TabType, label: 'Bảo mật', icon: '🔒' },
    { id: 'notifications' as TabType, label: 'Thông báo', icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Cài đặt</h1>
          <p className="text-gray-400">Quản lý thông tin tài khoản và cài đặt của bạn</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Thông tin hồ sơ</h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Ảnh đại diện
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-gray-600">
                          {avatarPreview || profileData.avatar ? (
                            <img
                              src={avatarPreview || profileData.avatar}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                              {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        {(avatarPreview || profileData.avatar) && (
                          <button
                            type="button"
                            onClick={removeAvatar}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          <span>Chọn ảnh</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                        </label>
                        <p className="mt-2 text-xs text-gray-400">JPG, PNG tối đa 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Fullname */}
                  <div>
                    <label htmlFor="fullname" className="block text-sm font-medium text-gray-300 mb-2">
                      Họ và tên
                    </label>
                    <input
                      id="fullname"
                      type="text"
                      value={profileData.fullname}
                      onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                      Giới thiệu
                    </label>
                    <textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Giới thiệu về bản thân..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Đổi mật khẩu</h2>
                
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    🔒 Để đảm bảo tính bảo mật, bạn cần xác thực bằng mã OTP được gửi đến email để đổi mật khẩu.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Send OTP Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email xác thực
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="flex-1 px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpLoading || otpTimer > 0}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                      >
                        {otpLoading
                          ? 'Đang gửi...'
                          : otpTimer > 0
                          ? `Gửi lại (${formatTime(otpTimer)})`
                          : 'Gửi mã OTP'}
                      </button>
                    </div>
                    {otpSent && (
                      <p className="mt-2 text-sm text-green-400">
                        ✓ Mã OTP đã được gửi đến email của bạn
                      </p>
                    )}
                  </div>

                  {/* OTP Input */}
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                      Mã OTP
                    </label>
                    <input
                      id="otp"
                      type="text"
                      value={passwordData.otp}
                      onChange={(e) => setPasswordData({ ...passwordData, otp: e.target.value })}
                      maxLength={6}
                      className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                      placeholder="000000"
                      disabled={!otpSent}
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Mật khẩu mới
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading || !otpSent}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Cài đặt thông báo</h2>
                
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔔</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Tính năng đang phát triển
                  </h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Tính năng quản lý thông báo sẽ sớm được cập nhật. Bạn có thể tùy chỉnh các loại thông báo muốn nhận trong phiên bản tương lai.
                  </p>
                </div>

                {/* Placeholder settings */}
                <div className="space-y-4 mt-8">
                  <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium mb-1">Thông báo email</h4>
                        <p className="text-sm text-gray-400">Nhận thông báo qua email</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed">
                        Tắt
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium mb-1">Thông báo đóng góp</h4>
                        <p className="text-sm text-gray-400">Thông báo khi có người đóng góp</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed">
                        Tắt
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium mb-1">Thông báo bình luận</h4>
                        <p className="text-sm text-gray-400">Thông báo khi có bình luận mới</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed">
                        Tắt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

