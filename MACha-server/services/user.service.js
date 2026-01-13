import User from "../models/user.js";
import { redisClient } from "../config/redis.js";
import { 
    calculateSimilarityScore, 
    normalizeSearchTerm, 
    splitSearchWords 
} from "../utils/similarity.js";

// ==================== HELPER FUNCTIONS ====================

/**
 * Invalidate user-related caches
 */
const invalidateUserCaches = async (userId) => {
    const keys = [
        `user:${userId}`,
        `user:followers:${userId}`,
        `user:following:${userId}`,
        'users:all',
    ];
    
    await Promise.all(keys.map(key => redisClient.del(key)));
};

// ==================== MAIN SERVICE FUNCTIONS ====================

/**
 * Get user by ID with Cache-Aside Pattern
 */
export const getUserById = async (userId) => {
    const userKey = `user:${userId}`;
    
    // 1. Check cache first
    const cached = await redisClient.get(userKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // 2. Cache miss - Query database
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
        return null;
    }
    
    // 3. Cache the user (TTL: 10 minutes)
    await redisClient.setEx(userKey, 600, JSON.stringify(user));
    
    return user;
};

/**
 * Follow user with cache invalidation
 */
export const followUser = async (currentUserId, targetUserId) => {
    // Validation: Can't follow yourself
    if (targetUserId === currentUserId.toString()) {
        return { success: false, error: 'SELF_FOLLOW' };
    }
    
    // Find both users
    const [targetUser, currentUser] = await Promise.all([
        User.findById(targetUserId),
        User.findById(currentUserId)
    ]);
    
    if (!targetUser) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    // Check if already following
    if (currentUser.following.includes(targetUserId)) {
        return { success: false, error: 'ALREADY_FOLLOWING' };
    }
    
    // Update both users
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);
    
    currentUser.following_count++;
    targetUser.followers_count++;
    
    await Promise.all([
        currentUser.save(),
        targetUser.save()
    ]);
    
    // Invalidate caches
    await Promise.all([
        invalidateUserCaches(currentUserId),
        invalidateUserCaches(targetUserId),
    ]);
    
    return { success: true, targetUserId };
};

/**
 * Unfollow user with cache invalidation
 */
export const unfollowUser = async (currentUserId, targetUserId) => {
    // Find both users
    const [targetUser, currentUser] = await Promise.all([
        User.findById(targetUserId),
        User.findById(currentUserId)
    ]);
    
    if (!targetUser) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    // Check if not following
    if (!currentUser.following.includes(targetUserId)) {
        return { success: false, error: 'NOT_FOLLOWING' };
    }
    
    // Update both users
    currentUser.following.pull(targetUserId);
    targetUser.followers.pull(currentUserId);
    
    currentUser.following_count = currentUser.following_count > 0 ? currentUser.following_count - 1 : 0;
    targetUser.followers_count = targetUser.followers_count > 0 ? targetUser.followers_count - 1 : 0;
    
    await Promise.all([
        currentUser.save(),
        targetUser.save()
    ]);
    
    // Invalidate caches
    await Promise.all([
        invalidateUserCaches(currentUserId),
        invalidateUserCaches(targetUserId),
    ]);
    
    return { success: true };
};

/**
 * Get user followers with Cache-Aside Pattern
 */
export const getFollowers = async (userId) => {
    const followersKey = `user:followers:${userId}`;
    
    // 1. Check cache first
    const cached = await redisClient.get(followersKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // 2. Cache miss - Query database
    const user = await User.findById(userId)
        .populate("followers", "username fullname avatar")
        .select("followers followers_count");
    
    if (!user) {
        return null;
    }
    
    const result = {
        count: user.followers_count,
        followers: user.followers,
    };
    
    // 3. Cache the followers (TTL: 5 minutes)
    await redisClient.setEx(followersKey, 300, JSON.stringify(result));
    
    return result;
};

/**
 * Get user following with Cache-Aside Pattern
 */
export const getFollowing = async (userId) => {
    const followingKey = `user:following:${userId}`;
    
    // 1. Check cache first
    const cached = await redisClient.get(followingKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // 2. Cache miss - Query database
    const user = await User.findById(userId)
        .populate("following", "username fullname avatar")
        .select("following following_count");
    
    if (!user) {
        return null;
    }
    
    const result = {
        count: user.following_count,
        following: user.following,
    };
    
    // 3. Cache the following (TTL: 5 minutes)
    await redisClient.setEx(followingKey, 300, JSON.stringify(result));
    
    return result;
};

export const getAllUsers = async () => {
    const usersKey = 'users:all';
    
    const cached = await redisClient.get(usersKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const users = await User.find()
        .select('username email fullname avatar role kyc_status createdAt followers_count following_count')
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(usersKey, 300, JSON.stringify(users));
    
    return users;
};

export const getPublicAdmins = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const cacheKey = `public:admins:${page}:${limit}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const [admins, total] = await Promise.all([
        User.find({ role: "admin", is_banned: false })
            .select("_id username fullname avatar createdAt is_verified")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments({ role: "admin", is_banned: false })
    ]);
    
    const result = {
        admins,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    
    return result;
};

/**
 * Search users with fuzzy matching and similarity scoring
 * Searches by username and fullname, sorted by relevance score
 * 
 * @param {string} searchTerm - Search keyword
 * @param {number} limit - Maximum number of results (default: 50)
 * @returns {Promise<{success: boolean, users?: User[], error?: string}>}
 */
export const searchUsers = async (searchTerm, limit = 50) => {
    if (!searchTerm || searchTerm.trim() === "") {
        return { success: false, error: 'EMPTY_QUERY' };
    }

    // Normalize search term
    const normalizedSearch = normalizeSearchTerm(searchTerm);
    const searchWords = splitSearchWords(normalizedSearch);
    
    // Minimum search length validation
    if (normalizedSearch.length < 1) {
        return { success: false, error: 'QUERY_TOO_SHORT' };
    }

    // Escape special regex characters
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    // Find all users that match the search term (username or fullname)
    // Exclude banned users
    const allUsers = await User.find({
        $and: [
            {
                $or: [
                    { username: searchRegex },
                    { fullname: searchRegex }
                ]
            },
            { is_banned: false }
        ]
    })
        .select("username fullname avatar bio is_verified role")
        .lean();

    // Calculate relevance score for each user
    // Score both username and fullname, take the higher score
    const usersWithScore = allUsers.map(user => {
        const usernameScore = calculateSimilarityScore(
            user.username || "",
            normalizedSearch,
            searchWords,
            user.is_verified ? 50 : 0 // Bonus for verified users
        );
        
        const fullnameScore = calculateSimilarityScore(
            user.fullname || "",
            normalizedSearch,
            searchWords,
            user.is_verified ? 50 : 0 // Bonus for verified users
        );

        // Use the higher score between username and fullname
        // Username matches are typically more important, so give slight preference
        const finalScore = Math.max(usernameScore, fullnameScore);
        
        // If username matches, add small bonus
        if (usernameScore > 0) {
            return {
                ...user,
                relevanceScore: finalScore + 20
            };
        }
        
        return {
            ...user,
            relevanceScore: finalScore
        };
    });

    // Sort by relevance score (descending), then by creation date (descending)
    usersWithScore.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    // Limit results and remove score field
    const results = usersWithScore
        .slice(0, limit)
        .map(({ relevanceScore, ...user }) => user);

    // Convert back to Mongoose documents (optional, can return lean objects)
    const userIds = results.map(u => u._id);
    const populatedUsers = await User.find({ 
        _id: { $in: userIds },
        is_banned: false
    })
        .select("username fullname avatar bio is_verified role");

    // Maintain the relevance order
    const orderedUsers = userIds.map(id => 
        populatedUsers.find(u => u._id.toString() === id.toString())
    ).filter(Boolean);

    return { success: true, users: orderedUsers };
};

/**
 * Update user and invalidate cache
 */
export const updateUser = async (userId, updates) => {
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true }
    ).select("-password");
    
    if (!updatedUser) {
        return null;
    }
    
    // Invalidate user cache
    await invalidateUserCaches(userId);
    
    return updatedUser;
};

/**
 * Track recently viewed campaign
 * Maintains max 10 campaigns, removes duplicates, keeps newest at front
 * Uses atomic operations to prevent race conditions
 */
export const trackRecentlyViewedCampaign = async (userId, campaignId) => {
    try {
        // Use atomic operation to avoid race conditions with Mongoose versioning
        // This approach:
        // 1. Removes the campaign if it already exists (to avoid duplicates)
        // 2. Adds it to the beginning of the array
        // 3. Keeps only the latest 10 campaigns
        // All in a single atomic operation
        const result = await User.findOneAndUpdate(
            { _id: userId },
            [
                // Step 1: Remove campaign if it exists, then add to front
                {
                    $set: {
                        recently_viewed_campaigns: {
                            $concatArrays: [
                                [campaignId], // Add new campaign at front
                                {
                                    $filter: {
                                        input: "$recently_viewed_campaigns",
                                        as: "campaign",
                                        cond: { $ne: ["$$campaign", campaignId] } // Remove duplicate
                                    }
                                }
                            ]
                        }
                    }
                },
                // Step 2: Keep only first 10 items
                {
                    $set: {
                        recently_viewed_campaigns: {
                            $slice: ["$recently_viewed_campaigns", 10]
                        }
                    }
                }
            ],
            {
                new: true,
                runValidators: true
            }
        );

        if (!result) {
            return { success: false, error: 'USER_NOT_FOUND' };
        }

        // Invalidate user cache
        await invalidateUserCaches(userId);

        return { success: true };
    } catch (error) {
        console.error('Error tracking recently viewed campaign:', error);
        return { success: false, error: error.message };
    }
};

