'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { campaignService, Campaign } from '@/services/campaign.service';
import CampaignCard from '@/components/campaign/CampaignCard';

// Format number with K/M/B suffix
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

export default function SearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [decodedQuery, setDecodedQuery] = useState('');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (query) {
            const decoded = decodeURIComponent(query);
            setDecodedQuery(decoded);
            fetchCampaignsByTitle(decoded);
        } else {
            setDecodedQuery('');
            setCampaigns([]);
            setLoading(false);
            setError(null);
        }
    }, [query]);

    const fetchCampaignsByTitle = async (searchTerm: string) => {
        try {
            setLoading(true);
            setError(null);
            // Normalize to lowercase for search
            const normalizedSearch = searchTerm.toLowerCase().trim();
            const results = await campaignService.searchCampaignsByTitle(normalizedSearch);
            setCampaigns(results);
        } catch (err: any) {
            console.error('Error fetching campaigns by title:', err);
            setError('Không thể tải kết quả tìm kiếm. Vui lòng thử lại sau.');
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const campaignsCount = campaigns.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Search Header - Full width, sát header */}
            <div className="w-full bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                Kết quả tìm kiếm
                            </h1>
                            {loading ? (
                                <p className="text-md text-gray-400">Đang tải...</p>
                            ) : decodedQuery ? (
                                <p className="text-md text-gray-500">
                                    Tìm thấy {formatNumber(campaignsCount)} kết quả cho: <span className="font-semibold">"{decodedQuery}"</span>
                                </p>
                            ) : (
                                <p className="text-md text-gray-400">Nhập từ khóa để tìm kiếm</p>
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
                ) : !decodedQuery ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>Nhập từ khóa để tìm kiếm chiến dịch</p>
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
                        <p>Không tìm thấy chiến dịch nào với từ khóa "{decodedQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}

