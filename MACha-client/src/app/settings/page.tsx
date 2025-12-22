'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { cloudinaryService } from '@/services/cloudinary.service';
import apiClient from '@/lib/api-client';
import { UPDATE_USER_ROUTE } from '@/constants/api';
import Swal from 'sweetalert2';

function SettingsContent() {
  const router = useRouter();
  const { user, login } = useAuth();
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

      if (avatarFile) {
        const uploadResult = await cloudinaryService.uploadImage(avatarFile, 'avatars');
        avatarUrl = uploadResult.secure_url;
      }

      const updatePayload: any = {};
      if (profileData.fullname) updatePayload.fullname = profileData.fullname;
      if (profileData.email) updatePayload.email = profileData.email;
      if (profileData.bio !== undefined) updatePayload.bio = profileData.bio;
      if (avatarUrl) updatePayload.avatar = avatarUrl;

      await apiClient.patch(UPDATE_USER_ROUTE(user.id), updatePayload);

      // Refresh user data
      await login();

      Swal.fire({
        icon: 'success',
        title: 'Cập nhật thành công!',
        text: 'Thông tin của bạn đã được cập nhật',
        timer: 2000,
        showConfirmButton: false,
      });

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

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Cập nhật hồ sơ</h1>
            <p className="text-gray-500 text-sm md:text-base mt-1">
              Chỉnh sửa thông tin cá nhân và ảnh đại diện của bạn
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[280px,1fr]">
            {/* Left: Profile photo & actions */}
            <div className="bg-[#f8fafc] px-6 py-8 flex flex-col items-center">
              <div className="relative mb-5">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-white shadow-md overflow-hidden bg-gradient-to-br from-emerald-400 to-lime-400">
                  {avatarPreview || profileData.avatar ? (
                    <img
                      src={avatarPreview || profileData.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl md:text-5xl font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                {(avatarPreview || profileData.avatar) && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors shadow"
                  >
                    ×
                  </button>
                )}
              </div>

              <label className="w-full">
                <span className="sr-only">Chọn ảnh đại diện</span>
                <div className="w-full">
                  <label className="cursor-pointer inline-flex items-center justify-center w-full px-6 py-3 rounded-full bg-[#ff7a1a] hover:bg-[#ff6500] text-white text-sm font-semibold shadow-sm transition-colors">
                    Chọn ảnh đại diện
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </label>
              <p className="mt-3 text-xs text-gray-500 text-center">
                Hỗ trợ file JPG, PNG. Kích thước tối đa 5MB.
              </p>
            </div>

            {/* Right: Form fields */}
            <div className="px-6 md:px-8 py-8">
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Fullname */}
                <div>
                  <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Họ và tên
                  </label>
                  <input
                    id="fullname"
                    type="text"
                    value={profileData.fullname}
                    onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-400/60 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm md:text-base"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-400/60 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm md:text-base"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bio (Giới thiệu)
                  </label>
                  <textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-400/60 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none text-sm md:text-base"
                    placeholder="Giới thiệu ngắn về bản thân (tối đa 150 ký tự)"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Giới thiệu sẽ hiển thị trên trang hồ sơ của bạn.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#ff7a1a] hover:bg-[#ff6500] text-white text-sm md:text-base font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Change password section */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 11c.828 0 1.5.672 1.5 1.5S12.828 14 12 14s-1.5-.672-1.5-1.5S11.172 11 12 11zm0-7a5 5 0 00-5 5v2H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1V9a5 5 0 00-5-5z"
                />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-900">Đổi mật khẩu</p>
              <p className="text-xs text-gray-500">
                Tăng cường bảo mật cho tài khoản của bạn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/change-password')}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#ff7a1a] hover:bg-[#ff6500] text-white text-sm font-semibold shadow-sm transition-colors w-full sm:w-auto"
          >
            Đổi mật khẩu
          </button>
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

