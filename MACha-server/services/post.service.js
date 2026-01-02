import Post from "../models/post.js";
import Like from "../models/like.js";
import Comment from "../models/comment.js";
import Hashtag from "../models/Hashtag.js";
import Notification from "../models/notification.js";
import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";

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
        Comment.countDocuments({ post: postId })
    ]);

    const counts = { likesCount, commentsCount };
    await redisClient.setEx(countKey, 120, JSON.stringify(counts));

    return counts;
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
 */
export const invalidateAllPostListCaches = async () => {
    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);
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
    const postsKey = `posts:all:page:${page}:limit:${limit}`;
    const cached = await redisClient.get(postsKey);
    if (cached) {
        const posts = JSON.parse(cached);
        
        const filteredPosts = posts.filter(post => {
            if (!post.is_hidden) return true;
            if (userRole === 'admin' || userRole === 'owner') return true;
            return false;
        });

        if (userId) {
            const enrichedPosts = await Promise.all(
                filteredPosts.map(async (post) => ({
                    ...post,
                    isLiked: await checkUserLiked(post._id, userId)
                }))
            );
            return enrichedPosts;
        }

        return filteredPosts;
    }

    const query = {};
    if (userRole !== 'admin' && userRole !== 'owner') {
        query.is_hidden = false;
    }

    const posts = await Post.find(query)
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    const postsWithCounts = await Promise.all(
        posts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    const postsToCache = postsWithCounts.map(post => ({
        ...post,
        isLiked: false
    }));

    await redisClient.setEx(postsKey, 120, JSON.stringify(postsToCache));
    await redisClient.sAdd('posts:all:keys', postsKey);

    return postsWithCounts;
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
            const enrichedPosts = await Promise.all(
                filteredPosts.map(async (post) => ({
                    ...post,
                    isLiked: await checkUserLiked(post._id, userId)
                }))
            );
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

