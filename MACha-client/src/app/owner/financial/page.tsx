'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerContentWrapper from '@/components/owner/OwnerContentWrapper';
import { ownerService, FinancialOverview } from '@/services/owner.service';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';

export default function OwnerFinancial() {
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await ownerService.getFinancialOverview({ 
        startDate: startDate || undefined, 
        endDate: endDate || undefined 
      });
      setData(result);
    } catch (error) {
      console.error('Error fetching financial overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = () => {
    if (!data) return 1;
    const maxDonated = (data.donations.by_month || []).length > 0
      ? Math.max(...(data.donations.by_month || []).map(d => d.total), 0)
      : 0;
    const maxReleased = (data.escrow.by_month || []).length > 0
      ? Math.max(...(data.escrow.by_month || []).map(r => r.total), 0)
      : 0;
    return Math.max(maxDonated, maxReleased, 1);
  };

  const maxValue = getMaxValue();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OwnerSidebar />
        <OwnerHeader />
        <OwnerContentWrapper>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Đang tải...</p>
            </div>
          </div>
        </OwnerContentWrapper>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      <OwnerContentWrapper>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Tài chính tổng quan</h1>
              <p className="text-sm sm:text-base text-gray-600">Tổng quan tài chính hệ thống</p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {(['day', 'week', 'month', 'year'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      timeFilter === filter
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {filter === 'day' ? 'Ngày' : filter === 'week' ? 'Tuần' : filter === 'month' ? 'Tháng' : 'Năm'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg flex-1 sm:flex-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg flex-1 sm:flex-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Tổng quyên góp</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {Math.floor(data.donations.total / 1000000)}M VND
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{data.donations.count} lượt quyên góp</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              </div>
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Tổng đã giải ngân</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {Math.floor(data.escrow.total_released / 1000000)}M VND
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{data.escrow.released_count} lượt giải ngân</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              </div>
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Tổng đang chờ</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {Math.floor(data.escrow.pending_amount / 1000000)}M VND
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{data.escrow.pending_count} đang chờ</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                {data.net_flow >= 0 ? (
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                )}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Số dư ròng</div>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${data.net_flow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {Math.floor(data.net_flow / 1000000)}M VND
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Tiền vào theo tháng (Line Chart)</h3>
              <div className="h-48 sm:h-64 relative overflow-x-auto">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {(data.donations.by_month || []).map((month, index, array) => {
                    const x = 50 + (index * (350 / Math.max(array.length - 1, 1)));
                    const y = 180 - ((month.total / maxValue) * 150);
                    const nextX = index < array.length - 1 ? 50 + ((index + 1) * (350 / Math.max(array.length - 1, 1))) : x;
                    const nextItem = array[index + 1];
                    const nextY = nextItem ? 180 - ((nextItem.total / maxValue) * 150) : y;
                    
                    return (
                      <g key={`donated-${index}`}>
                        {index < array.length - 1 && (
                          <line
                            x1={x}
                            y1={y}
                            x2={nextX}
                            y2={nextY}
                            stroke="#10b981"
                            strokeWidth="3"
                          />
                        )}
                        <circle cx={x} cy={y} r="5" fill="#10b981" />
                        <text x={x} y={195} textAnchor="middle" className="text-xs fill-gray-600">
                          {month._id.month}/{month._id.year}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Tiền ra theo tháng (Line Chart)</h3>
              <div className="h-48 sm:h-64 relative overflow-x-auto">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  {(data.escrow.by_month || []).map((month, index, array) => {
                    const x = 50 + (index * (350 / Math.max(array.length - 1, 1)));
                    const y = 180 - ((month.total / maxValue) * 150);
                    const nextX = index < array.length - 1 ? 50 + ((index + 1) * (350 / Math.max(array.length - 1, 1))) : x;
                    const nextItem = array[index + 1];
                    const nextY = nextItem ? 180 - ((nextItem.total / maxValue) * 150) : y;
                    
                    return (
                      <g key={`released-${index}`}>
                        {index < array.length - 1 && (
                          <line
                            x1={x}
                            y1={y}
                            x2={nextX}
                            y2={nextY}
                            stroke="#ef4444"
                            strokeWidth="3"
                          />
                        )}
                        <circle cx={x} cy={y} r="5" fill="#ef4444" />
                        <text x={x} y={195} textAnchor="middle" className="text-xs fill-gray-600">
                          {month._id.month}/{month._id.year}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">So sánh vào/ra (Bar Chart)</h3>
            <div className="h-48 sm:h-64 relative overflow-x-auto">
              <svg viewBox="0 0 400 200" className="w-full h-full">
                {(data.donations.by_month || []).slice(0, 6).map((month, index) => {
                  const x = 50 + (index * 60);
                  const barWidth = 25;
                  const donatedHeight = (month.total / maxValue) * 150;
                  const releasedMonth = data.escrow.by_month?.find(r => 
                    r._id.year === month._id.year && r._id.month === month._id.month
                  );
                  const releasedHeight = releasedMonth ? (releasedMonth.total / maxValue) * 150 : 0;
                  
                  return (
                    <g key={`bar-${index}`}>
                      <rect
                        x={x - barWidth}
                        y={180 - donatedHeight}
                        width={barWidth}
                        height={donatedHeight}
                        fill="#10b981"
                        opacity="0.8"
                      />
                      <rect
                        x={x}
                        y={180 - releasedHeight}
                        width={barWidth}
                        height={releasedHeight}
                        fill="#ef4444"
                        opacity="0.8"
                      />
                      <text x={x} y={195} textAnchor="middle" className="text-xs fill-gray-600">
                        {month._id.month}/{month._id.year}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="absolute top-2 right-2 flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Quyên góp</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Giải ngân</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quyên góp theo phương thức</h3>
              <div className="space-y-3">
                {data.donations.by_method.map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 capitalize">{method._id || 'Unknown'}</span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{method.total.toLocaleString('vi-VN')} VND</div>
                      <div className="text-sm text-gray-500">{method.count} lượt quyên góp</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quyên góp theo tháng</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.donations.by_month.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">
                      {month._id.month}/{month._id.year}
                    </span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{month.total.toLocaleString('vi-VN')} VND</div>
                      <div className="text-sm text-gray-500">{month.count} lượt quyên góp</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </OwnerContentWrapper>
    </div>
  );
}
