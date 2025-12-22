'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '12,456', change: '+5.2%', trend: 'up' },
    { label: 'Active Campaigns', value: '82', change: '+1.8%', trend: 'up' },
    { label: 'Pending User Approvals', value: '15', change: '-0.5%', trend: 'down' },
    { label: 'Pending Campaign Approvals', value: '6', change: '+3.0%', trend: 'up' },
  ];

  const recentApprovals = [
    { name: 'John Doe', type: 'User Approval', time: '2 hours ago', avatar: 'J' },
    { name: 'Summer Sale 2024', type: 'Campaign Approval', time: '5 hours ago', avatar: 'C' },
    { name: 'Jane Smith', type: 'User Approval', time: '1 day ago', avatar: 'J' },
    { name: 'Michael Johnson', type: 'User Approval', time: '2 days ago', avatar: 'M' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <AdminSidebar />
      <AdminHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Trang tổng quan</h1>
            <p className="text-gray-400">Welcome back, Admin! Here's a summary of your platform's activity.</p>
          </div>

          <div className="flex gap-4 mb-6">
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
              Last 7 Days ▼
            </button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all">
              This Month ▼
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all ml-auto">
              📊 View Reports
            </button>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-[#1a1f2e] p-6 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">{stat.label}</div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className={`text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.trend === 'up' ? '📈' : '📉'} {stat.change} from last month
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#1a1f2e] p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6">New User Signups</h3>
              <div className="h-64 flex items-end justify-center">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <polyline
                    points="50,150 100,120 150,100 200,80 250,60 300,40 350,20"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                  {[50, 100, 150, 200, 250, 300, 350].map((x, i) => (
                    <circle key={i} cx={x} cy={150 - i * 20} r="4" fill="#3b82f6" />
                  ))}
                </svg>
              </div>
            </div>

            <div className="bg-[#1a1f2e] p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Latest Approval Requests</h3>
                <button className="text-blue-500 hover:text-blue-400 text-sm">View All</button>
              </div>
              <div className="space-y-4">
                {recentApprovals.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {item.avatar}
                      </div>
                      <div>
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-gray-400 text-sm">{item.type} - {item.time}</div>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all">
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

