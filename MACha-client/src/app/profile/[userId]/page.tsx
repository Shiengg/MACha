'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import { getUserById, followUser, unfollowUser } from '@/services/user.service';
import { campaignService, type Campaign } from '@/services/campaign.service';
import { campaignCompanionService, type CompanionCampaign } from '@/services/campaignCompanion.service';
import CampaignCard from '@/components/campaign/CampaignCard';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { createConversationPrivate } from '@/services/conversation.service';
import ReportModal from '@/components/shared/ReportModal';
import { MoreHorizontal, Flag, Users } from 'lucide-react';
import Swal from 'sweetalert2';

import type { User } from '@/services/user.service';

function ProfileContent() {
  const params = useParams();
  const router = useRouter();
  const {
    user: currentUser,
    loading: authLoading,
    setUser: setCurrentUser,
  } = useAuth();
  const { socket, isConnected } = useSocket();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companionCampaigns, setCompanionCampaigns] = useState<CompanionCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'campaigns' | 'achievements' | 'about' | 'companions'>('campaigns');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [companionCampaignsLoading, setCompanionCampaignsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Pagination state for campaigns
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsLimit] = useState(10);
  const [campaignsTotal, setCampaignsTotal] = useState(0);
  const [campaignsTotalPages, setCampaignsTotalPages] = useState(1);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // So sánh ID: API trả về _id, nhưng AuthContext có thể có id hoặc _id
  // So sánh cả userId từ URL params và user._id từ API response
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwnProfile = !!(currentUserId && (currentUserId === userId || (user && currentUserId === user._id)));

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

        const userData = await getUserById(userId);
        setUser(userData);

        // Fetch campaigns with pagination
        const campaignsResult = await campaignService.getCampaignsByCreatorPaginated(userId, 1, campaignsLimit);
        setCampaigns(campaignsResult.campaigns);
        setCampaignsTotal(campaignsResult.total);
        setCampaignsTotalPages(campaignsResult.totalPages);
        setCampaignsPage(1);

        // Fetch companion campaigns for any user profile
        try {
          setCompanionCampaignsLoading(true);
          const companionData = await campaignCompanionService.getUserCompanionCampaigns(userId);
          setCompanionCampaigns(companionData.campaigns);
        } catch (err) {
          console.error("Error loading companion campaigns:", err);
        } finally {
          setCompanionCampaignsLoading(false);
        }
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
      setActiveTab('campaigns'); // Reset về tab mặc định
      setCampaignsPage(1);
      setCampaignsTotal(0);
      setCampaignsTotalPages(1);
    };
  }, [userId, currentUser?.id, authLoading]); // ✅ Listen vào currentUser.id thay vì currentUser object

  // Fetch campaigns when page changes
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!userId || authLoading || activeTab !== 'campaigns') return;

      try {
        setCampaignsLoading(true);
        const result = await campaignService.getCampaignsByCreatorPaginated(
          userId,
          campaignsPage,
          campaignsLimit
        );
        setCampaigns(result.campaigns);
        setCampaignsTotal(result.total);
        setCampaignsTotalPages(result.totalPages);
        
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('Error loading campaigns:', err);
        setError('Không thể tải danh sách chiến dịch. Vui lòng thử lại sau.');
      } finally {
        setCampaignsLoading(false);
      }
    };

    fetchCampaigns();
  }, [userId, campaignsPage, campaignsLimit, authLoading, activeTab]);

  const isFollowing =
    !!currentUser &&
    Array.isArray((currentUser as any).following) &&
    (currentUser as any).following.includes(userId);

  const isFollowedBy =
    !!currentUserId &&
    !!user &&
    Array.isArray(user.followers) &&
    user.followers.length > 0 &&
    user.followers.some((followerId) => {
      // So sánh cả string và ObjectId
      const followerIdStr = String(followerId);
      const currentIdStr = String(currentUserId);
      return followerIdStr === currentIdStr;
    });

  // Có thể nhắn tin nếu một trong hai người follow người kia
  const canMessage = isFollowing || isFollowedBy;

  // Realtime cập nhật followers_count qua Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserFollowed = (event: any) => {
      if (event.targetUserId !== userId) return;

      const currentId = currentUserId;

      if (event.followerId === currentId) {
        return;
      }

      setUser((prev) =>
        prev
          ? {
            ...prev,
            followers_count: (prev.followers_count || 0) + 1,
          }
          : prev
      );

      if (isOwnProfile && currentId && event.targetUserId === currentId && currentUser) {
        setCurrentUser({
          ...(currentUser as any),
          followers_count: ((currentUser as any).followers_count || 0) + 1,
        });
      }
    };

    const handleUserUnfollowed = (event: any) => {
      if (event.targetUserId !== userId) return;

      const currentId = currentUserId;

      if (event.followerId === currentId) {
        return;
      }

      setUser((prev) =>
        prev
          ? {
            ...prev,
            followers_count: Math.max((prev.followers_count || 1) - 1, 0),
          }
          : prev
      );

      if (isOwnProfile && currentId && event.targetUserId === currentId && currentUser) {
        setCurrentUser({
          ...(currentUser as any),
          followers_count: Math.max(
            ((currentUser as any).followers_count || 1) - 1,
            0
          ),
        });
      }
    };

    socket.on('user:followed', handleUserFollowed);
    socket.on('user:unfollowed', handleUserUnfollowed);

    return () => {
      socket.off('user:followed', handleUserFollowed);
      socket.off('user:unfollowed', handleUserUnfollowed);
    };
  }, [socket, isConnected, userId, currentUserId, isOwnProfile, setCurrentUser, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const handleFollow = async () => {
    if (!currentUser) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/profile/${userId}`)}`);
      return;
    }

    try {
      if (isFollowing) {
        await unfollowUser(userId);

        const currentFollowing = Array.isArray((currentUser as any).following)
          ? [...(currentUser as any).following]
          : [];
        const updatedFollowing = currentFollowing.filter((id: string) => id !== userId);

        setCurrentUser({
          ...currentUser,
          following: updatedFollowing,
          following_count: Math.max(
            ((currentUser as any).following_count || 1) - 1,
            0
          ),
        });

        setUser((prev) =>
          prev
            ? {
              ...prev,
              followers_count: Math.max((prev.followers_count || 1) - 1, 0),
            }
            : prev
        );
      } else {
        await followUser(userId);

        const currentFollowing = Array.isArray((currentUser as any).following)
          ? [...(currentUser as any).following]
          : [];
        const updatedFollowing = currentFollowing.includes(userId)
          ? currentFollowing
          : [...currentFollowing, userId];

        setCurrentUser({
          ...currentUser,
          following: updatedFollowing,
          following_count: ((currentUser as any).following_count || 0) + 1,
        });

        setUser((prev) =>
          prev
            ? {
              ...prev,
              followers_count: (prev.followers_count || 0) + 1,
            }
            : prev
        );
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Không thể thực hiện thao tác. Vui lòng thử lại sau.';

      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: message,
      });
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !userId) return;

    try {
      // Tạo hoặc lấy conversation với user này
      const conversation = await createConversationPrivate(userId);
      
      // Navigate đến trang messages với conversation đã chọn
      router.push(`/messages?conversation=${conversation._id}`);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tạo cuộc trò chuyện. Vui lòng thử lại sau.',
      });
    }
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
    <div className="min-h-screen bg-[#f5f7fb] pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 relative">
          <div className="px-6 pt-6 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-md overflow-hidden bg-gradient-to-br from-emerald-400 to-lime-400">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl md:text-5xl font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {user.kyc_status === 'verified' && (
                  <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* User Info + Actions */}
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                        {user.fullname || user.username}
                      </h1>
                      {getKYCBadge()}
                      {getRoleBadge()}
                    </div>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-gray-600 mt-2 max-w-sm text-sm md:text-base break-words">
                        {user.bio}
                      </p>
                    )}
                    {user.address && (user.address.city || user.address.district) && (
                      <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>
                          {[user.address.district, user.address.city].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {isOwnProfile ? (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {user.kyc_status === 'unverified' && (
                        <button
                          onClick={() => {
                            if (user.role === 'organization') {
                              router.push('/kyc');
                            } else {
                              router.push('/kyc-vnpt');
                            }
                          }}
                          className="inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-full border border-emerald-500 text-emerald-600 text-sm font-medium bg-white hover:bg-emerald-50 shadow-sm transition-colors w-full sm:w-auto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m-7 9h8a2 2 0 002-2V7a2 2 0 00-2-2H9L7 7H5a2 2 0 00-2 2v8a2 2 0 002 2h2z" />
                          </svg>
                          Xác thực KYC
                        </button>
                      )}
                      <button
                        onClick={() => router.push('/settings')}
                        className="inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-sm transition-colors w-full sm:w-auto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Chỉnh sửa hồ sơ
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleFollow}
                        className={`inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium shadow-sm transition-colors w-full sm:w-auto ${isFollowing
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
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
                      {canMessage && (
                        <button
                          onClick={handleMessage}
                          className="inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Nhắn tin
                        </button>
                      )}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => setShowDropdown(!showDropdown)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors border border-gray-300 bg-white"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        {showDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <button
                              onClick={() => {
                                setShowReportModal(true);
                                setShowDropdown(false);
                              }}
                              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-red-600"
                            >
                              <Flag className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {user?.role === 'admin' ? 'Báo cáo admin' : 'Báo cáo người dùng'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 md:gap-10 mt-4 pt-4 border-t border-gray-100 px-6 pb-4">
              <div className="flex flex-col">
                <span className="text-base font-semibold text-gray-900">{campaignsTotal}</span>
                <span className="text-xs text-gray-500 mt-0.5">Chiến dịch</span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-base font-semibold text-gray-900">{user.followers_count || 0}</span>
                <span className="text-xs text-gray-500 mt-0.5">Người theo dõi</span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-base font-semibold text-gray-900">{user.following_count || 0}</span>
                <span className="text-xs text-gray-500 mt-0.5">Đang theo dõi</span>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-base font-semibold text-gray-900">0</span>
                <span className="text-xs text-gray-500 mt-0.5">Đóng góp</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-100">
              <div className="flex items-center gap-2 px-4 md:px-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`relative px-4 md:px-6 py-3 text-sm md:text-base font-medium transition-colors ${activeTab === 'campaigns'
                    ? 'text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Chiến dịch
                  {activeTab === 'campaigns' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`relative px-4 md:px-6 py-3 text-sm md:text-base font-medium transition-colors ${activeTab === 'activity'
                    ? 'text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Hoạt động
                  {activeTab === 'activity' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`relative px-4 md:px-6 py-3 text-sm md:text-base font-medium transition-colors ${activeTab === 'achievements'
                    ? 'text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Thành tựu
                  {activeTab === 'achievements' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`relative px-4 md:px-6 py-3 text-sm md:text-base font-medium transition-colors ${activeTab === 'about'
                    ? 'text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Giới thiệu
                  {activeTab === 'about' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('companions')}
                  className={`relative px-4 md:px-6 py-3 text-sm md:text-base font-medium transition-colors ${activeTab === 'companions'
                    ? 'text-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Chiến dịch đồng hành
                  {activeTab === 'companions' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {campaignsLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-500 mt-4 text-sm">Đang tải chiến dịch...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {isOwnProfile ? 'Bạn chưa tạo chiến dịch nào' : 'Chưa có chiến dịch'}
                  </h3>
                  <p className="text-gray-500 mb-6 text-sm">
                    {isOwnProfile
                      ? 'Hãy bắt đầu tạo chiến dịch đầu tiên để kêu gọi sự hỗ trợ từ cộng đồng'
                      : 'Người dùng này chưa tạo chiến dịch nào'}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/create-campaign')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium shadow-sm transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Tạo chiến dịch mới
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {campaigns.map((campaign) => (
                      <CampaignCard 
                        key={campaign._id} 
                        campaign={campaign} 
                        showCreator={false}
                        showStatusBadge={true}
                      />
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {campaignsTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Hiển thị {(campaignsPage - 1) * campaignsLimit + 1} - {Math.min(campaignsPage * campaignsLimit, campaignsTotal)} / {campaignsTotal} chiến dịch
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCampaignsPage(prev => Math.max(1, prev - 1))}
                          disabled={campaignsPage === 1 || campaignsLoading}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            campaignsPage === 1 || campaignsLoading
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          Trước
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {/* Generate page numbers with ellipsis */}
                          {(() => {
                            const pages: (number | string)[] = [];
                            const maxVisible = 5;
                            
                            if (campaignsTotalPages <= maxVisible) {
                              // Show all pages if total <= maxVisible
                              for (let i = 1; i <= campaignsTotalPages; i++) {
                                pages.push(i);
                              }
                            } else {
                              // Always show first page
                              pages.push(1);
                              
                              if (campaignsPage > 3) {
                                pages.push('...');
                              }
                              
                              // Calculate start and end of visible range
                              let start = Math.max(2, campaignsPage - 1);
                              let end = Math.min(campaignsTotalPages - 1, campaignsPage + 1);
                              
                              // Adjust if near start
                              if (campaignsPage <= 3) {
                                start = 2;
                                end = Math.min(4, campaignsTotalPages - 1);
                              }
                              
                              // Adjust if near end
                              if (campaignsPage >= campaignsTotalPages - 2) {
                                start = Math.max(2, campaignsTotalPages - 3);
                                end = campaignsTotalPages - 1;
                              }
                              
                              for (let i = start; i <= end; i++) {
                                pages.push(i);
                              }
                              
                              if (campaignsPage < campaignsTotalPages - 2) {
                                pages.push('...');
                              }
                              
                              // Always show last page
                              if (campaignsTotalPages > 1) {
                                pages.push(campaignsTotalPages);
                              }
                            }
                            
                            return pages.map((pageNum, index) => {
                              if (pageNum === '...') {
                                return (
                                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400 text-sm">
                                    ...
                                  </span>
                                );
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCampaignsPage(pageNum as number)}
                                  disabled={campaignsLoading}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    campaignsPage === pageNum
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                  } ${campaignsLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                  {pageNum}
                                </button>
                              );
                            });
                          })()}
                        </div>
                        
                        <button
                          onClick={() => setCampaignsPage(prev => Math.min(campaignsTotalPages, prev + 1))}
                          disabled={campaignsPage === campaignsTotalPages || campaignsLoading}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            campaignsPage === campaignsTotalPages || campaignsLoading
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Chưa có hoạt động</h3>
              <p className="text-gray-500 text-sm">Các hoạt động gần đây sẽ hiển thị ở đây</p>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Chưa có thành tựu</h3>
              <p className="text-gray-500 text-sm">Các huy hiệu và thành tựu sẽ hiển thị ở đây</p>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Giới thiệu</h2>

              <div className="space-y-4">
                {user.bio && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Giới thiệu</div>
                      <div className="text-gray-800 text-sm">{user.bio}</div>
                    </div>
                  </div>
                )}

                {user.email && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Email</div>
                      <div className="text-gray-800 text-sm">{user.email}</div>
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
                      <div className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Địa chỉ</div>
                      <div className="text-gray-800 text-sm">
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
                    <div className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Tham gia</div>
                    <div className="text-gray-800 text-sm">
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
                      <div className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Trạng thái xác minh</div>
                      <div className="text-emerald-600 font-medium text-sm">Đã xác minh danh tính</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'companions' && (
            <div className="space-y-4">
              {companionCampaignsLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-gray-500 text-sm">Đang tải...</p>
                </div>
              ) : companionCampaigns.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Chưa có chiến dịch đồng hành</h3>
                  <p className="text-gray-500 text-sm">
                    {isOwnProfile ? 'Bạn chưa đồng hành với chiến dịch nào' : 'Người dùng này chưa đồng hành với chiến dịch nào'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companionCampaigns.map((companionCampaign) => (
                    <div
                      key={companionCampaign._id}
                      onClick={() => router.push(`/campaigns/${companionCampaign._id}?companion=true`)}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      {companionCampaign.banner_image && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={companionCampaign.banner_image}
                            alt={companionCampaign.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {companionCampaign.title}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Đã quyên góp</span>
                            <span className="font-medium text-gray-900">
                              {new Intl.NumberFormat('vi-VN').format(companionCampaign.current_amount)} VND
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min((companionCampaign.current_amount / companionCampaign.goal_amount) * 100, 100)}%`
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Mục tiêu: {new Intl.NumberFormat('vi-VN').format(companionCampaign.goal_amount)} VND</span>
                            <span>{Math.round((companionCampaign.current_amount / companionCampaign.goal_amount) * 100)}%</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Đồng hành từ: {new Date(companionCampaign.joined_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {user && (
        <ReportModal
          reportedType={user.role === 'admin' ? 'admin' : 'user'}
          reportedId={user._id}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            console.log('Report submitted successfully');
          }}
        />
      )}
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
