'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import CampaignCard from "@/components/campaign/CampaignCard";
import { campaignService, Campaign, CategoryWithCount } from "@/services/campaign.service";
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load campaigns and categories in parallel
      const [campaignsData, categoriesData] = await Promise.all([
        campaignService.getAllCampaigns(),
        campaignService.getActiveCategories()
      ]);
      
      // Only show active campaigns
      const activeCampaigns = campaignsData.filter(c => c.status === 'active');
      setCampaigns(activeCampaigns);
      setFilteredCampaigns(activeCampaigns);
      
      // Map categories with config
      const mappedCategories = [
        { id: 'all', label: 'Tất cả', icon: Heart, count: activeCampaigns.length },
        ...categoriesData.map((cat: CategoryWithCount) => ({
          id: cat.category,
          label: categoryConfig[cat.category]?.label || cat.category,
          icon: categoryConfig[cat.category]?.icon || Heart,
          count: cat.count
        }))
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

