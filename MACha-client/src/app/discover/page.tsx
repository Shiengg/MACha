'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import CampaignCard from "@/components/campaign/CampaignCard";
import { campaignService, Campaign, CategoryWithCount } from "@/services/campaign.service";
import { useSocket } from "@/contexts/SocketContext";
import { Heart, Home, Leaf, AlertCircle, Users, PawPrint, Stethoscope, GraduationCap, Baby, UserCircle, Trees } from 'lucide-react';

const categoryConfig: Record<string, { label: string; icon: any }> = {
  'children': { label: 'Trẻ em', icon: Baby },
  'elderly': { label: 'Người già', icon: UserCircle },
  'poverty': { label: 'Xóa nghèo', icon: Home },
  'disaster': { label: 'Thiên tai', icon: AlertCircle },
  'medical': { label: 'Y tế', icon: Stethoscope },
  'education': { label: 'Giáo dục', icon: GraduationCap },
  'disability': { label: 'Người khuyết tật', icon: Users },
  'animal': { label: 'Động vật', icon: PawPrint },
  'environment': { label: 'Môi trường', icon: Trees },
  'community': { label: 'Cộng đồng', icon: Users },
  'other': { label: 'Khác', icon: Heart },
};

function DiscoverContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string; icon: any; count: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  // Helper function to check if campaign is still valid (active and not expired)
  const isCampaignValid = (campaign: Campaign): boolean => {
    // Must be active
    if (campaign.status !== 'active') return false;
    
    // If no end_date, consider it as unlimited (still valid)
    if (!campaign.end_date) return true;
    
    // Check if end_date is in the future
    const endDate = new Date(campaign.end_date);
    const now = new Date();
    return endDate > now;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredCampaigns(campaigns);
    } else {
      const filtered = campaigns.filter(c => c.category === selectedCategory);
      setFilteredCampaigns(filtered);
    }
  }, [selectedCategory, campaigns]);

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
                return updatedCampaign;
              }
              return c;
            }).filter(c => isCampaignValid(c)); // Remove if no longer active or expired
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

    socket.on('campaign:created', handleCampaignCreated);
    socket.on('campaign:updated', handleCampaignUpdated);
    socket.on('donation:status_changed', handleDonationStatusChanged);
    socket.on('donation:updated', handleDonationUpdated);

    return () => {
      socket.off('campaign:created', handleCampaignCreated);
      socket.off('campaign:updated', handleCampaignUpdated);
      socket.off('donation:status_changed', handleDonationStatusChanged);
      socket.off('donation:updated', handleDonationUpdated);
    };
  }, [socket, isConnected]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load campaigns and categories in parallel
      const [campaignsData, categoriesData] = await Promise.all([
        campaignService.getAllCampaigns(),
        campaignService.getActiveCategories()
      ]);
      
      // Only show active campaigns that haven't expired
      const validCampaigns = campaignsData.filter(c => isCampaignValid(c));
      setCampaigns(validCampaigns);
      setFilteredCampaigns(validCampaigns);
      
      // Map categories with config - count only valid campaigns per category
      const mappedCategories = [
        { id: 'all', label: 'Tất cả', icon: Heart, count: validCampaigns.length },
        ...categoriesData.map((cat: CategoryWithCount) => {
          const categoryCampaigns = validCampaigns.filter(c => c.category === cat.category);
          return {
            id: cat.category,
            label: categoryConfig[cat.category]?.label || cat.category,
            icon: categoryConfig[cat.category]?.icon || Heart,
            count: categoryCampaigns.length
          };
        })
      ];
      
      setCategories(mappedCategories);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[400px] bg-gradient-to-br from-orange-500 via-orange-400 to-teal-400 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/charity_signup 1.png)',
            backgroundBlendMode: 'overlay',
            opacity: 0.3
          }}
        ></div>
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              Chung tay vì cộng đồng
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
              Mỗi đóng góp của bạn đều tạo nên sự khác biệt lớn lao cho những người cần giúp đỡ
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Chiến dịch gây quỹ nổi bật
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-orange-500 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-500 hover:text-orange-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Không tìm thấy chiến dịch
            </h3>
            <p className="text-gray-600">
              Hiện tại chưa có chiến dịch nào trong danh mục này
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-gray-600">
              Tìm thấy <span className="font-bold text-gray-800">{filteredCampaigns.length}</span> chiến dịch
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard key={campaign._id} campaign={campaign} showCreator={true} />
              ))}
            </div>
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

