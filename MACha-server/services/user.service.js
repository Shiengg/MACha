import User from "../models/user.js";
import { redisClient } from "../config/redis.js";

// ==================== HELPER FUNCTIONS ====================

/**
 * Invalidate user-related caches
 */
const invalidateUserCaches = async (userId) => {
    const keys = [
        `user:${userId}`,
        `user:followers:${userId}`,
        `user:following:${userId}`,
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

/**
 * Search users with Cache-Aside Pattern
 */
export const searchUsers = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim() === "") {
        return { success: false, error: 'EMPTY_QUERY' };
    }
    
    const searchKey = `user:search:${searchQuery.toLowerCase()}`;
    
    // 1. Check cache first
    const cached = await redisClient.get(searchKey);
    if (cached) {
        return { success: true, users: JSON.parse(cached) };
    }
    
    // 2. Cache miss - Query database
    const users = await User.find({
        $or: [
            { username: { $regex: searchQuery, $options: "i" } },
            { email: { $regex: searchQuery, $options: "i" } },
        ],
    }).select("username fullname avatar bio");
    
    // 3. Cache the search results (TTL: 3 minutes)
    await redisClient.setEx(searchKey, 180, JSON.stringify(users));
    
    return { success: true, users };
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

