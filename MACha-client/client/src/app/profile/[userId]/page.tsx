'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import { getUserById } from '@/services/user.service';
import { useAuth } from '@/contexts/AuthContext';
import Swal from 'sweetalert2';

interface User {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  kyc_status?: string;
  followers_count?: number;
  following_count?: number;
  createdAt: string;
  updatedAt: string;
  address?: {
    city?: string;
    district?: string;
  };
}

interface Campaign {
  _id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  status: string;
  category: string;
  media_url?: string[];
  createdAt: string;
  end_date: string;
}

function ProfileContent() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const userId = params.userId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'campaigns' | 'achievements' | 'about'>('campaigns');
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const fetchUserData = async () => {
      // ✅ Chờ AuthContext load xong trước khi fetch profile
      if (authLoading) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Reset state trước khi fetch data mới
        setUser(null);
        setCampaigns([]);
        setIsFollowing(false);
        
        const userData = await getUserById(userId);
        setUser(userData);
        
        // TODO: Fetch user's campaigns
        // const userCampaigns = await getCampaignsByUser(userId);
        // setCampaigns(userCampaigns);
      } catch (err) {
        console.error("Error loading user:", err);
        setError("Không thể tải thông tin người dùng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
    
    // Cleanup function - reset state khi component unmount hoặc userId thay đổi
    return () => {
      setUser(null);
      setCampaigns([]);
      setError(null);
      setIsFollowing(false);
      setActiveTab('campaigns'); // Reset về tab mặc định
    };
  }, [userId, currentUser?.id, authLoading]); // ✅ Listen vào currentUser.id thay vì currentUser object

  const handleFollow = async () => {
    // TODO: Implement follow/unfollow API
    Swal.fire({
      icon: 'info',
      title: 'Tính năng đang phát triển',
      text: 'Chức năng theo dõi sẽ sớm được cập nhật!',
    });
  };

  const handleEditProfile = () => {
    router.push('/settings/profile');
  };

  const handleMessage = () => {
    Swal.fire({
      icon: 'info',
      title: 'Tính năng đang phát triển',
      text: 'Chức năng nhắn tin sẽ sớm được cập nhật!',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-lg text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="bg-[#1a1f2e] rounded-lg border border-red-800 p-8 text-center max-w-md">
          <div className="text-red-400 text-lg font-medium mb-2">
            ⚠️ Có lỗi xảy ra
          </div>
          <p className="text-gray-400">{error || "Không tìm thấy người dùng"}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const getKYCBadge = () => {
    if (user.kyc_status === 'verified') {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Đã xác minh
        </div>
      );
    }
    return null;
  };

  const getRoleBadge = () => {
    if (user.role === 'org') {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
          Tổ chức
        </div>
      );
    }
    return null;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'education': '📚',
      'health': '🏥',
      'environment': '🌱',
      'disaster': '🆘',
      'community': '🤝',
      'animal': '🐾',
    };
    return icons[category] || '❤️';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium">Đang hoạt động</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs font-medium">Chờ duyệt</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs font-medium">Hoàn thành</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-900/30 text-gray-400 rounded text-xs font-medium">Đã hủy</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] pb-12">
      {/* Cover Photo */}
      <div className="relative h-80 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/20" />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
      </div>

      {/* Profile Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-32">
          <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 shadow-xl">
            <div className="px-6 pt-6 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-40 h-40 rounded-2xl border-4 border-[#1a1f2e] shadow-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {user.kyc_status === 'verified' && (
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center border-4 border-[#1a1f2e]">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold text-white">
                          {user.fullname || user.username}
                        </h1>
                        {getKYCBadge()}
                        {getRoleBadge()}
                      </div>
                      <p className="text-gray-400 mt-1">@{user.username}</p>
                      {user.bio && (
                        <p className="text-gray-300 mt-3 max-w-2xl">{user.bio}</p>
                      )}
                      {user.address && (user.address.city || user.address.district) && (
                        <div className="flex items-center gap-2 mt-2 text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm">
                            {[user.address.district, user.address.city].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {isOwnProfile ? (
                        <button
                          onClick={handleEditProfile}
                          className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Chỉnh sửa trang cá nhân
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleFollow}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                              isFollowing
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Đang theo dõi
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Theo dõi
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleMessage}
                            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Nhắn tin
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 mt-6 pt-6 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{campaigns.length}</div>
                  <div className="text-sm text-gray-400 mt-1">Chiến dịch</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{user.followers_count || 0}</div>
                  <div className="text-sm text-gray-400 mt-1">Người theo dõi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{user.following_count || 0}</div>
                  <div className="text-sm text-gray-400 mt-1">Đang theo dõi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">0</div>
                  <div className="text-sm text-gray-400 mt-1">Đóng góp</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-700">
              <div className="flex items-center gap-1 px-6">
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`px-6 py-4 font-medium transition-all relative ${
                    activeTab === 'campaigns'
                      ? 'text-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Chiến dịch
                  {activeTab === 'campaigns' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-6 py-4 font-medium transition-all relative ${
                    activeTab === 'activity'
                      ? 'text-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Hoạt động
                  {activeTab === 'activity' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`px-6 py-4 font-medium transition-all relative ${
                    activeTab === 'achievements'
                      ? 'text-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Thành tựu
                  {activeTab === 'achievements' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`px-6 py-4 font-medium transition-all relative ${
                    activeTab === 'about'
                      ? 'text-blue-500'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Giới thiệu
                  {activeTab === 'about' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'campaigns' && (
            <div>
              {campaigns.length === 0 ? (
                <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isOwnProfile ? 'Bạn chưa tạo chiến dịch nào' : 'Chưa có chiến dịch'}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile
                      ? 'Hãy bắt đầu tạo chiến dịch đầu tiên để kêu gọi sự hỗ trợ từ cộng đồng'
                      : 'Người dùng này chưa tạo chiến dịch nào'}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/create-campaign')}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Tạo chiến dịch mới
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign._id}
                      className="bg-[#1a1f2e] rounded-xl border border-gray-700 overflow-hidden hover:border-blue-600 transition-all cursor-pointer group"
                      onClick={() => router.push(`/campaigns/${campaign._id}`)}
                    >
                      {/* Campaign Image */}
                      <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden">
                        {campaign.media_url && campaign.media_url[0] ? (
                          <img
                            src={campaign.media_url[0]}
                            alt={campaign.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            {getCategoryIcon(campaign.category)}
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          {getStatusBadge(campaign.status)}
                        </div>
                      </div>

                      {/* Campaign Info */}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {campaign.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {campaign.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Đã quyên góp</span>
                            <span className="text-white font-medium">
                              {((campaign.current_amount / campaign.goal_amount) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <div className="text-white font-semibold">
                              {campaign.current_amount.toLocaleString('vi-VN')} VND
                            </div>
                            <div className="text-gray-400">
                              / {campaign.goal_amount.toLocaleString('vi-VN')} VND
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400">Thời hạn</div>
                            <div className="text-white font-medium">
                              {new Date(campaign.end_date).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-12 text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Chưa có hoạt động</h3>
              <p className="text-gray-400">Các hoạt động gần đây sẽ hiển thị ở đây</p>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-12 text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Chưa có thành tựu</h3>
              <p className="text-gray-400">Các huy hiệu và thành tựu sẽ hiển thị ở đây</p>
          </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Giới thiệu</h2>
              
              <div className="space-y-4">
                {user.bio && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Giới thiệu</div>
                      <div className="text-white">{user.bio}</div>
                    </div>
                  </div>
                )}

                {user.email && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Email</div>
                      <div className="text-white">{user.email}</div>
                    </div>
                  </div>
                )}

                {user.address && (user.address.city || user.address.district) && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Địa chỉ</div>
                      <div className="text-white">
                        {[user.address.district, user.address.city].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Tham gia</div>
                    <div className="text-white">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {user.kyc_status === 'verified' && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Trạng thái xác minh</div>
                      <div className="text-blue-400 font-medium">Đã xác minh danh tính</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
