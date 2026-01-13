import Post from "../models/post.js";
import Like from "../models/like.js";
import Comment from "../models/comment.js";
import Hashtag from "../models/Hashtag.js";
import Notification from "../models/notification.js";
import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";
import { getRecommendedCampaigns, getAnonymousRecommendations } from "./recommendation.service.js";

const extractHashtags = (content_text) => {
    const hashtagsInText = content_text.match(/#\w+/g) || [];
    return hashtagsInText.map((tag) => tag.substring(1).toLowerCase());
};

const findOrCreateHashtags = async (hashtagNames) => {
    return await Promise.all(
        hashtagNames.map(async (name) => {
            let existing = await Hashtag.findOne({ name });
            if (!existing) {
                existing = await Hashtag.create({ name });
            }
            return existing;
        })
    );
};

const getPostCounts = async (postId) => {
    const countKey = `post:counts:${postId}`;
    const cached = await redisClient.get(countKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const [likesCount, commentsCount] = await Promise.all([
        Like.countDocuments({ post: postId }),
        Comment.countDocuments({ post: postId, is_hidden: { $ne: true } }) // Exclude hidden comments
    ]);

    const counts = { likesCount, commentsCount };
    await redisClient.setEx(countKey, 120, JSON.stringify(counts));

    return counts;
};

/**
 * Batch get post counts for multiple posts (fixes N+1 query issue)
 * @param {Array<string>} postIds - Array of post IDs
 * @returns {Promise<Map<string, {likesCount: number, commentsCount: number}>>} Map of postId -> counts
 */
const batchGetPostCounts = async (postIds) => {
    if (!postIds || postIds.length === 0) {
        return new Map();
    }

    const resultMap = new Map();
    
    // Try to get from cache first
    const cacheKeys = postIds.map(postId => `post:counts:${postId}`);
    const cachedResults = await Promise.all(
        cacheKeys.map(key => redisClient.get(key))
    );
    
    const uncachedPostIds = [];
    cachedResults.forEach((cached, index) => {
        if (cached) {
            resultMap.set(postIds[index].toString(), JSON.parse(cached));
        } else {
            uncachedPostIds.push(postIds[index]);
        }
    });

    // Batch query for uncached posts
    if (uncachedPostIds.length > 0) {
        const [likesCounts, commentsCounts] = await Promise.all([
            Like.aggregate([
                { $match: { post: { $in: uncachedPostIds } } },
                { $group: { _id: "$post", count: { $sum: 1 } } }
            ]),
            Comment.aggregate([
                { $match: { post: { $in: uncachedPostIds }, is_hidden: { $ne: true } } },
                { $group: { _id: "$post", count: { $sum: 1 } } }
            ])
        ]);

        const likesMap = new Map(likesCounts.map(item => [item._id.toString(), item.count]));
        const commentsMap = new Map(commentsCounts.map(item => [item._id.toString(), item.count]));

        // Set results and cache
        const cachePromises = [];
        uncachedPostIds.forEach(postId => {
            const counts = {
                likesCount: likesMap.get(postId.toString()) || 0,
                commentsCount: commentsMap.get(postId.toString()) || 0
            };
            resultMap.set(postId.toString(), counts);
            cachePromises.push(
                redisClient.setEx(`post:counts:${postId}`, 120, JSON.stringify(counts))
            );
        });
        
        await Promise.all(cachePromises);
    }

    return resultMap;
};

const checkUserLiked = async (postId, userId) => {
    if (!userId) return false;

    const likeKey = `post:liked:${postId}:${userId}`;
    const cached = await redisClient.get(likeKey);
    if (cached !== null) {
        return cached === 'true';
    }

    const like = await Like.findOne({ post: postId, user: userId });
    const isLiked = !!like;
    await redisClient.setEx(likeKey, 300, isLiked.toString());

    return isLiked;
};

/**
 * Batch check if user liked multiple posts (fixes N+1 query issue)
 * @param {Array<string>} postIds - Array of post IDs
 * @param {string} userId - User ID
 * @returns {Promise<Map<string, boolean>>} Map of postId -> isLiked
 */
const batchCheckUserLiked = async (postIds, userId) => {
    if (!userId || !postIds || postIds.length === 0) {
        return new Map();
    }

    const resultMap = new Map();
    
    // Try to get from cache first
    const cacheKeys = postIds.map(postId => `post:liked:${postId}:${userId}`);
    const cachedResults = await Promise.all(
        cacheKeys.map(key => redisClient.get(key))
    );
    
    const uncachedPostIds = [];
    cachedResults.forEach((cached, index) => {
        if (cached !== null) {
            resultMap.set(postIds[index].toString(), cached === 'true');
        } else {
            uncachedPostIds.push(postIds[index]);
        }
    });

    // Batch query for uncached posts
    if (uncachedPostIds.length > 0) {
        const likes = await Like.find({
            post: { $in: uncachedPostIds },
            user: userId
        }).select('post').lean();

        const likedPostIds = new Set(likes.map(like => like.post.toString()));
        
        // Set results and cache
        const cachePromises = [];
        uncachedPostIds.forEach(postId => {
            const isLiked = likedPostIds.has(postId.toString());
            resultMap.set(postId.toString(), isLiked);
            cachePromises.push(
                redisClient.setEx(`post:liked:${postId}:${userId}`, 300, isLiked.toString())
            );
        });
        
        await Promise.all(cachePromises);
    }

    return resultMap;
};

const enrichPostWithMetadata = async (post, userId = null) => {
    const { likesCount, commentsCount } = await getPostCounts(post._id);
    const isLiked = await checkUserLiked(post._id, userId);

    return {
        ...post.toObject(),
        likesCount,
        commentsCount,
        isLiked,
    };
};

const invalidatePostCaches = async (postId) => {
    const keys = [
        'posts:all',
        `post:${postId}`,
        `post:counts:${postId}`,
    ];
    await Promise.all(keys.map(key => redisClient.del(key)));
};

/**
 * Invalidate all post list caches (for feed/pagination)
 * This includes both old format (without userId) and new format (with userId)
 */
export const invalidateAllPostListCaches = async () => {
    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);
    
    // Also invalidate any cached posts that match the pattern
    // This handles both old format (posts:all:page:*) and new format (posts:all:user:*)
    // Note: This is a best-effort cleanup, Redis doesn't support pattern deletion efficiently
    // In production, you might want to use Redis SCAN for pattern matching
};

/**
 * Invalidate post cache by post ID
 */
export const invalidatePostCache = async (postId) => {
    await invalidatePostCaches(postId);
    await invalidateAllPostListCaches();
};

export const createPost = async (userId, postData) => {
    const { content_text, media_url, campaign_id } = postData;

    if (campaign_id) {
        const campaign = await Campaign.findById(campaign_id);
        if (!campaign) {
            return { success: false, error: 'CAMPAIGN_NOT_FOUND' };
        }
        if (!['active', 'approved', 'voting'].includes(campaign.status)) {
            return { success: false, error: 'CAMPAIGN_NOT_ACTIVE' };
        }
    }

    const hashtagNames = extractHashtags(content_text);
    const hashtags = await findOrCreateHashtags(hashtagNames);

    const post = await Post.create({
        user: userId,
        content_text,
        media_url,
        hashtags: hashtags.map((h) => h._id),
        campaign_id: campaign_id || null,
    });

    const populatedPost = await post.populate([
        { path: "user", select: "username avatar fullname" },
        { path: "hashtags", select: "name" },
        { path: "campaign_id", select: "title" },
    ]);

    const postWithCounts = {
        ...populatedPost.toObject(),
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
    };

    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);

    return postWithCounts;
};


export const getPosts = async (userId = null, userRole = null, page = 0, limit = 20) => {
    // Cache key includes userId because scoring depends on recommendations
    const userIdStr = userId ? userId.toString() : 'anonymous';
    const postsKey = `posts:all:user:${userIdStr}:page:${page}:limit:${limit}`;
    
    // Try to get from cache
    const cached = await redisClient.get(postsKey);
    if (cached) {
        const posts = JSON.parse(cached);
        
        // Filter hidden posts
        const filteredPosts = posts.filter(post => {
            if (!post.is_hidden) return true;
            if (userRole === 'admin' || userRole === 'owner') return true;
            return false;
        });

        // Add isLiked status if user is logged in (batch query to avoid N+1)
        if (userId) {
            const postIds = filteredPosts.map(p => p._id.toString());
            const likedMap = await batchCheckUserLiked(postIds, userId);
            const enrichedPosts = filteredPosts.map(post => ({
                ...post,
                isLiked: likedMap.get(post._id.toString()) || false
            }));
            return enrichedPosts;
        }

        return filteredPosts;
    }

    // Build query to filter hidden posts
    const query = {};
    if (userRole !== 'admin' && userRole !== 'owner') {
        query.is_hidden = false;
    }

    // Step 1: Get recommended campaign IDs
    const recommendedCampaignIds = await getRecommendedCampaignIds(userId, 50);

    // Step 2: Get posts with counts
    // Optimized: Fetch only what we need for scoring (limit * 3 pages for better scoring)
    // This reduces memory usage and query time significantly
    const fetchLimit = Math.min(limit * 3, 200); // Fetch 3 pages worth or max 200 posts
    const allPosts = await getPostsWithCounts(query, 0, fetchLimit);

    // Step 3: Calculate score for each post
    // Note: posts from getPostsWithCounts are already plain objects (from .lean())
    const postsWithScores = allPosts.map(post => {
        const score = calculatePostScore(post, recommendedCampaignIds);
        
        return {
            ...post,
            score,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0
        };
    });

    // Step 4: Sort by score (descending), then by createdAt (newer first) if scores are equal
    postsWithScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // If scores are equal, newer posts come first
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Step 5: Apply pagination after sorting
    const paginatedPosts = postsWithScores.slice(page * limit, (page + 1) * limit);

    // Step 6: Remove score field and enrich with metadata
    const postsWithoutScore = paginatedPosts.map(({ score, ...post }) => post);
    
    // Batch check user likes to avoid N+1 queries
    const postIds = postsWithoutScore.map(p => p._id.toString());
    const likedMap = userId ? await batchCheckUserLiked(postIds, userId) : new Map();
    
    const postsWithMetadata = postsWithoutScore.map((post) => {
        const isLiked = userId ? (likedMap.get(post._id.toString()) || false) : false;
        return {
            ...post,
            isLiked
        };
    });

    // Step 7: Cache the results (without isLiked for user-specific data)
    const postsToCache = postsWithMetadata.map(post => ({
        ...post,
        isLiked: false
    }));

    await redisClient.setEx(postsKey, 120, JSON.stringify(postsToCache));
    await redisClient.sAdd('posts:all:keys', postsKey);

    return postsWithMetadata;
};

export const getPostById = async (postId, userId = null, userRole = null) => {
    const postKey = `post:${postId}`;

    const post = await Post.findById(postId)
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title");

    if (!post) {
        return null;
    }

    if (post.is_hidden) {
        if (userRole === 'admin' || userRole === 'owner') {
        } else if (userId && post.user && post.user._id && post.user._id.toString() === userId.toString()) {
        } else {
            return null;
        }
    }

    const cached = await redisClient.get(postKey);
    if (cached) {
        const cachedPost = JSON.parse(cached);
        const { likesCount, commentsCount } = await getPostCounts(postId);
        const isLiked = await checkUserLiked(postId, userId);

        return {
            ...cachedPost,
            likesCount,
            commentsCount,
            isLiked,
        };
    }

    const postWithMetadata = await enrichPostWithMetadata(post, userId);
    const postToCache = {
        ...post.toObject()
    };

    await redisClient.setEx(postKey, 300, JSON.stringify(postToCache));

    return postWithMetadata;
};

export const updatePost = async (postId, userId, postData) => {
    const { content_text, media_url, campaign_id } = postData;

    const post = await Post.findById(postId);

    if (!post) {
        return { success: false, error: 'NOT_FOUND' };
    }

    if (post.user.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }

    if (campaign_id !== undefined) {
        if (campaign_id) {
            const campaign = await Campaign.findById(campaign_id);
            if (!campaign) {
                return { success: false, error: 'CAMPAIGN_NOT_FOUND' };
            }
            if (!['active', 'approved', 'voting'].includes(campaign.status)) {
                return { success: false, error: 'CAMPAIGN_NOT_ACTIVE' };
            }
            post.campaign_id = campaign_id;
        } else {
            post.campaign_id = null;
        }
    }

    const hashtagNames = extractHashtags(content_text);
    const hashtags = await findOrCreateHashtags(hashtagNames);

    post.content_text = content_text;
    post.media_url = media_url || [];
    post.hashtags = hashtags.map((h) => h._id);
    await post.save();

    const populatedPost = await post.populate([
        { path: "user", select: "username avatar fullname" },
        { path: "hashtags", select: "name" },
        { path: "campaign_id", select: "title" },
    ]);

    const postWithMetadata = await enrichPostWithMetadata(populatedPost, userId);

    await invalidatePostCaches(postId);
    
    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);

    return { success: true, post: postWithMetadata };
};

export const deletePost = async (postId, userId) => {
    const post = await Post.findById(postId);

    if (!post) {
        return { success: false, error: 'NOT_FOUND' };
    }

    if (post.user.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }

    const relatedNotifications = await Notification.find({ post: postId }).select('receiver');
    const affectedUserIds = [...new Set(relatedNotifications.map(n => n.receiver.toString()))];

    await Promise.all([
        post.deleteOne(),
        Like.deleteMany({ post: postId }),
        Comment.deleteMany({ post: postId }),
        Notification.deleteMany({ post: postId }),
    ]);

    if (affectedUserIds.length > 0) {
        const notificationCacheKeys = affectedUserIds.map(userId => `notifications:${userId}`);
        await redisClient.del(...notificationCacheKeys);
    }

    await invalidatePostCaches(postId);
    
    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);

    return { success: true };
};

export const getPostsByHashtag = async (hashtagName, userId = null, userRole = null, page = 1, limit = 50) => {
    const normalizedName = hashtagName.toLowerCase();
    const skip = (page - 1) * limit;

    const hashtag = await Hashtag.findOne({ name: normalizedName });
    if (!hashtag) {
        return { success: false, error: 'HASHTAG_NOT_FOUND' };
    }

    // Build query to exclude hidden posts (unless user is admin/owner)
    let query = { hashtags: hashtag._id };
    if (userRole !== 'admin' && userRole !== 'owner') {
        // All non-admin users (including post owners) can only see non-hidden posts in feed
        query.is_hidden = false;
    }

    // Get total count for pagination
    const totalCount = await Post.countDocuments(query);

    // Get paginated posts
    const posts = await Post.find(query)
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const postsWithCounts = await Promise.all(
        posts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    return { 
        success: true, 
        posts: postsWithCounts,
        pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: page * limit < totalCount,
            hasPrev: page > 1
        }
    };
};

export const searchPostsByHashtag = async (searchTerm, userId = null, userRole = null) => {
    if (!searchTerm || searchTerm.trim() === "") {
        return { success: false, error: 'EMPTY_SEARCH_TERM' };
    }

    const searchKey = `posts:search:${searchTerm.toLowerCase()}`;

    const cached = await redisClient.get(searchKey);
    if (cached) {
        const posts = JSON.parse(cached);
        
        const filteredPosts = posts.filter(post => {
            if (!post.is_hidden) return true;
            if (userRole === 'admin' || userRole === 'owner') return true;
            return false;
        });

        if (userId) {
            // Batch check user likes to avoid N+1 queries
            const postIds = filteredPosts.map(p => p._id.toString());
            const likedMap = await batchCheckUserLiked(postIds, userId);
            const enrichedPosts = filteredPosts.map(post => ({
                ...post,
                isLiked: likedMap.get(post._id.toString()) || false
            }));
            return { success: true, posts: enrichedPosts };
        }

        return { success: true, posts: filteredPosts };
    }

    const matchingHashtags = await Hashtag.find({
        name: { $regex: searchTerm, $options: "i" },
    });

    if (matchingHashtags.length === 0) {
        return { success: true, posts: [] };
    }

    const hashtagIds = matchingHashtags.map((h) => h._id);
    let query = { hashtags: { $in: hashtagIds } };
    if (userRole !== 'admin' && userRole !== 'owner') {
        query.is_hidden = false;
    }
    
    const posts = await Post.find(query)
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .sort({ createdAt: -1 });

    const postsWithCounts = await Promise.all(
        posts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    const postsToCache = postsWithCounts.map(post => ({
        ...post,
        isLiked: false
    }));

    await redisClient.setEx(searchKey, 120, JSON.stringify(postsToCache));

    return { success: true, posts: postsWithCounts };
};

const calculateTimePenalty = (createdAt) => {
    const now = new Date();
    const postDate = new Date(createdAt);
    const diffMs = now - postDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24); // Convert to days
    
    if (diffDays < 1) {
        return 50;
    }
    
    // Post 1-3 ngày: trừ nhẹ (5 điểm/ngày)
    if (diffDays < 3) {
        return -(diffDays - 1) * 5;
    }
    
    // Post 3-7 ngày: trừ vừa (10 điểm/ngày)
    if (diffDays < 7) {
        return -10 - (diffDays - 3) * 10;
    }
    
    // Post 7-30 ngày: trừ nhiều (15 điểm/ngày)
    if (diffDays < 30) {
        return -50 - (diffDays - 7) * 15;
    }
    
    // Post > 30 ngày: trừ rất nhiều (20 điểm/ngày)
    return -395 - (diffDays - 30) * 20;
};

const calculatePostScore = (post, recommendedCampaignIds = new Set()) => {
    let score = 0;

    // 1. Campaign Boost:
    //    - Nếu campaign thuộc recommendedCampaignIds: +1000
    //    - Nếu có campaign nhưng KHÔNG thuộc recommendedCampaignIds: +100
    if (post.campaign_id) {
        let campaignIdStr = null;
        
        // Handle different campaign_id formats:
        // - Populated object: { _id: ObjectId, title: "..." }
        // - ObjectId reference: ObjectId
        // - String: string
        if (typeof post.campaign_id === 'object' && post.campaign_id !== null) {
            if (post.campaign_id._id) {
                // Populated object: { _id: ObjectId, title: "..." }
                campaignIdStr = post.campaign_id._id.toString();
            } else if (post.campaign_id.toString && typeof post.campaign_id.toString === 'function') {
                // ObjectId
                campaignIdStr = post.campaign_id.toString();
            }
        } else if (typeof post.campaign_id === 'string') {
            campaignIdStr = post.campaign_id;
        }
        
        if (campaignIdStr) {
            if (recommendedCampaignIds.has(campaignIdStr)) {
                score += 1000;
            } else {
                score += 100;
            }
        }
    }

    // 2. Engagement Score: 1 like = 5 points, 1 comment = 15 points
    const likesCount = post.likesCount || 0;
    const commentsCount = post.commentsCount || 0;
    score += (likesCount * 5) + (commentsCount * 15);

    // 3. Time Decay: newer posts get bonus, older posts get penalty
    const timeAdjustment = calculateTimePenalty(post.createdAt);
    score += timeAdjustment;

    return score;
};

/**
 * Get recommended campaign IDs as a Set for fast lookup
 * @param {string|null} userId - User ID (null for anonymous)
 * @param {number} limit - Maximum number of campaigns to fetch
 * @returns {Promise<Set<string>>} Set of recommended campaign IDs
 */
const getRecommendedCampaignIds = async (userId = null, limit = 50) => {
    try {
        let result;
        if (userId) {
            result = await getRecommendedCampaigns(userId, limit);
        } else {
            result = await getAnonymousRecommendations(limit);
        }

        if (!result || !result.campaigns || result.campaigns.length === 0) {
            return new Set();
        }

        // Extract campaign IDs and convert to Set for O(1) lookup
        const campaignIds = result.campaigns
            .map(campaign => campaign._id.toString())
            .filter(Boolean);

        return new Set(campaignIds);
    } catch (error) {
        console.error("Error getting recommended campaign IDs:", error.message);
        // Return empty set on error - posts will still be scored without recommendation boost
        return new Set();
    }
};

const getPostsWithCounts = async (query, skip = 0, limit = 20) => {
    // Optimized aggregation pipeline with better indexing usage
    const posts = await Post.aggregate([
        { $match: query },
        // Sort early to use index efficiently
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "post",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "post",
                as: "comments"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$comments" }
            }
        },
        {
            $project: {
                likes: 0,
                comments: 0
            }
        }
    ]);

    // Convert ObjectIds to proper format for population
    // Note: aggregation returns plain objects, not Mongoose documents
    // We need to populate manually or use Post.find with the IDs
    const postIds = posts.map(p => p._id);
    
    if (postIds.length === 0) {
        return [];
    }
    
    // Fetch full posts with population (only selected fields to reduce payload)
    const fullPosts = await Post.find({ _id: { $in: postIds } })
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .lean();

    // Map counts from aggregation results to full posts
    const countsMap = new Map(posts.map(p => [p._id.toString(), {
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0
    }]));

    // Merge counts into full posts and filter out posts without user (user might be deleted)
    // Maintain order from aggregation
    const postOrderMap = new Map(posts.map((p, index) => [p._id.toString(), index]));
    const postsWithCounts = fullPosts
        .filter(post => post.user) // Filter out posts where user is null/deleted
        .sort((a, b) => {
            // Maintain aggregation order
            const orderA = postOrderMap.get(a._id.toString()) ?? Infinity;
            const orderB = postOrderMap.get(b._id.toString()) ?? Infinity;
            return orderA - orderB;
        })
        .map(post => ({
            ...post,
            likesCount: countsMap.get(post._id.toString())?.likesCount || 0,
            commentsCount: countsMap.get(post._id.toString())?.commentsCount || 0
        }));

    return postsWithCounts;
};

const calculatePostRelevanceScore = (content, searchTerm, searchWords, createdAt) => {
    const contentLower = content.toLowerCase();
    let score = 0;

    if (contentLower.startsWith(searchTerm)) {
        score += 1000;
    }

    if (contentLower.includes(searchTerm) && !contentLower.startsWith(searchTerm)) {
        score += 500;
    }

    const contentWords = contentLower.split(/\s+/);
    const matchedWords = new Set();
    searchWords.forEach(word => {
        if (contentWords.includes(word)) {
            matchedWords.add(word);
        }
    });
    score += matchedWords.size * 100;

    searchWords.forEach(word => {
        if (!matchedWords.has(word)) {
            contentWords.forEach(contentWord => {
                if (contentWord.includes(word) || word.includes(contentWord)) {
                    score += 10;
                }
            });
        }
    });

    // Add time-based adjustment (newer posts get bonus, older posts get penalty)
    const timeAdjustment = calculateTimePenalty(createdAt);
    score += timeAdjustment;

    return score;
};

export const searchPostsByTitle = async (searchTerm, userId = null, userRole = null, limit = 50) => {
    if (!searchTerm || searchTerm.trim() === "") {
        return { success: true, posts: [] };
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
    
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    let query = { content_text: searchRegex };
    if (userRole !== 'admin' && userRole !== 'owner') {
        query.is_hidden = false;
    }

    const allPosts = await Post.find(query)
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .lean();

    const postsWithScore = allPosts.map(post => ({
        ...post,
        relevanceScore: calculatePostRelevanceScore(
            post.content_text,
            normalizedSearch,
            searchWords,
            post.createdAt
        )
    }));

    postsWithScore.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const results = postsWithScore
        .slice(0, limit)
        .map(({ relevanceScore, ...post }) => post);

    const postIds = results.map(p => p._id);
    
    const posts = await Post.find({ _id: { $in: postIds } })
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title");

    const orderedPosts = postIds.map(id => 
        posts.find(p => p._id.toString() === id.toString())
    ).filter(Boolean);

    const postsWithCounts = await Promise.all(
        orderedPosts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    return { success: true, posts: postsWithCounts };
};

/**
 * Invalidate post counts cache (called from like/comment services)
 */
export const invalidatePostCountsCache = async (postId) => {
    await redisClient.del(`post:counts:${postId}`);
};

/**
 * Invalidate user liked cache (called from like service)
 */
export const invalidateUserLikedCache = async (postId, userId) => {
    await redisClient.del(`post:liked:${postId}:${userId}`);
};

