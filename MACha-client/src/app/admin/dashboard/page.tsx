'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminService, AdminDashboardData } from '@/services/admin.service';
import { 
  Users, 
  Megaphone, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  XCircle,
  ArrowUpRight,
  Clock,
  FileText
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await adminService.getAdminDashboard();
        setDashboardData(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <AdminHeader />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <AdminHeader />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-500">{error || 'Không thể tải dashboard'}</p>
          </div>
        </div>
      </div>
    );
  }

  const approvalStats = dashboardData.approvals_rejections?.[timeFilter] || { approvals: 0, rejections: 0 };

  const maxUserGrowth = Math.max(
    ...(dashboardData.user_growth_by_month || []).map(d => d.count),
    1
  );

  const maxCampaignActivity = Math.max(
    ...(dashboardData.campaign_activity_by_month || []).map(d => Math.max(d.created, d.approved)),
    1
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Trang tổng quan</h1>
              <p className="text-gray-600">Chào mừng trở lại! Dưới đây là tổng quan hoạt động hệ thống.</p>
            </div>
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    timeFilter === filter
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filter === 'today' ? 'Hôm nay' : filter === 'week' ? 'Tuần này' : 'Tháng này'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-6 grid grid-cols-5 gap-4">
            <Link href="/admin/users" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 group">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quản lý người dùng</div>
                  <div className="text-xs text-gray-500">User management</div>
                </div>
              </div>
            </Link>
            <Link href="/admin/campaigns" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 group">
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quản lý campaign</div>
                  <div className="text-xs text-gray-500">Campaign management</div>
                </div>
              </div>
            </Link>
            <Link href="/admin/events" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 group">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quản lý sự kiện</div>
                  <div className="text-xs text-gray-500">Event management</div>
                </div>
              </div>
            </Link>
            <Link href="/admin/kyc" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 group">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-orange-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Duyệt người dùng</div>
                  <div className="text-xs text-gray-500">KYC approval</div>
                </div>
              </div>
            </Link>
            <Link href="/admin/reports" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 group">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quản lý báo cáo</div>
                  <div className="text-xs text-gray-500">Reports management</div>
                </div>
              </div>
            </Link>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-5 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">Tổng người dùng</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.overview.total_users.toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Megaphone className="w-8 h-8 text-green-600" />
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">Tổng campaigns</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.overview.total_campaigns.toLocaleString('vi-VN')}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {dashboardData.overview.active_campaigns} đang hoạt động
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">Tổng sự kiện</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.overview.total_events.toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-yellow-600" />
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">Tổng đóng góp</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.overview.total_donations.toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">Tổng duyệt</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {dashboardData.admin_stats.total_approvals.toLocaleString('vi-VN')}
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {dashboardData.admin_stats.total_rejections} từ chối
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Items */}
          <div className="grid grid-cols-5 gap-6 mb-6">
            <Link href="/admin/campaigns?status=pending" className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">Campaigns chờ duyệt</div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {dashboardData.pending.campaigns}
                  </div>
                </div>
                <Megaphone className="w-8 h-8 text-yellow-600" />
              </div>
            </Link>

            <Link href="/admin/events?status=pending" className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">Sự kiện chờ duyệt</div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {dashboardData.pending.events}
                  </div>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </Link>

            <Link href="/admin/kyc" className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">KYC chờ duyệt</div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {dashboardData.pending.kyc}
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </Link>

            <Link href="/admin/reports" className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">Báo cáo chờ xử lý</div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {dashboardData.pending.reports}
                  </div>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </Link>

            <Link href="/admin/withdrawal-requests" className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm mb-1">Yêu cầu rút tiền</div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {dashboardData.pending.withdrawals}
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </Link>
          </div>

          {/* Approvals/Rejections and Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Duyệt/Từ chối ({timeFilter === 'today' ? 'Hôm nay' : timeFilter === 'week' ? 'Tuần này' : 'Tháng này'})</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700 font-medium">Đã duyệt</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{approvalStats.approvals}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <span className="text-gray-700 font-medium">Đã từ chối</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{approvalStats.rejections}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Tổng hành động</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {approvalStats.approvals + approvalStats.rejections}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tăng trưởng người dùng (12 tháng gần đây)</h3>
              <div className="h-64 relative">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {(dashboardData.user_growth_by_month || []).map((item, index, array) => {
                    const x = 50 + (index * (350 / Math.max(array.length - 1, 1)));
                    const y = 180 - ((item.count / maxUserGrowth) * 150);
                    const nextX = index < array.length - 1 ? 50 + ((index + 1) * (350 / Math.max(array.length - 1, 1))) : x;
                    const nextItem = array[index + 1];
                    const nextY = nextItem ? 180 - ((nextItem.count / maxUserGrowth) * 150) : y;
                    
                    return (
                      <g key={`month-${index}`}>
                        {index < array.length - 1 && (
                          <line
                            x1={x}
                            y1={y}
                            x2={nextX}
                            y2={nextY}
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                        )}
                        <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                        {index % 2 === 0 && (
                          <text x={x} y={195} textAnchor="middle" className="text-xs fill-gray-500">
                            {item.month.split('/')[0]}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
                  <span>12 tháng trước</span>
                  <span>Hiện tại</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Activity and Recent Actions */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động Campaign (12 tháng gần đây)</h3>
              <div className="h-64 relative">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {(dashboardData.campaign_activity_by_month || []).map((item, index, array) => {
                    const x = 50 + (index * (350 / Math.max(array.length - 1, 1)));
                    const createdY = 180 - ((item.created / maxCampaignActivity) * 150);
                    const approvedY = 180 - ((item.approved / maxCampaignActivity) * 150);
                    const nextX = index < array.length - 1 ? 50 + ((index + 1) * (350 / Math.max(array.length - 1, 1))) : x;
                    const nextItem = array[index + 1];
                    const nextCreatedY = nextItem ? 180 - ((nextItem.created / maxCampaignActivity) * 150) : createdY;
                    const nextApprovedY = nextItem ? 180 - ((nextItem.approved / maxCampaignActivity) * 150) : approvedY;
                    
                    return (
                      <g key={`activity-${index}`}>
                        {index < array.length - 1 && (
                          <>
                            <line
                              x1={x}
                              y1={createdY}
                              x2={nextX}
                              y2={nextCreatedY}
                              stroke="#10b981"
                              strokeWidth="2"
                            />
                            <line
                              x1={x}
                              y1={approvedY}
                              x2={nextX}
                              y2={nextApprovedY}
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                          </>
                        )}
                        <circle cx={x} cy={createdY} r="4" fill="#10b981" />
                        <circle cx={x} cy={approvedY} r="4" fill="#3b82f6" />
                        {index % 2 === 0 && (
                          <text x={x} y={195} textAnchor="middle" className="text-xs fill-gray-500">
                            {item.month.split('/')[0]}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute top-2 right-2 flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Đã tạo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Đã duyệt</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Hoạt động gần đây của bạn</h3>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(dashboardData.recent_actions || []).length > 0 ? (
                  dashboardData.recent_actions.map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          action.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {action.status === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate">{action.item}</div>
                          <div className="text-sm text-gray-500">{action.type}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatTimeAgo(action.date)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">Chưa có hoạt động nào</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
