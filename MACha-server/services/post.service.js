import Post from "../models/post.js";
import Like from "../models/like.js";
import Comment from "../models/comment.js";
import Hashtag from "../models/Hashtag.js";
import { redisClient } from "../config/redis.js";

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract hashtags from text content
 */
const extractHashtags = (content_text) => {
    const hashtagsInText = content_text.match(/#\w+/g) || [];
    return hashtagsInText.map((tag) => tag.substring(1).toLowerCase());
};

/**
 * Find or create hashtags
 */
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

/**
 * Get post counts (likes, comments) with cache
 */
const getPostCounts = async (postId) => {
    const countKey = `post:counts:${postId}`;

    // Check cache
    const cached = await redisClient.get(countKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query database
    const [likesCount, commentsCount] = await Promise.all([
        Like.countDocuments({ post: postId }),
        Comment.countDocuments({ post: postId })
    ]);

    const counts = { likesCount, commentsCount };

    // Cache for 2 minutes
    await redisClient.setEx(countKey, 120, JSON.stringify(counts));

    return counts;
};

/**
 * Check if user liked a post
 */
const checkUserLiked = async (postId, userId) => {
    if (!userId) return false;

    const likeKey = `post:liked:${postId}:${userId}`;

    const cached = await redisClient.get(likeKey);
    if (cached !== null) {
        return cached === 'true';
    }

    // Query database
    const like = await Like.findOne({ post: postId, user: userId });
    const isLiked = !!like;

    // Cache for 5 minutes
    await redisClient.setEx(likeKey, 300, isLiked.toString());

    return isLiked;
};

/**
 * Enrich post with counts and isLiked status
 */
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

/**
 * Invalidate all post-related caches
 */
const invalidatePostCaches = async (postId) => {
    const keys = [
        'posts:all',
        `post:${postId}`,
        `post:counts:${postId}`,
    ];

    await Promise.all(keys.map(key => redisClient.del(key)));

    // Also invalidate all user-specific liked cache for this post
    // Note: In production, you might want to use Redis SCAN for this
};

// ==================== MAIN SERVICE FUNCTIONS ====================

/**
 * Create a new post
 */
export const createPost = async (userId, postData) => {
    const { content_text, media_url } = postData;

    // Extract and create hashtags
    const hashtagNames = extractHashtags(content_text);
    const hashtags = await findOrCreateHashtags(hashtagNames);

    // Create post
    const post = await Post.create({
        user: userId,
        content_text,
        media_url,
        hashtags: hashtags.map((h) => h._id),
    });

    // Populate post
    const populatedPost = await post.populate([
        { path: "user", select: "username avatar fullname" },
        { path: "hashtags", select: "name" },
        { path: "campaign_id", select: "title" },
    ]);

    // Enrich with metadata (new post has 0 likes/comments)
    const postWithCounts = {
        ...populatedPost.toObject(),
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
    };

    // Invalidate posts list cache (similar to message.service.js)
    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);

    return postWithCounts;
};

/**
 * Get all posts with Cache-Aside Pattern
 */
export const getPosts = async (userId = null, page = 0, limit = 20) => {
    const postsKey = `posts:all:page:${page}:limit:${limit}`;
    const cached = await redisClient.get(postsKey);
    if (cached) {
        const posts = JSON.parse(cached);

        if (userId) {
            const enrichedPosts = await Promise.all(
                posts.map(async (post) => ({
                    ...post,
                    isLiked: await checkUserLiked(post._id, userId)
                }))
            );
            return enrichedPosts;
        }

        return posts;
    }

    const posts = await Post.find()
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    // 3. Enrich posts with metadata
    const postsWithCounts = await Promise.all(
        posts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    // 4. Cache the posts (without user-specific isLiked)
    const postsToCache = postsWithCounts.map(post => ({
        ...post,
        isLiked: false // Don't cache user-specific data
    }));

    await redisClient.setEx(postsKey, 120, JSON.stringify(postsToCache));

    // Add key to set for cache invalidation
    await redisClient.sAdd('posts:all:keys', postsKey);

    return postsWithCounts;
};

/**
 * Get post by ID with Cache-Aside Pattern
 */
export const getPostById = async (postId, userId = null) => {
    const postKey = `post:${postId}`;

    // 1. Check cache first
    const cached = await redisClient.get(postKey);
    if (cached) {
        const post = JSON.parse(cached);

        // Get fresh counts and isLiked status
        const { likesCount, commentsCount } = await getPostCounts(postId);
        const isLiked = await checkUserLiked(postId, userId);

        return {
            ...post,
            likesCount,
            commentsCount,
            isLiked,
        };
    }

    // 2. Cache miss - Query database
    const post = await Post.findById(postId)
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title");

    if (!post) {
        return null;
    }

    // 3. Enrich with metadata
    const postWithMetadata = await enrichPostWithMetadata(post, userId);

    // 4. Cache the post (without counts and isLiked as they change frequently)
    const postToCache = {
        ...post.toObject()
    };

    await redisClient.setEx(postKey, 300, JSON.stringify(postToCache));

    return postWithMetadata;
};

/**
 * Delete post with cascade delete
 */
export const deletePost = async (postId, userId) => {
    // Find post
    const post = await Post.findById(postId);

    if (!post) {
        return { success: false, error: 'NOT_FOUND' };
    }

    // Check ownership
    if (post.user.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }

    // Delete post and related data
    await Promise.all([
        post.deleteOne(),
        Like.deleteMany({ post: postId }),
        Comment.deleteMany({ post: postId }),
    ]);

    // Invalidate caches
    await invalidatePostCaches(postId);
    
    // Invalidate posts list cache (similar to message.service.js)
    const keySet = 'posts:all:keys';
    const keys = await redisClient.sMembers(keySet);

    if (keys.length > 0) {
        await redisClient.del(...keys);
    }

    await redisClient.del(keySet);

    return { success: true };
};

/**
 * Get posts by hashtag with Cache-Aside Pattern
 */
export const getPostsByHashtag = async (hashtagName, userId = null) => {
    const normalizedName = hashtagName.toLowerCase();
    const hashtagKey = `posts:hashtag:${normalizedName}`;

    // 1. Check cache first
    const cached = await redisClient.get(hashtagKey);
    if (cached) {
        const posts = JSON.parse(cached);

        // Enrich with user-specific isLiked status
        if (userId) {
            const enrichedPosts = await Promise.all(
                posts.map(async (post) => ({
                    ...post,
                    isLiked: await checkUserLiked(post._id, userId)
                }))
            );
            return { success: true, posts: enrichedPosts };
        }

        return { success: true, posts };
    }

    // 2. Find hashtag
    const hashtag = await Hashtag.findOne({ name: normalizedName });
    if (!hashtag) {
        return { success: false, error: 'HASHTAG_NOT_FOUND' };
    }

    // 3. Query posts
    const posts = await Post.find({ hashtags: hashtag._id })
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .sort({ createdAt: -1 });

    // 4. Enrich with metadata
    const postsWithCounts = await Promise.all(
        posts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    // 5. Cache the posts (without user-specific isLiked)
    const postsToCache = postsWithCounts.map(post => ({
        ...post,
        isLiked: false
    }));

    await redisClient.setEx(hashtagKey, 180, JSON.stringify(postsToCache));

    return { success: true, posts: postsWithCounts };
};

/**
 * Search posts by hashtag with Cache-Aside Pattern
 */
export const searchPostsByHashtag = async (searchTerm, userId = null) => {
    if (!searchTerm || searchTerm.trim() === "") {
        return { success: false, error: 'EMPTY_SEARCH_TERM' };
    }

    const searchKey = `posts:search:${searchTerm.toLowerCase()}`;

    // 1. Check cache first
    const cached = await redisClient.get(searchKey);
    if (cached) {
        const posts = JSON.parse(cached);

        // Enrich with user-specific isLiked status
        if (userId) {
            const enrichedPosts = await Promise.all(
                posts.map(async (post) => ({
                    ...post,
                    isLiked: await checkUserLiked(post._id, userId)
                }))
            );
            return { success: true, posts: enrichedPosts };
        }

        return { success: true, posts };
    }

    // 2. Find matching hashtags
    const matchingHashtags = await Hashtag.find({
        name: { $regex: searchTerm, $options: "i" },
    });

    if (matchingHashtags.length === 0) {
        return { success: true, posts: [] };
    }

    // 3. Query posts
    const hashtagIds = matchingHashtags.map((h) => h._id);
    const posts = await Post.find({ hashtags: { $in: hashtagIds } })
        .populate("user", "username avatar fullname")
        .populate("hashtags", "name")
        .populate("campaign_id", "title")
        .sort({ createdAt: -1 });

    // 4. Enrich with metadata
    const postsWithCounts = await Promise.all(
        posts.map(async (post) => await enrichPostWithMetadata(post, userId))
    );

    // 5. Cache the search results
    const postsToCache = postsWithCounts.map(post => ({
        ...post,
        isLiked: false
    }));

    await redisClient.setEx(searchKey, 120, JSON.stringify(postsToCache));

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

