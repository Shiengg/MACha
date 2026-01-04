'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, AdminActivities } from '@/services/owner.service';
import { Activity, CheckCircle, XCircle, FileText, DollarSign, Users } from 'lucide-react';


interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

function OwnerAdminActivitiesContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AdminActivities | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [admins, setAdmins] = useState<User[]>([]);

  useEffect(() => {
    fetchAdmins();
    // Read adminId from URL query parameter if present
    const adminIdFromUrl = searchParams.get('adminId');
    if (adminIdFromUrl) {
      setSelectedAdminId(adminIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [selectedAdminId]);

  const fetchAdmins = async () => {
    try {
      const adminsData = await ownerService.getAdmins({ page: 1, limit: 100 });
      setAdmins(adminsData.admins.map(a => ({
        _id: a._id,
        username: a.username,
        email: a.email,
        role: 'admin'
      })));
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await ownerService.getAdminActivities({ 
        adminId: selectedAdminId || undefined 
      });
      setData(result);
    } catch (error: any) {
      console.error('Error fetching admin activities:', error);
      // Set default empty data on error
      setData({
        statistics: {
          campaign_approvals: 0,
          campaign_rejections: 0,
          event_approvals: 0,
          event_rejections: 0,
          kyc_approvals: 0,
          kyc_rejections: 0,
          report_resolutions: 0,
          withdrawal_approvals: 0,
          withdrawal_rejections: 0,
          total_actions: 0
        },
        admin: null,
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OwnerSidebar />
        <OwnerHeader />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Campaign Approvals', value: data.statistics.campaign_approvals || 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Campaign Rejections', value: data.statistics.campaign_rejections || 0, icon: XCircle, color: 'bg-red-500' },
    { label: 'Event Approvals', value: data.statistics.event_approvals || 0, icon: CheckCircle, color: 'bg-blue-500' },
    { label: 'Event Rejections', value: data.statistics.event_rejections || 0, icon: XCircle, color: 'bg-orange-500' },
    { label: 'KYC Approvals', value: data.statistics.kyc_approvals || 0, icon: CheckCircle, color: 'bg-purple-500' },
    { label: 'KYC Rejections', value: data.statistics.kyc_rejections || 0, icon: XCircle, color: 'bg-pink-500' },
    { label: 'Report Resolutions', value: data.statistics.report_resolutions || 0, icon: FileText, color: 'bg-yellow-500' },
    { label: 'Withdrawal Approvals', value: data.statistics.withdrawal_approvals || 0, icon: DollarSign, color: 'bg-green-600' },
    { label: 'Withdrawal Rejections', value: data.statistics.withdrawal_rejections || 0, icon: DollarSign, color: 'bg-red-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Hoạt động Admin</h1>
              <p className="text-gray-600">Thống kê hoạt động của admin</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Chọn Admin</h3>
                <p className="text-sm text-gray-500">Xem thống kê hoạt động theo admin cụ thể</p>
              </div>
            </div>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin</label>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">Tất cả Admin</option>
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {data.admin && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-lg border border-purple-200 shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-full">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Đang xem hoạt động của</p>
                  <p className="text-lg font-semibold text-gray-900">{data.admin.username}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-100">Tổng số hành động</p>
                <h2 className="text-3xl font-bold text-white">{data.statistics.total_actions || 0}</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`${stat.color} p-3 rounded-lg shadow-sm`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Tổng kết hoạt động
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Tổng số duyệt</div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-4xl font-bold text-green-600">
                  {(data.statistics.campaign_approvals || 0) + 
                   (data.statistics.event_approvals || 0) + 
                   (data.statistics.kyc_approvals || 0) + 
                   (data.statistics.withdrawal_approvals || 0)}
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Tổng số từ chối</div>
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-4xl font-bold text-red-600">
                  {(data.statistics.campaign_rejections || 0) + 
                   (data.statistics.event_rejections || 0) + 
                   (data.statistics.kyc_rejections || 0) + 
                   (data.statistics.withdrawal_rejections || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OwnerAdminActivities() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <OwnerSidebar />
        <OwnerHeader />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <OwnerAdminActivitiesContent />
    </Suspense>
  );
}
