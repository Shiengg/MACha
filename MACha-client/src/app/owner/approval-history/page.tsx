'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, ApprovalHistoryItem } from '@/services/owner.service';
import { History, Filter, ExternalLink } from 'lucide-react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import Link from 'next/link';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

export default function OwnerApprovalHistory() {
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    adminId: '',
    startDate: '',
    endDate: '',
  });
  const [admins, setAdmins] = useState<User[]>([]);
  const [sortField, setSortField] = useState<'type' | 'action' | 'admin' | 'timestamp' | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage, filters]);

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
      const result = await ownerService.getApprovalHistory({ 
        ...filters, 
        page: currentPage, 
        limit: 20 
      });
      setHistory(result.history);
      setTotalPages(result.pagination.pages);
    } catch (error) {
      console.error('Error fetching approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action === 'approved') return 'bg-green-100 text-green-800';
    if (action === 'verified') return 'bg-blue-100 text-blue-800';
    if (action === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      campaign: 'Campaign',
      event: 'Event',
      kyc: 'KYC',
      report: 'Report',
      escrow: 'Escrow',
    };
    return labels[type] || type;
  };

  const handleSort = (field: 'type' | 'action' | 'admin' | 'timestamp') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: 'type' | 'action' | 'admin' | 'timestamp') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  const sortedHistory = [...history].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'action':
        aValue = a.action;
        bValue = b.action;
        break;
      case 'admin':
        aValue = a.admin?.username || '';
        bValue = b.admin?.username || '';
        break;
      case 'timestamp':
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
        break;
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleExport = () => {
    const csvContent = [
      ['Type', 'Action', 'Item', 'Admin', 'Reason', 'Date'].join(','),
      ...sortedHistory.map(item => {
        const reason = item.action === 'rejected' 
          ? (item.item?.rejection_reason || item.item?.rejected_reason || item.item?.admin_rejection_reason || 'No reason provided')
          : (item.item?.approval_reason || 'N/A');
        const itemName = item.type === 'campaign' ? (item.item?.title || 'N/A') :
          item.type === 'event' ? (item.item?.title || 'N/A') :
          item.type === 'escrow' ? (item.item?.campaign?.title || 'N/A') :
          item.type === 'report' ? (item.item?.reported_type || 'N/A') :
          item.type === 'kyc' ? (item.item?.user?.username || item.item?.user?.fullname || 'N/A') :
          'N/A';
        
        return [
          getTypeLabel(item.type),
          item.action,
          itemName,
          item.admin?.username || 'N/A',
          reason.replace(/,/g, ';'),
          new Date(item.timestamp).toLocaleString('vi-VN')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approval-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Lịch sử duyệt/từ chối</h1>
              <p className="text-gray-600">Lịch sử tất cả các hoạt động duyệt/từ chối</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                <select
                  value={filters.adminId}
                  onChange={(e) => setFilters({ ...filters, adminId: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center gap-2">
                          Type
                          {getSortIcon('type')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('action')}
                      >
                        <div className="flex items-center gap-2">
                          Action
                          {getSortIcon('action')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('admin')}
                      >
                        <div className="flex items-center gap-2">
                          Admin
                          {getSortIcon('admin')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {getSortIcon('timestamp')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedHistory.map((item, index) => {
                      const getItemLink = () => {
                        if (item.type === 'campaign' && item.item?._id) {
                          return `/campaigns/${item.item._id}`;
                        }
                        if (item.type === 'event' && item.item?._id) {
                          return `/events/${item.item._id}`;
                        }
                        if (item.type === 'kyc' && item.item?.user?._id) {
                          return `/admin/kyc?userId=${item.item.user._id}`;
                        }
                        if (item.type === 'report' && item.item?._id) {
                          return `/admin/reports?reportId=${item.item._id}`;
                        }
                        if (item.type === 'escrow' && item.item?._id) {
                          return `/admin/withdrawal-requests?escrowId=${item.item._id}`;
                        }
                        return null;
                      };

                      const getItemName = () => {
                        if (item.type === 'campaign') return item.item?.title || 'N/A';
                        if (item.type === 'event') return item.item?.title || 'N/A';
                        if (item.type === 'escrow') return item.item?.campaign?.title || 'N/A';
                        if (item.type === 'report') return item.item?.reported_type || 'N/A';
                        if (item.type === 'kyc') return item.item?.user?.username || item.item?.user?.fullname || 'N/A';
                        return 'N/A';
                      };

                      const getReason = () => {
                        if (item.action === 'rejected' || item.action === 'rejected') {
                          return item.item?.rejection_reason || item.item?.rejected_reason || item.item?.admin_rejection_reason || 'No reason provided';
                        }
                        return item.item?.approval_reason || 'N/A';
                      };

                      const link = getItemLink();
                      const reason = getReason();
                      const itemName = getItemName();

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{getTypeLabel(item.type)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(item.action)}`}>
                              {item.action}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {itemName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.admin?.username || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-xs truncate" title={reason}>
                              {reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {link ? (
                              <Link
                                href={link}
                                className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View
                              </Link>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

