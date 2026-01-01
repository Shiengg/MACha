'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { campaignService, Campaign } from '@/services/campaign.service';
import { getPostsByHashtag, Post, PaginationInfo } from '@/services/post.service';
import CampaignCard from '@/components/campaign/CampaignCard';
import PostCard from '@/components/shared/PostCard';

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
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const limit = 50;

    useEffect(() => {
        if (hashtagName) {
            const decoded = decodeURIComponent(hashtagName);
            setDecodedHashtag(decoded);
            setCurrentPage(1);
            setPosts([]);
            fetchCampaignsByHashtag(decoded);
            fetchPostsByHashtag(decoded, 1);
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

    const fetchPostsByHashtag = async (hashtag: string, page: number) => {
        try {
            setPostsLoading(true);
            setPostsError(null);
            const normalizedHashtag = hashtag.toLowerCase().trim();
            const result = await getPostsByHashtag(normalizedHashtag, page, limit);
            
            if (page === 1) {
                setPosts(result.posts);
            } else {
                setPosts(prev => [...prev, ...result.posts]);
            }
            
            if (result.pagination) {
                setPagination(result.pagination);
            }
        } catch (err: any) {
            console.error('Error fetching posts by hashtag:', err);
            setPostsError('Không thể tải bài viết. Vui lòng thử lại sau.');
        } finally {
            setPostsLoading(false);
        }
    };

    const loadMorePosts = () => {
        if (pagination && pagination.hasNext && !postsLoading) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            fetchPostsByHashtag(decodedHashtag, nextPage);
        }
    };

    const campaignsCount = campaigns.length;
    const totalContentCount = campaignsCount + (pagination?.total || 0);

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
                                    {formatNumber(totalContentCount)} nội dung liên quan
                                </p>
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
                ) : campaigns.length > 0 ? (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Chiến dịch</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((campaign) => (
                                <CampaignCard key={campaign._id} campaign={campaign} />
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Posts Section */}
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
                        <div>
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <PostCard key={post._id} post={post} />
                                ))}
                            </div>
                            {pagination && pagination.hasNext && (
                                <div className="text-center mt-6">
                                    <button
                                        onClick={loadMorePosts}
                                        disabled={postsLoading}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {postsLoading ? 'Đang tải...' : 'Xem thêm bài viết'}
                                    </button>
                                </div>
                            )}
                            {pagination && !pagination.hasNext && posts.length > 0 && (
                                <div className="text-center mt-6 text-gray-500">
                                    <p>Đã hiển thị tất cả bài viết liên quan</p>
                                </div>
                            )}
                        </div>
                    ) : !postsLoading && !postsError && (
                        <div className="text-center py-12 text-gray-500">
                            <p>Không tìm thấy bài viết nào với hashtag này</p>
                        </div>
                    )}
                </div>

                {/* No content message - only show when everything is loaded and empty */}
                {!loading && !postsLoading && campaigns.length === 0 && posts.length === 0 && !error && !postsError && (
                    <div className="text-center py-12 text-gray-500">
                        <p>Không tìm thấy nội dung nào với hashtag này</p>
                    </div>
                )}
            </div>
        </div>
    );
}

