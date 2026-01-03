'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, CampaignFinancial } from '@/services/owner.service';
import { DollarSign, TrendingUp, AlertCircle, Eye, Download, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function OwnerCampaignFinancials() {
  const [campaigns, setCampaigns] = useState<CampaignFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await ownerService.getCampaignFinancials({ page: currentPage, limit: 10 });
      setCampaigns(result.campaigns);
      setTotalPages(result.pagination.pages);
    } catch (error) {
      console.error('Error fetching campaign financials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Campaign Name', 'Creator', 'Goal Amount', 'Current Amount', 'Total Donated', 'Total Released', 'Pending', 'Remaining', 'Percentage Completed'].join(','),
      ...campaigns.map(c => [
        c.campaign.title,
        c.campaign.creator.username,
        c.campaign.goal_amount,
        c.campaign.current_amount,
        c.financials.total_donated,
        c.financials.total_released,
        c.financials.pending_releases,
        c.financials.remaining,
        ((c.financials.total_donated / c.campaign.goal_amount) * 100).toFixed(2) + '%'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-financials-${new Date().toISOString()}.csv`;
    a.click();
  };

  const filteredCampaigns = campaigns.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.campaign.title.toLowerCase().includes(query) ||
      item.campaign.creator.username.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tài chính Campaign</h1>
              <p className="text-gray-600">Chi tiết tài chính theo từng campaign</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
            >
              <Download className="w-5 h-5" />
              Export Data
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((item) => {
                const percentageCompleted = item.campaign.goal_amount > 0 
                  ? (item.financials.total_donated / item.campaign.goal_amount) * 100 
                  : 0;

                return (
                  <div key={item.campaign.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{item.campaign.title}</h3>
                          <Link 
                            href={`/campaigns/${item.campaign.id}`}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                        <p className="text-sm text-gray-500">by {item.campaign.creator.username}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-semibold text-gray-900">{percentageCompleted.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(percentageCompleted, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        item.campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.campaign.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Goal Amount</div>
                        <div className="text-lg font-bold text-blue-600">
                          {item.campaign.goal_amount.toLocaleString('vi-VN')} VND
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Total Donated</div>
                        <div className="text-lg font-bold text-green-600">
                          {item.financials.total_donated.toLocaleString('vi-VN')} VND
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.financials.donation_count} donations</div>
                      </div>

                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Total Released</div>
                        <div className="text-lg font-bold text-red-600">
                          {item.financials.total_released.toLocaleString('vi-VN')} VND
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.financials.release_count} releases</div>
                      </div>

                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Pending Releases</div>
                        <div className="text-lg font-bold text-yellow-600">
                          {item.financials.pending_releases.toLocaleString('vi-VN')} VND
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.financials.pending_release_count} pending</div>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Remaining</div>
                        <div className={`text-lg font-bold ${
                          item.financials.remaining >= 0 ? 'text-purple-600' : 'text-red-600'
                        }`}>
                          {item.financials.remaining.toLocaleString('vi-VN')} VND
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {percentageCompleted.toFixed(1)}% completed
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Link
                        href={`/campaigns/${item.campaign.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between mt-6">
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
