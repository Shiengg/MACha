'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import CampaignCard from "@/components/campaign/CampaignCard";
import { campaignService, Campaign, CategoryWithCount } from "@/services/campaign.service";
import { useSocket } from "@/contexts/SocketContext";
import { Heart, Home, Leaf, AlertCircle, Users, PawPrint, Stethoscope, GraduationCap, Baby, UserCircle, Trees, ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_DISCOVER_STATUS, FILTER_STATUS_ALL, CAMPAIGN_STATUS } from "@/constants/campaign";

const categoryConfig: Record<string, { label: string; icon: any }> = {
  'children': { label: 'Trẻ em', icon: Baby },
  'elderly': { label: 'Người già', icon: UserCircle },
  'poverty': { label: 'Xóa nghèo', icon: Home },
  'disaster': { label: 'Thiên tai', icon: AlertCircle },
  'medical': { label: 'Y tế', icon: Stethoscope },
  'hardship': { label: 'Hoàn cảnh khó khăn', icon: Home },
  'education': { label: 'Giáo dục', icon: GraduationCap },
  'disability': { label: 'Người khuyết tật', icon: Users },
  'animal': { label: 'Động vật', icon: PawPrint },
  'environment': { label: 'Môi trường', icon: Trees },
  'community': { label: 'Cộng đồng', icon: Users },
  'other': { label: 'Khác', icon: Heart },
};

// Status filter options for Discover page
const STATUS_FILTER_OPTIONS = [
  { value: CAMPAIGN_STATUS.ACTIVE, label: 'Đang kêu gọi' },
  { value: CAMPAIGN_STATUS.PENDING, label: 'Đang chờ duyệt' },
  { value: CAMPAIGN_STATUS.COMPLETED, label: 'Hoàn tất' },
  { value: FILTER_STATUS_ALL, label: 'Tất cả' }
];

function DiscoverContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string; icon: any; count: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(DEFAULT_DISCOVER_STATUS);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1); // 1-based for UI
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { socket, isConnected } = useSocket();
  const limit = 20;

  const loadData = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      
      if (selectedCategory === 'all') {
        // For "all" category, use paginated API with status filter
        const apiPage = page - 1;
        // Pass status filter to API (default to ACTIVE if not set, or null for ALL)
        const statusFilter = selectedStatus === FILTER_STATUS_ALL ? null : selectedStatus;
        const result = await campaignService.getAllCampaigns(apiPage, limit, statusFilter || undefined);
        
        // If status filter is active, campaigns are already filtered by backend
        // No need to filter again on frontend
        setCampaigns(result.campaigns);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
      } else {
        // For specific category, load all campaigns of that category
        const allCategoryCampaigns = await campaignService.getCampaignsByCategory(selectedCategory);
        
        // Filter by status if not ALL
        let filteredCampaigns = allCategoryCampaigns;
        if (selectedStatus !== FILTER_STATUS_ALL) {
          filteredCampaigns = allCategoryCampaigns.filter(c => c.status === selectedStatus);
        }
        
        // Calculate pagination for client-side
        const totalValid = filteredCampaigns.length;
        const totalPagesForCategory = Math.ceil(totalValid / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);
        
        setCampaigns(paginatedCampaigns);
        setTotal(totalValid);
        setTotalPages(totalPagesForCategory);
        setCurrentPage(page);
      }
      
      // Load categories only on initial load (when page is 1)
      if (page === 1) {
        // Get total count for "all" category
        const allCampaignsResult = await campaignService.getAllCampaigns(0, 1);
        const allCampaignsTotal = allCampaignsResult.total;
        
        // Get count for each category from API (if available)
        let categoriesData: CategoryWithCount[] = [];
        try {
          categoriesData = await campaignService.getActiveCategories();
        } catch (error) {
          console.warn('Failed to load category counts:', error);
        }
        
        // Create a map of category counts from API
        const categoryCountMap = new Map<string, number>();
        categoriesData.forEach((cat: CategoryWithCount) => {
          categoryCountMap.set(cat.category, cat.count);
        });
        
        // Build categories from config (all categories), merge with counts from API
        const mappedCategories = [
          { id: 'all', label: 'Tất cả', icon: Heart, count: allCampaignsTotal },
          ...Object.entries(categoryConfig).map(([categoryId, config]) => {
            return {
              id: categoryId,
              label: config.label,
              icon: config.icon,
              count: categoryCountMap.get(categoryId) || 0 // Use count from API, or 0 if not found
            };
          })
        ];
        
        setCategories(mappedCategories);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [limit, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  useEffect(() => {
    // Reset pagination when category or status changes
    setCurrentPage(1);
    loadData(1);
  }, [selectedCategory, selectedStatus, loadData]);

  // Campaigns are already filtered by category in loadData, so no need to filter again
  const filteredCampaigns = campaigns;

  // Listen for campaign updates via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCampaignCreated = (event: any) => {
      // For new campaigns, we'd need full campaign data, so skip for now
      // User can refresh to see new campaigns
      // Only add if it's active and valid (will be checked when full data is loaded)
    };

    const handleCampaignUpdated = (event: any) => {
      if (event.campaignId) {
        setCampaigns(prev => {
          const index = prev.findIndex(c => String(c._id) === String(event.campaignId));
          if (index === -1) {
            // Campaign not in list, don't add from update event
            return prev;
          } else {
            // Update existing campaign with new data
            return prev.map(c => {
              if (String(c._id) === String(event.campaignId)) {
                const updatedCampaign = {
                  ...c,
                  current_amount: event.current_amount !== undefined ? event.current_amount : c.current_amount,
                  goal_amount: event.goal_amount !== undefined ? event.goal_amount : c.goal_amount,
                  status: event.status !== undefined ? event.status : c.status,
                  title: event.title !== undefined ? event.title : c.title,
                  category: event.category !== undefined ? event.category : c.category,
                  completed_donations_count: event.completed_donations_count !== undefined ? event.completed_donations_count : c.completed_donations_count,
                  end_date: event.end_date !== undefined ? event.end_date : c.end_date
                };
                // If status filter is active, remove campaigns that don't match
                if (selectedStatus !== FILTER_STATUS_ALL && updatedCampaign.status !== selectedStatus) {
                  return null; // Mark for removal
                }
                return updatedCampaign;
              }
              return c;
            }).filter(c => c !== null); // Remove null entries
          }
        });
      }
    };

    // Update campaign current_amount when donation is completed/updated
    const handleDonationStatusChanged = (event: any) => {
      if (event.campaignId && event.campaign?.current_amount !== undefined) {
        setCampaigns(prev => {
          const index = prev.findIndex(c => String(c._id) === String(event.campaignId));
          if (index === -1) return prev;
          
          return prev.map(c => {
            if (String(c._id) === String(event.campaignId)) {
              return {
                ...c,
                current_amount: event.campaign.current_amount,
                completed_donations_count: event.campaign.completed_donations_count !== undefined ? event.campaign.completed_donations_count : c.completed_donations_count
              };
            }
            return c;
          });
        });
      }
    };

    const handleDonationUpdated = (event: any) => {
      if (event.campaignId && event.campaign?.current_amount !== undefined) {
        setCampaigns(prev => {
          const index = prev.findIndex(c => String(c._id) === String(event.campaignId));
          if (index === -1) return prev;
          
          return prev.map(c => {
            if (String(c._id) === String(event.campaignId)) {
              return {
                ...c,
                current_amount: event.campaign.current_amount,
                completed_donations_count: event.campaign.completed_donations_count !== undefined ? event.campaign.completed_donations_count : c.completed_donations_count
              };
            }
            return c;
          });
        });
      }
    };

    const handleCampaignCancelled = (event: any) => {
      if (event.campaignId) {
        setCampaigns(prev => prev.filter(c => String(c._id) !== String(event.campaignId)));
      }
    };

    socket.on('campaign:created', handleCampaignCreated);
    socket.on('campaign:updated', handleCampaignUpdated);
    socket.on('campaign:cancelled', handleCampaignCancelled);
    socket.on('donation:status_changed', handleDonationStatusChanged);
    socket.on('donation:updated', handleDonationUpdated);

    return () => {
      socket.off('campaign:created', handleCampaignCreated);
      socket.off('campaign:updated', handleCampaignUpdated);
      socket.off('campaign:cancelled', handleCampaignCancelled);
      socket.off('donation:status_changed', handleDonationStatusChanged);
      socket.off('donation:updated', handleDonationUpdated);
    };
  }, [socket, isConnected]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[250px] sm:h-[300px] md:h-[400px] bg-gradient-to-br from-orange-500 via-orange-400 to-teal-400 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/charity_signup 1.png)',
            backgroundBlendMode: 'overlay',
            opacity: 0.3
          }}
        ></div>
        <div className="relative h-full flex items-center justify-center text-center px-4 sm:px-6">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-3 md:mb-4 drop-shadow-lg">
              Chung tay vì cộng đồng
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 max-w-2xl mx-auto drop-shadow px-2">
              Mỗi đóng góp của bạn đều tạo nên sự khác biệt lớn lao cho những người cần giúp đỡ
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
              Chiến dịch gây quỹ nổi bật
            </h2>
            
            {/* Status Filter Dropdown */}
            <div className="w-full sm:w-auto">
              <label htmlFor="status-filter" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Trạng thái:
              </label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base font-medium text-gray-700 bg-white hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer"
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2 -mx-3 sm:mx-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:justify-center min-w-max sm:min-w-0 px-3 sm:px-0">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full text-sm sm:text-base font-medium transition-all whitespace-nowrap ${
                        selectedCategory === category.id
                          ? 'bg-orange-500 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-500 hover:text-orange-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              Không tìm thấy chiến dịch
            </h3>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              Hiện tại chưa có chiến dịch nào trong danh mục này
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-600">
              {selectedCategory === 'all' ? (
                <>Tìm thấy <span className="font-bold text-gray-800">{filteredCampaigns.length}</span> chiến dịch</>
              ) : (
                <>Tìm thấy <span className="font-bold text-gray-800">{filteredCampaigns.length}</span> chiến dịch trong danh mục này</>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard 
                  key={campaign._id} 
                  campaign={campaign} 
                  showCreator={true}
                  showStatusBadge={true}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8 flex-wrap">
                {/* Current Page / Total Pages */}
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-gray-700 text-sm sm:text-base font-medium">
                  {currentPage}/{totalPages}
                </div>
                
                {/* Previous Button */}
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      loadData(currentPage - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === 1 || loading}
                  className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-xs sm:text-sm md:text-base font-medium transition-all flex items-center gap-1 ${
                    currentPage === 1 || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-orange-500 hover:text-orange-500'
                  }`}
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Trang trước</span>
                  <span className="sm:hidden">Trước</span>
                </button>
                
                {/* Page Numbers - Hide on very small screens */}
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                  {getPageNumbers().map((pageNum, index) => (
                    pageNum === '...' ? (
                      <button
                        key={`ellipsis-${index}`}
                        disabled
                        className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-300 bg-white text-gray-400 cursor-default text-sm sm:text-base"
                      >
                        ...
                      </button>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => {
                          if (typeof pageNum === 'number') {
                            loadData(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        disabled={loading}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border text-sm sm:text-base font-medium transition-all ${
                          pageNum === currentPage
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-orange-500 hover:text-orange-500'
                        } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}
                </div>
                
                {/* Mobile: Show only current page */}
                <div className="sm:hidden">
                  <div className="px-3 py-1.5 rounded-lg border border-orange-500 bg-orange-500 text-white text-sm font-medium">
                    {currentPage}
                  </div>
                </div>
                
                {/* Next Button */}
                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      loadData(currentPage + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === totalPages || loading}
                  className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-xs sm:text-sm md:text-base font-medium transition-all flex items-center gap-1 ${
                    currentPage === totalPages || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-orange-500 hover:text-orange-500'
                  }`}
                >
                  <span className="hidden sm:inline">Trang sau</span>
                  <span className="sm:hidden">Sau</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <ProtectedRoute>
      <DiscoverContent />
    </ProtectedRoute>
  );
}

