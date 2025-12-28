'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { getUserById, User } from '@/services/admin/user.service';
import { getKYCDetails, KYCDetails } from '@/services/admin/kyc.service';
import { campaignService, Campaign } from '@/services/campaign.service';
import Swal from 'sweetalert2';
import Image from 'next/image';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Building2,
  ExternalLink,
} from 'lucide-react';

export default function AdminUserDetail() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [kycDetails, setKycDetails] = useState<KYCDetails | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'campaigns'>('overview');

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchCampaigns();
    }
  }, [userId]);

  useEffect(() => {
    // Fetch KYC data after user data is loaded
    if (user) {
      fetchKYCData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const data = await getUserById(userId);
      setUser(data);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tải thông tin người dùng',
      });
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const fetchKYCData = async () => {
    // Only fetch KYC if user has KYC status other than unverified or null/undefined
    if (!user || !user.kyc_status || user.kyc_status === 'unverified') {
      setKycDetails(null);
      return;
    }

    try {
      const details = await getKYCDetails(userId);
      setKycDetails(details);
    } catch (error: any) {
      // KYC might not exist, that's okay - just set to null
      setKycDetails(null);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const data = await campaignService.getCampaignsByCreator(userId);
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns([]);
    }
  };

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Đã xác thực</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Từ chối</span>;
      case 'unverified':
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">Chưa xác thực</span>;
      default:
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  const totalRaised = campaigns.reduce((sum, c) => sum + (c.current_amount || 0), 0);
  const totalGoal = campaigns.reduce((sum, c) => sum + (c.goal_amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <AdminSidebar />
        <AdminHeader />
        <div className="ml-64 pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <AdminSidebar />
      <AdminHeader />

      <div className="ml-64 pt-16">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Quay lại</span>
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.username}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{user.username}</h1>
                  <div className="flex items-center gap-4">
                    {getKYCStatusBadge(user.kyc_status)}
                    <span className="text-gray-400 text-sm capitalize">Vai trò: {user.role}</span>
                    <span className="text-gray-400 text-sm">ID: {user._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Tổng số campaign</p>
                  <p className="text-white font-semibold text-xl">{campaigns.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Tổng đã quyên góp</p>
                  <p className="text-white font-semibold text-xl">{formatCurrency(totalRaised)}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Mục tiêu tổng</p>
                  <p className="text-white font-semibold text-xl">{formatCurrency(totalGoal)}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Người theo dõi</p>
                  <p className="text-white font-semibold text-xl">{user.followers_count || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 mb-6">
            <div className="border-b border-gray-700 flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tổng quan
              </button>
              <button
                onClick={() => setActiveTab('kyc')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeTab === 'kyc'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                KYC {user.kyc_status !== 'unverified' && kycDetails && '✓'}
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeTab === 'campaigns'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Campaigns ({campaigns.length})
              </button>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <UserIcon className="w-5 h-5" />
                      Thông tin cơ bản
                    </h3>
                    <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Username</p>
                        <p className="text-white">{user.username}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          Email
                        </p>
                        <p className="text-white">{user.email}</p>
                      </div>
                      {user.fullname && (
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Họ tên</p>
                          <p className="text-white">{user.fullname}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                          <Shield className="w-4 h-4" />
                          Vai trò
                        </p>
                        <p className="text-white capitalize">{user.role}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Ngày tham gia
                        </p>
                        <p className="text-white">{formatDate(user.createdAt)}</p>
                      </div>
                      {user.following_count !== undefined && (
                        <div>
                          <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Đang theo dõi
                          </p>
                          <p className="text-white">{user.following_count}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* KYC Tab */}
              {activeTab === 'kyc' && (
                <div className="space-y-6">
                  {user.kyc_status === 'unverified' ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Người dùng chưa xác thực KYC</p>
                    </div>
                  ) : !kycDetails ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Đang tải thông tin KYC...</p>
                    </div>
                  ) : (
                    <>
                      {/* User Info */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Thông tin người dùng</h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-400 text-sm">Username</p>
                            <p className="text-white font-medium">{kycDetails.user.username}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Email</p>
                            <p className="text-white font-medium">{kycDetails.user.email}</p>
                          </div>
                          {kycDetails.user.fullname && (
                            <div>
                              <p className="text-gray-400 text-sm">Họ tên</p>
                              <p className="text-white font-medium">{kycDetails.user.fullname}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400 text-sm">Trạng thái KYC</p>
                            <div className="mt-1">{getKYCStatusBadge(kycDetails.user.kyc_status)}</div>
                          </div>
                        </div>
                      </div>

                      {/* KYC Info */}
                      {kycDetails.kyc_info && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Thông tin xác thực</h3>
                          <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                            {kycDetails.kyc_info.identity_verified_name && (
                              <div>
                                <p className="text-gray-400 text-sm">Tên trên CCCD</p>
                                <p className="text-white">{kycDetails.kyc_info.identity_verified_name}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.identity_card_last4 && (
                              <div>
                                <p className="text-gray-400 text-sm">CCCD (4 số cuối)</p>
                                <p className="text-white">{kycDetails.kyc_info.identity_card_last4}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.tax_code && (
                              <div>
                                <p className="text-gray-400 text-sm">Mã số thuế</p>
                                <p className="text-white">{kycDetails.kyc_info.tax_code}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.address && (
                              <div>
                                <p className="text-gray-400 text-sm flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  Địa chỉ
                                </p>
                                <p className="text-white">
                                  {kycDetails.kyc_info.address.district && kycDetails.kyc_info.address.city
                                    ? `${kycDetails.kyc_info.address.district}, ${kycDetails.kyc_info.address.city}`
                                    : '-'}
                                </p>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_submitted_at && (
                              <div>
                                <p className="text-gray-400 text-sm">Ngày nộp</p>
                                <p className="text-white">{formatDateTime(kycDetails.kyc_info.kyc_submitted_at)}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_verified_at && (
                              <div>
                                <p className="text-gray-400 text-sm">Ngày xác thực</p>
                                <p className="text-white">{formatDateTime(kycDetails.kyc_info.kyc_verified_at)}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_rejection_reason && (
                              <div className="col-span-2">
                                <p className="text-gray-400 text-sm">Lý do từ chối</p>
                                <p className="text-red-400">{kycDetails.kyc_info.kyc_rejection_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bank Info */}
                      {kycDetails.kyc_info?.bank_account && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Thông tin ngân hàng
                          </h3>
                          <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                            {kycDetails.kyc_info.bank_account.bank_name && (
                              <div>
                                <p className="text-gray-400 text-sm">Ngân hàng</p>
                                <p className="text-white">{kycDetails.kyc_info.bank_account.bank_name}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.bank_account.account_number_last4 && (
                              <div>
                                <p className="text-gray-400 text-sm">STK (4 số cuối)</p>
                                <p className="text-white">{kycDetails.kyc_info.bank_account.account_number_last4}</p>
                              </div>
                            )}
                            {kycDetails.kyc_info.bank_account.account_holder_name && (
                              <div>
                                <p className="text-gray-400 text-sm">Tên chủ tài khoản</p>
                                <p className="text-white">{kycDetails.kyc_info.bank_account.account_holder_name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* KYC Documents */}
                      {kycDetails.kyc_info?.kyc_documents && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Tài liệu KYC
                          </h3>
                          <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                            {kycDetails.kyc_info.kyc_documents.identity_front_url && (
                              <div>
                                <p className="text-gray-400 text-sm mb-2">Mặt trước CCCD</p>
                                <a
                                  href={kycDetails.kyc_info.kyc_documents.identity_front_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Xem tài liệu</span>
                                </a>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_documents.identity_back_url && (
                              <div>
                                <p className="text-gray-400 text-sm mb-2">Mặt sau CCCD</p>
                                <a
                                  href={kycDetails.kyc_info.kyc_documents.identity_back_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Xem tài liệu</span>
                                </a>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_documents.selfie_url && (
                              <div>
                                <p className="text-gray-400 text-sm mb-2">Ảnh selfie</p>
                                <a
                                  href={kycDetails.kyc_info.kyc_documents.selfie_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Xem ảnh</span>
                                </a>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_documents.tax_document_url && (
                              <div>
                                <p className="text-gray-400 text-sm mb-2">Giấy tờ thuế</p>
                                <a
                                  href={kycDetails.kyc_info.kyc_documents.tax_document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Xem tài liệu</span>
                                </a>
                              </div>
                            )}
                            {kycDetails.kyc_info.kyc_documents.bank_statement_url && (
                              <div>
                                <p className="text-gray-400 text-sm mb-2">Sao kê ngân hàng</p>
                                <a
                                  href={kycDetails.kyc_info.kyc_documents.bank_statement_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Xem tài liệu</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Campaigns Tab */}
              {activeTab === 'campaigns' && (
                <div className="space-y-4">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Người dùng chưa tạo campaign nào</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.map((campaign) => (
                        <div key={campaign._id} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-white font-semibold text-lg">{campaign.title}</h4>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  campaign.status === 'active' ? 'bg-green-900/30 text-green-500' :
                                  campaign.status === 'pending' ? 'bg-yellow-900/30 text-yellow-500' :
                                  campaign.status === 'completed' ? 'bg-blue-900/30 text-blue-500' :
                                  'bg-gray-900/30 text-gray-500'
                                }`}>
                                  {campaign.status}
                                </span>
                              </div>
                              {campaign.description && (
                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{campaign.description}</p>
                              )}
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-400">Mục tiêu</p>
                                  <p className="text-white font-medium">{formatCurrency(campaign.goal_amount)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400">Đã quyên góp</p>
                                  <p className="text-white font-medium">{formatCurrency(campaign.current_amount)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400">Ngày tạo</p>
                                  <p className="text-white font-medium">{formatDate(campaign.createdAt)}</p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/admin/campaigns/${campaign._id}`)}
                              className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

