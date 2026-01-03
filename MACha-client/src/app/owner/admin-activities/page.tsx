'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, AdminActivities } from '@/services/owner.service';
import { Activity, CheckCircle, XCircle, FileText, DollarSign, Filter, Calendar } from 'lucide-react';


interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

export default function OwnerAdminActivities() {
  const [data, setData] = useState<AdminActivities | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [admins, setAdmins] = useState<User[]>([]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedAdminId, actionTypeFilter, itemTypeFilter, startDate, endDate]);

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
    } catch (error) {
      console.error('Error fetching admin activities:', error);
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
    { label: 'Campaign Approvals', value: data.statistics.campaign_approvals, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Campaign Rejections', value: data.statistics.campaign_rejections, icon: XCircle, color: 'bg-red-500' },
    { label: 'Event Approvals', value: data.statistics.event_approvals, icon: CheckCircle, color: 'bg-blue-500' },
    { label: 'Event Rejections', value: data.statistics.event_rejections, icon: XCircle, color: 'bg-orange-500' },
    { label: 'KYC Approvals', value: data.statistics.kyc_approvals, icon: CheckCircle, color: 'bg-purple-500' },
    { label: 'KYC Rejections', value: data.statistics.kyc_rejections, icon: XCircle, color: 'bg-pink-500' },
    { label: 'Report Resolutions', value: data.statistics.report_resolutions, icon: FileText, color: 'bg-yellow-500' },
    { label: 'Withdrawal Approvals', value: data.statistics.withdrawal_approvals, icon: DollarSign, color: 'bg-green-600' },
    { label: 'Withdrawal Rejections', value: data.statistics.withdrawal_rejections, icon: DollarSign, color: 'bg-red-600' },
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

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Admins</option>
                  {admins.map((admin) => (
                    <option key={admin._id} value={admin._id}>
                      {admin.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Actions</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                <select
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="campaign">Campaign</option>
                  <option value="event">Event</option>
                  <option value="kyc">KYC</option>
                  <option value="report">Report</option>
                  <option value="escrow">Escrow</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {data.admin && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
              <p className="text-gray-600">
                Viewing activities for: <span className="font-semibold text-gray-900">{data.admin.username}</span>
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Total Actions: {data.statistics.total_actions}</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Approvals</div>
                <div className="text-2xl font-bold text-green-600">
                  {data.statistics.campaign_approvals + 
                   data.statistics.event_approvals + 
                   data.statistics.kyc_approvals + 
                   data.statistics.withdrawal_approvals}
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Rejections</div>
                <div className="text-2xl font-bold text-red-600">
                  {data.statistics.campaign_rejections + 
                   data.statistics.event_rejections + 
                   data.statistics.kyc_rejections + 
                   data.statistics.withdrawal_rejections}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
