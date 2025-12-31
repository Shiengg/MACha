'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { campaignService, Campaign } from '@/services/campaign.service';
import CampaignCard from '@/components/campaign/CampaignCard';

const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
        const billions = num / 1000000000;
        return billions % 1 === 0 ? `${billions.toFixed(0)} tỷ` : `${billions.toFixed(1)} tỷ`;
    }
    if (num >= 1000000) {
        const millions = num / 1000000;
        return millions % 1 === 0 ? `${millions.toFixed(0)} triệu` : `${millions.toFixed(1)} triệu`;
    }
    if (num >= 10000) {
        return `${(num / 1000).toFixed(0)} ngàn`;
    }
    if (num >= 1000) {
        const thousands = num / 1000;
        return thousands % 1 === 0 ? `${thousands.toFixed(0)} ngàn` : `${thousands.toFixed(1)} ngàn`;
    }
    return num.toString();
};

export default function HashtagPage() {
    const params = useParams();
    const hashtagName = params?.hashtagName as string;
    const [decodedHashtag, setDecodedHashtag] = useState('');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hashtagName) {
            const decoded = decodeURIComponent(hashtagName);
            setDecodedHashtag(decoded);
            fetchCampaignsByHashtag(decoded);
        }
    }, [hashtagName]);

    const fetchCampaignsByHashtag = async (hashtag: string) => {
        try {
            setLoading(true);
            setError(null);
            const normalizedHashtag = hashtag.toLowerCase().trim();
            const results = await campaignService.searchCampaignsByHashtag(normalizedHashtag);
            setCampaigns(results);
        } catch (err: any) {
            console.error('Error fetching campaigns by hashtag:', err);
            setError('Không thể tải chiến dịch. Vui lòng thử lại sau.');
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const campaignsCount = campaigns.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hashtag Header - Full width, sát header */}
            <div className="w-full bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                #{decodedHashtag}
                            </h1>
                            {loading ? (
                                <p className="text-md text-gray-400">Đang tải...</p>
                            ) : (
                                <p className="text-md text-gray-500">
                                    {formatNumber(campaignsCount)} nội dung liên quan
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Content area */}
            <div className="max-w-4xl mx-auto px-6 py-6">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        <p className="mt-4 text-gray-500">Đang tải...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : campaigns.length > 0 ? (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((campaign) => (
                                <CampaignCard key={campaign._id} campaign={campaign} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>Không tìm thấy chiến dịch nào với hashtag này</p>
                    </div>
                )}
            </div>
        </div>
    );
}

