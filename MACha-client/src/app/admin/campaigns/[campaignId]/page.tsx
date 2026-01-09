'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminContentWrapper from '@/components/admin/AdminContentWrapper';
import { getCampaignById, Campaign } from '@/services/admin/campaign.service';
import { campaignService, CampaignUpdate } from '@/services/campaign.service';
import { donationService, Donation } from '@/services/donation.service';
import { escrowService, Escrow } from '@/services/escrow.service';
import Swal from 'sweetalert2';
import Image from 'next/image';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
} from 'lucide-react';

export default function AdminCampaignDetail() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignFull, setCampaignFull] = useState<any>(null); // Full campaign data from regular API
  const [donations, setDonations] = useState<Donation[]>([]);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'donations' | 'updates' | 'withdrawals'>('overview');

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData();
      fetchDonations();
      fetchUpdates();
      fetchWithdrawalRequests();
    }
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const data = await getCampaignById(campaignId);
      setCampaign(data);
      
      // Also fetch full campaign data for contact info
      try {
        const fullData = await campaignService.getCampaignById(campaignId);
        setCampaignFull(fullData);
      } catch (err) {
        console.error('Failed to fetch full campaign data:', err);
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error?.response?.data?.message || 'Không thể tải thông tin campaign',
      });
      router.push('/admin/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const data = await donationService.getDonationsByCampaign(campaignId);
      setDonations(data);
    } catch (err) {
      console.error('Failed to fetch donations:', err);
      setDonations([]);
    }
  };

  const fetchUpdates = async () => {
    try {
      const data = await campaignService.getCampaignUpdates(campaignId);
      setUpdates(data);
    } catch (err) {
      console.error('Failed to fetch updates:', err);
      setUpdates([]);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const data = await escrowService.getWithdrawalRequestsByCampaign(campaignId);
      setWithdrawalRequests(data);
    } catch (err) {
      console.error('Failed to fetch withdrawal requests:', err);
      setWithdrawalRequests([]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">Đang hoạt động</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">Chờ duyệt</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">Từ chối</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-blue-900/30 text-blue-500 rounded-full text-sm">Hoàn thành</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">Đã hủy</span>;
      default:
        return <span className="px-3 py-1 bg-gray-900/30 text-gray-500 rounded-full text-sm">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
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

  const getProgressPercentage = () => {
    if (!campaign) return 0;
    return Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
  };

  const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const completedDonations = donations.filter((d) => d.payment_status === 'completed');
  const completedDonationsAmount = completedDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <AdminSidebar />
        <AdminHeader />
        <AdminContentWrapper>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Đang tải...</p>
            </div>
          </div>
        </AdminContentWrapper>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <AdminSidebar />
      <AdminHeader />

      <AdminContentWrapper>
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
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{campaign.title}</h1>
                <div className="flex items-center gap-4">
                  {getStatusBadge(campaign.status)}
                  <span className="text-gray-400 text-sm">ID: {campaign._id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Image */}
          {campaignFull?.banner_image && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <Image
                src={campaignFull.banner_image}
                alt={campaign.title}
                width={1200}
                height={400}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Mục tiêu</p>
                  <p className="text-white font-semibold">{formatCurrency(campaign.goal_amount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Đã quyên góp</p>
                  <p className="text-white font-semibold">{formatCurrency(campaign.current_amount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Số lượt donate</p>
                  <p className="text-white font-semibold">{completedDonations.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Tiến độ</p>
                  <p className="text-white font-semibold">{getProgressPercentage().toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Tiến độ quyên góp</span>
              <span className="text-white font-semibold">{getProgressPercentage().toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
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
                onClick={() => setActiveTab('donations')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeTab === 'donations'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Quyên góp ({donations.length})
              </button>
              <button
                onClick={() => setActiveTab('updates')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeTab === 'updates'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Cập nhật ({updates.length})
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeTab === 'withdrawals'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yêu cầu rút tiền ({withdrawalRequests.length})
              </button>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Description */}
                  {campaign.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Mô tả</h3>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p className="text-gray-300 whitespace-pre-wrap">{campaign.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Creator Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Người tạo
                    </h3>
                    <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Username</p>
                        <p className="text-white">{campaign.creator?.username || 'N/A'}</p>
                      </div>
                      {campaign.creator?.email && (
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Email</p>
                          <p className="text-white">{campaign.creator.email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {campaignFull?.contact_info && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Thông tin chi tiết người tạo
                      </h3>
                      <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Họ tên</p>
                          <p className="text-white">{campaignFull.contact_info.fullname}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            Điện thoại
                          </p>
                          <p className="text-white">{campaignFull.contact_info.phone}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            Email
                          </p>
                          <p className="text-white">{campaignFull.contact_info.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Địa chỉ
                          </p>
                          <p className="text-white">{campaignFull.contact_info.address}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Thông tin chiến dịch
                    </h3>
                    <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Danh mục</p>
                        <p className="text-white capitalize">{campaign.category}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Ngày bắt đầu</p>
                        <p className="text-white">{formatDate(campaign.start_date)}</p>
                      </div>
                      {campaign.end_date && (
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Ngày kết thúc</p>
                          <p className="text-white">{formatDate(campaign.end_date)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Ngày tạo</p>
                        <p className="text-white">{formatDate(campaign.createdAt)}</p>
                      </div>
                      {campaign.approved_at && (
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Ngày duyệt</p>
                          <p className="text-white">{formatDate(campaign.approved_at)}</p>
                        </div>
                      )}
                      {campaign.rejected_at && (
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Ngày từ chối</p>
                          <p className="text-white">{formatDate(campaign.rejected_at)}</p>
                        </div>
                      )}
                      {campaign.rejection_reason && (
                        <div className="col-span-2">
                          <p className="text-gray-400 text-sm mb-1">Lý do từ chối</p>
                          <p className="text-red-400">{campaign.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proof Documents */}
                  {campaignFull?.proof_documents_url && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Tài liệu chứng minh
                      </h3>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <a
                          href={campaignFull.proof_documents_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Xem tài liệu</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Gallery Images */}
                  {campaignFull?.gallery_images && campaignFull.gallery_images.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Hình ảnh
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        {campaignFull.gallery_images.map((img: string, index: number) => (
                          <div key={index} className="rounded-lg overflow-hidden">
                            <Image
                              src={img}
                              alt={`Gallery ${index + 1}`}
                              width={300}
                              height={200}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Donations Tab */}
              {activeTab === 'donations' && (
                <div className="space-y-4">
                  {donations.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Chưa có quyên góp nào</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-4 py-3 text-left text-gray-400 font-medium text-sm">Người quyên góp</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium text-sm">Số tiền</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium text-sm">Phương thức</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium text-sm">Trạng thái</th>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium text-sm">Ngày</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donations.map((donation) => (
                            <tr key={donation._id} className="border-b border-gray-700 hover:bg-gray-800/50">
                              <td className="px-4 py-3">
                                {donation.is_anonymous ? (
                                  <span className="text-gray-400">Ẩn danh</span>
                                ) : typeof donation.donor === 'object' && donation.donor ? (
                                  <div className="text-white">{donation.donor.username || donation.donor.fullname || 'N/A'}</div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-white font-medium">{formatCurrency(donation.amount)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-400 capitalize">{donation.donation_method}</span>
                              </td>
                              <td className="px-4 py-3">
                                {donation.payment_status === 'completed' ? (
                                  <span className="px-2 py-1 bg-green-900/30 text-green-500 rounded text-xs">Hoàn thành</span>
                                ) : donation.payment_status === 'pending' ? (
                                  <span className="px-2 py-1 bg-yellow-900/30 text-yellow-500 rounded text-xs">Chờ xử lý</span>
                                ) : (
                                  <span className="px-2 py-1 bg-red-900/30 text-red-500 rounded text-xs">{donation.payment_status}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-400 text-sm">{formatDateTime(donation.createdAt)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Updates Tab */}
              {activeTab === 'updates' && (
                <div className="space-y-4">
                  {updates.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Chưa có cập nhật nào</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {updates.map((update) => (
                        <div key={update._id} className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {typeof update.creator === 'object' && update.creator && (
                                <span className="text-white font-medium">{update.creator.username}</span>
                              )}
                              <span className="text-gray-400 text-sm">{formatDateTime(update.createdAt)}</span>
                            </div>
                          </div>
                          {update.content && (
                            <p className="text-gray-300 mb-3 whitespace-pre-wrap">{update.content}</p>
                          )}
                          {update.image_url && (
                            <div className="mt-3 rounded-lg overflow-hidden">
                              <Image
                                src={update.image_url}
                                alt="Update image"
                                width={600}
                                height={400}
                                className="w-full max-w-2xl h-auto"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Withdrawals Tab */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-4">
                  {withdrawalRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Chưa có yêu cầu rút tiền nào</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {withdrawalRequests.map((request) => (
                        <div key={request._id} className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-white font-semibold text-lg">
                                {formatCurrency(request.withdrawal_request_amount)}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {formatDateTime(request.createdAt)}
                              </p>
                            </div>
                            <div>
                              {request.request_status === 'admin_approved' && (
                                <span className="px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-sm">
                                  Đã duyệt
                                </span>
                              )}
                              {request.request_status === 'voting_completed' && (
                                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-500 rounded-full text-sm">
                                  Chờ duyệt
                                </span>
                              )}
                              {request.request_status === 'released' && (
                                <span className="px-3 py-1 bg-blue-900/30 text-blue-500 rounded-full text-sm">
                                  Đã giải ngân
                                </span>
                              )}
                              {request.request_status === 'admin_rejected' && (
                                <span className="px-3 py-1 bg-red-900/30 text-red-500 rounded-full text-sm">
                                  Từ chối
                                </span>
                              )}
                            </div>
                          </div>
                          {request.request_reason && (
                            <div className="mb-2">
                              <p className="text-gray-400 text-sm mb-1">Lý do:</p>
                              <p className="text-gray-300">{request.request_reason}</p>
                            </div>
                          )}
                          <button
                            onClick={() => router.push(`/admin/withdrawal-requests`)}
                            className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Xem chi tiết →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminContentWrapper>
    </div>
  );
}

