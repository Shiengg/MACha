'use client';

import { useRouter } from 'next/navigation';

interface Campaign {
  _id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  status: string;
  category: string;
  media_url?: string[];
  createdAt: string;
  end_date: string;
  creator?: {
    _id: string;
    username: string;
    avatar?: string;
  };
}

interface CampaignCardProps {
  campaign: Campaign;
  showCreator?: boolean;
}

export default function CampaignCard({ campaign, showCreator = false }: CampaignCardProps) {
  const router = useRouter();

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'education': '📚',
      'health': '🏥',
      'environment': '🌱',
      'disaster': '🆘',
      'community': '🤝',
      'animal': '🐾',
    };
    return icons[category] || '❤️';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium">Đang hoạt động</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs font-medium">Chờ duyệt</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs font-medium">Hoàn thành</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-900/30 text-gray-400 rounded text-xs font-medium">Đã hủy</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-medium">Từ chối</span>;
      default:
        return null;
    }
  };

  const progressPercentage = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
  const daysLeft = Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      className="bg-[#1a1f2e] rounded-xl border border-gray-700 overflow-hidden hover:border-blue-600 transition-all cursor-pointer group"
      onClick={() => router.push(`/campaigns/${campaign._id}`)}
    >
      {/* Campaign Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden">
        {campaign.media_url && campaign.media_url[0] ? (
          <img
            src={campaign.media_url[0]}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {getCategoryIcon(campaign.category)}
          </div>
        )}
        <div className="absolute top-3 right-3">
          {getStatusBadge(campaign.status)}
        </div>
        {showCreator && campaign.creator && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
            {campaign.creator.avatar ? (
              <img
                src={campaign.creator.avatar}
                alt={campaign.creator.username}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {campaign.creator.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-white text-sm font-medium">@{campaign.creator.username}</span>
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {campaign.title}
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {campaign.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Đã quyên góp</span>
            <span className="text-white font-medium">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="text-white font-semibold">
              {campaign.current_amount.toLocaleString('vi-VN')} VND
            </div>
            <div className="text-gray-400">
              / {campaign.goal_amount.toLocaleString('vi-VN')} VND
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400">
              {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'}
            </div>
            <div className="text-white font-medium text-xs">
              {new Date(campaign.end_date).toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

