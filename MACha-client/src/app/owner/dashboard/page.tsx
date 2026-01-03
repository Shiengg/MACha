'use client';

import { useEffect, useState } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, DashboardData } from '@/services/owner.service';
import { Users, Shield, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function OwnerDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await ownerService.getOwnerDashboard();
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
        <OwnerSidebar />
        <OwnerHeader />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OwnerSidebar />
        <OwnerHeader />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-500">{error || 'Failed to load dashboard'}</p>
          </div>
        </div>
      </div>
    );
  }

  const financialStats = [
    {
      label: 'Total Donated',
      value: dashboardData.financial.total_donated,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Total Released',
      value: dashboardData.financial.total_released,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Total Pending',
      value: dashboardData.financial.total_pending || 0,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  const approvalStats = dashboardData.approvals_rejections?.[timeFilter] || { approvals: 0, rejections: 0 };

  const maxFinancialValue = Math.max(
    ...(dashboardData.financial_by_time || []).map(d => Math.max(d.donated, d.released)),
    1
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Tổng quan hệ thống MACha</p>
            </div>
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    timeFilter === filter
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-6 grid grid-cols-5 gap-4">
            <Link href="/owner/admins" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 group">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Quản lý Admin</div>
                  <div className="text-xs text-gray-500">Manage admins</div>
                </div>
              </div>
            </Link>
            <Link href="/owner/financial" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 group">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Tài chính</div>
                  <div className="text-xs text-gray-500">Financial overview</div>
                </div>
              </div>
            </Link>
            <Link href="/owner/financial/campaigns" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 group">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Campaigns</div>
                  <div className="text-xs text-gray-500">Campaign finances</div>
                </div>
              </div>
            </Link>
            <Link href="/owner/admin-activities" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 group">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-orange-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Hoạt động</div>
                  <div className="text-xs text-gray-500">Admin activities</div>
                </div>
              </div>
            </Link>
            <Link href="/owner/approval-history" className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 group">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Lịch sử</div>
                  <div className="text-xs text-gray-500">Approval history</div>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">Total Admins</div>
                  <div className="text-2xl font-bold text-gray-900">{dashboardData.overview.admins}</div>
                </div>
              </div>
            </div>

            {financialStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className={`${stat.bgColor} p-6 rounded-lg border border-gray-200 shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <IconComponent className={`w-8 h-8 ${stat.color}`} />
                    <div className="text-right">
                      <div className="text-gray-600 text-sm mb-1">{stat.label}</div>
                      <div className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value.toLocaleString('vi-VN')} VND
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approvals/Rejections ({timeFilter})</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700 font-medium">Approvals</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{approvalStats.approvals}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <span className="text-gray-700 font-medium">Rejections</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{approvalStats.rejections}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Total Actions</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {approvalStats.approvals + approvalStats.rejections}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Flow (Last 12 Months)</h3>
              <div className="h-64 relative">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <defs>
                    <linearGradient id="donatedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="releasedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {(dashboardData.financial_by_time || []).map((item, index, array) => {
                    const x = 50 + (index * (350 / Math.max(array.length - 1, 1)));
                    const donatedY = 180 - ((item.donated / maxFinancialValue) * 150);
                    const releasedY = 180 - ((item.released / maxFinancialValue) * 150);
                    const nextX = index < array.length - 1 ? 50 + ((index + 1) * (350 / Math.max(array.length - 1, 1))) : x;
                    const nextItem = array[index + 1];
                    const nextDonatedY = nextItem ? 180 - ((nextItem.donated / maxFinancialValue) * 150) : donatedY;
                    const nextReleasedY = nextItem ? 180 - ((nextItem.released / maxFinancialValue) * 150) : releasedY;
                    
                    return (
                      <g key={`month-${index}`}>
                        {index < array.length - 1 && (
                          <>
                            <line
                              x1={x}
                              y1={donatedY}
                              x2={nextX}
                              y2={nextDonatedY}
                              stroke="#10b981"
                              strokeWidth="2"
                            />
                            <line
                              x1={x}
                              y1={releasedY}
                              x2={nextX}
                              y2={nextReleasedY}
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                          </>
                        )}
                        <circle cx={x} cy={donatedY} r="4" fill="#10b981" />
                        <circle cx={x} cy={releasedY} r="4" fill="#ef4444" />
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
                  <span>12 months ago</span>
                  <span>Now</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Donated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Released</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top 5 Campaigns</h3>
                <Link href="/owner/financial/campaigns" className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1">
                  View All <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {(dashboardData.top_campaigns || []).map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{campaign.title}</div>
                        <div className="text-sm text-gray-500">ID: {String(campaign.campaignId).slice(0, 8)}...</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{campaign.total.toLocaleString('vi-VN')} VND</div>
                    </div>
                  </div>
                ))}
                {(!dashboardData.top_campaigns || dashboardData.top_campaigns.length === 0) && (
                  <div className="text-center text-gray-500 py-4">No campaigns data</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top 5 Admins</h3>
                <Link href="/owner/admin-activities" className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1">
                  View All <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {(dashboardData.top_admins || []).map((admin, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{admin.username}</div>
                        <div className="text-sm text-gray-500">ID: {String(admin.adminId).slice(0, 8)}...</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{admin.total} actions</div>
                    </div>
                  </div>
                ))}
                {(!dashboardData.top_admins || dashboardData.top_admins.length === 0) && (
                  <div className="text-center text-gray-500 py-4">No admins data</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
