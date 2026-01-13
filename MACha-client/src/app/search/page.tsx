'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { campaignService, Campaign } from '@/services/campaign.service';
import { searchPostsByTitle, getPostsByHashtag, Post } from '@/services/post.service';
import { useUserSearch } from '@/hooks/useUserSearch';
import CampaignCard from '@/components/campaign/CampaignCard';
import PostCard from '@/components/shared/PostCard';
import UserSearchResult from '@/components/shared/UserSearchResult';

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
    
    // User search hook - lưu history để track user searches
    const {
        query: userQuery,
        setQuery: setUserQuery,
        users,
        loading: usersLoading,
        error: usersError,
    } = useUserSearch({
        debounceMs: 400,
        minQueryLength: 1,
        limit: 50,
        autoSaveHistory: true, // Lưu USER_SEARCH history
    });

    useEffect(() => {
        if (query) {
            const decoded = decodeURIComponent(query);
            setDecodedQuery(decoded);
            setPosts([]);
            
            // Sync user search query
            setUserQuery(decoded);
            
            // Check if query is a hashtag (starts with #)
            if (decoded.startsWith('#')) {
                const hashtagName = decoded.substring(1).trim().toLowerCase();
                if (hashtagName) {
                    // Search campaigns by hashtag
                    fetchCampaignsByHashtag(hashtagName);
                    // Search posts by hashtag
                    fetchPostsByHashtag(hashtagName);
                    return;
                }
            }
            
            // Search by title for both campaigns and posts
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
            setUserQuery('');
        }
    }, [query, setUserQuery]);

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

    const fetchCampaignsByHashtag = async (hashtagName: string) => {
        try {
            setLoading(true);
            setError(null);
            const results = await campaignService.searchCampaignsByHashtag(hashtagName);
            setCampaigns(results);
        } catch (err: any) {
            console.error('Error fetching campaigns by hashtag:', err);
            setError('Không thể tải kết quả tìm kiếm chiến dịch theo hashtag. Vui lòng thử lại sau.');
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

    const fetchPostsByHashtag = async (hashtagName: string) => {
        try {
            setPostsLoading(true);
            setPostsError(null);
            const normalizedHashtag = hashtagName.toLowerCase().trim();
            const result = await getPostsByHashtag(normalizedHashtag, 1, 50);
            setPosts(result.posts || []);
        } catch (err: any) {
            console.error('Error fetching posts by hashtag:', err);
            setPostsError('Không thể tải kết quả tìm kiếm bài viết theo hashtag. Vui lòng thử lại sau.');
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const campaignsCount = campaigns.length;
    const postsCount = posts.length;
    const usersCount = users.length;
    const totalCount = campaignsCount + postsCount + usersCount;

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
            
            {/* Content area - Unified Results */}
            <div className="max-w-4xl mx-auto px-6 py-6">
                {/* Loading State */}
                {(loading || postsLoading || usersLoading) && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        <p className="mt-4 text-gray-500">Đang tải kết quả...</p>
                    </div>
                )}

                {/* Error States */}
                {error && !loading && (
                    <div className="text-center py-4 mb-4">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                )}
                {postsError && !postsLoading && (
                    <div className="text-center py-4 mb-4">
                        <p className="text-red-500 text-sm">{postsError}</p>
                    </div>
                )}
                {usersError && !usersLoading && (
                    <div className="text-center py-4 mb-4">
                        <p className="text-red-500 text-sm">{usersError}</p>
                    </div>
                )}

                {/* Empty State - No Query */}
                {!decodedQuery && !loading && !postsLoading && !usersLoading && (
                    <div className="text-center py-12 text-gray-500">
                        <p>Nhập từ khóa để tìm kiếm</p>
                    </div>
                )}

                {/* Unified Results - Mixed Users, Campaigns, and Posts */}
                {decodedQuery && !loading && !postsLoading && !usersLoading && (
                    <div className="space-y-4">
                        {/* Users Results */}
                        {!decodedQuery.startsWith('#') && users.length > 0 && (
                            <div className="space-y-3">
                                {users.map((user) => (
                                    <UserSearchResult key={`user-${user._id}`} user={user} query={decodedQuery} />
                                ))}
                            </div>
                        )}

                        {/* Campaigns Results */}
                        {campaigns.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {campaigns.map((campaign) => (
                                    <CampaignCard key={`campaign-${campaign._id}`} campaign={campaign} />
                                ))}
                            </div>
                        )}

                        {/* Posts Results */}
                        {posts.length > 0 && (
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <PostCard key={`post-${post._id}`} post={post} />
                                ))}
                            </div>
                        )}

                        {/* No Results Message */}
                        {!error && !postsError && !usersError && 
                         campaigns.length === 0 && posts.length === 0 && 
                         (decodedQuery.startsWith('#') || users.length === 0) && (
                            <div className="text-center py-12 text-gray-500">
                                <p>Không tìm thấy nội dung nào với từ khóa &quot;{decodedQuery}&quot;</p>
                            </div>
                        )}
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

