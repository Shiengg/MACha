'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { campaignService, Campaign } from '@/services/campaign.service';
import { searchPostsByTitle, Post } from '@/services/post.service';
import CampaignCard from '@/components/campaign/CampaignCard';
import PostCard from '@/components/shared/PostCard';

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

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [decodedQuery, setDecodedQuery] = useState('');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);

    useEffect(() => {
        if (query) {
            const decoded = decodeURIComponent(query);
            setDecodedQuery(decoded);
            setPosts([]);
            fetchCampaignsByTitle(decoded);
            fetchPostsByTitle(decoded);
        } else {
            setDecodedQuery('');
            setCampaigns([]);
            setPosts([]);
            setLoading(false);
            setPostsLoading(false);
            setError(null);
            setPostsError(null);
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
            setError('Không thể tải kết quả tìm kiếm chiến dịch. Vui lòng thử lại sau.');
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPostsByTitle = async (searchTerm: string) => {
        try {
            setPostsLoading(true);
            setPostsError(null);
            // Normalize to lowercase for search
            const normalizedSearch = searchTerm.toLowerCase().trim();
            const result = await searchPostsByTitle(normalizedSearch, 50);
            setPosts(result.posts || []);
        } catch (err: any) {
            console.error('Error fetching posts by title:', err);
            setPostsError('Không thể tải kết quả tìm kiếm bài viết. Vui lòng thử lại sau.');
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const campaignsCount = campaigns.length;
    const postsCount = posts.length;
    const totalCount = campaignsCount + postsCount;

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
                            {loading || postsLoading ? (
                                <p className="text-md text-gray-400">Đang tải...</p>
                            ) : decodedQuery ? (
                                <p className="text-md text-gray-500">
                                    Tìm thấy {formatNumber(totalCount)} kết quả cho: <span className="font-semibold">"{decodedQuery}"</span>
                                </p>
                            ) : (
                                <p className="text-md text-gray-400">Nhập từ khóa để tìm kiếm</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Content area */}
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
                {/* Campaigns Section */}
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
                        <p>Nhập từ khóa để tìm kiếm</p>
                    </div>
                ) : campaigns.length > 0 ? (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Danh sách chiến dịch</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((campaign) => (
                                <CampaignCard key={campaign._id} campaign={campaign} />
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Posts Section */}
                {decodedQuery && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bài viết</h2>
                        {postsLoading && posts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                <p className="mt-4 text-gray-500">Đang tải bài viết...</p>
                            </div>
                        ) : postsError ? (
                            <div className="text-center py-12">
                                <p className="text-red-500">{postsError}</p>
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <PostCard key={post._id} post={post} />
                                ))}
                            </div>
                        ) : !postsLoading && (
                            <div className="text-center py-12 text-gray-500">
                                <p>Không tìm thấy bài viết nào với từ khóa "{decodedQuery}"</p>
                            </div>
                        )}
                    </div>
                )}

                {/* No content message - only show when everything is loaded and empty */}
                {!loading && !postsLoading && decodedQuery && campaigns.length === 0 && posts.length === 0 && !error && !postsError && (
                    <div className="text-center py-12 text-gray-500">
                        <p>Không tìm thấy nội dung nào với từ khóa "{decodedQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-500">Đang tải...</p>
                </div>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}

