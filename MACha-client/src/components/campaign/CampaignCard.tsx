'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Share2 } from 'lucide-react';
import { donationService, Donation } from '@/services/donation.service';
import { Campaign } from '@/services/campaign.service';



interface CampaignCardProps {
  campaign: Campaign;
  showCreator?: boolean;
  onClick?: (campaign: Campaign) => void;
  disableNavigation?: boolean;
}

export default function CampaignCard({ campaign, showCreator = false, onClick, disableNavigation = false }: CampaignCardProps) {
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const data = await donationService.getDonationsByCampaign(campaign._id);
        // Filter only completed donations and non-anonymous ones for display
        const completedDonations = data.filter(
          (donation: Donation) => 
            donation.payment_status === 'completed' && 
            !donation.is_anonymous
        );
        setDonations(completedDonations);
      } catch (err: any) {
        console.error('Failed to fetch donations:', err);
        setDonations([]);
      }
    };

    if (campaign._id) {
      fetchDonations();
    }
  }, [campaign._id]);

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'children': '👶',
      'elderly': '👴',
      'poverty': '🏚️',
      'disaster': '🆘',
      'medical': '🏥',
      'education': '📚',
      'disability': '♿',
      'animal': '🐾',
      'environment': '🌱',
      'community': '🤝',
      'other': '❤️',
    };
    return icons[category] || '❤️';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'children': 'Trẻ em',
      'elderly': 'Người già',
      'poverty': 'Người nghèo',
      'disaster': 'Thiên tai',
      'medical': 'Y tế',
      'education': 'Giáo dục',
      'disability': 'Người khuyết tật',
      'animal': 'Động vật',
      'environment': 'Môi trường',
      'community': 'Cộng đồng',
      'other': 'Khác',
    };
    return labels[category] || category;
  };

  const progressPercentage = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
  const daysLeft = campaign.end_date 
    ? Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const formatAmount = (amount: number) => {
    if (amount >= 1000000 && amount < 1000000000) {
      if (amount % 1000000 === 0) {
        return `${(amount / 1000000).toFixed(0)} triệu`;
      } else {
        return `${(amount / 1000000).toFixed(2)} triệu`;
      }
    }
    if (amount >= 1000000000 && amount < 1000000000000) {
      if (amount % 1000000000 === 0) {
        return `${(amount / 1000000000).toFixed(0)} tỷ`;
      } else {
        return `${(amount / 1000000000).toFixed(2)} tỷ`;
      }
    }
    if (amount >= 1000000000000) {
      if (amount % 1000000000000 === 0) {
        return `${(amount / 1000000000000).toFixed(0)} nghìn tỷ`;
      } else {
        return `${(amount / 1000000000000).toFixed(2)} nghìn tỷ`;
      }
    }
    return `${amount.toLocaleString('vi-VN')}`;
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Share functionality
    if (navigator.share) {
      navigator.share({
        title: campaign.title,
        text: campaign.description,
        url: `/campaigns/${campaign._id}`,
      });
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(campaign);
    } else if (!disableNavigation) {
      router.push(`/campaigns/${campaign._id}`);
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Campaign Banner Image */}
      <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-50 overflow-hidden">
        {campaign.banner_image ? (
          <img
            src={campaign.banner_image}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src="/images/charity_icon 1.png"
              alt="Campaign"
              className="w-32 h-32 object-contain"
            />
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          <span>{getCategoryIcon(campaign.category)}</span>
          <span>{getCategoryLabel(campaign.category)}</span>
        </div>

        {/* Donor Count Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          <span>❤️</span>
          <span>Còn {daysLeft > 0 ? daysLeft : 0} ngày</span>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3rem]">
          {campaign.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {campaign.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-teal-400 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div>
            <div className="text-orange-600 font-bold text-sm">
              {formatAmount(campaign.current_amount)}
            </div>
            <div className="text-gray-500 text-xs">Đạt được</div>
          </div>
          <div>
            <div className="text-gray-800 font-bold text-sm">
              {formatAmount(campaign.goal_amount)}
            </div>
            <div className="text-gray-500 text-xs">Mục tiêu</div>
          </div>
          <div>
            <div className="text-gray-800 font-bold text-sm">
              {donations.length}
            </div>
            <div className="text-gray-500 text-xs">Lượt ủng hộ</div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!disableNavigation) {
                router.push(`/campaigns/${campaign._id}`);
              }
            }}
          >
            Ủng hộ ngay
          </button>
          <button
            className="p-2 border border-gray-300 hover:border-gray-400 rounded-lg transition-all"
            onClick={handleShare}
            title="Chia sẻ"
          >
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

