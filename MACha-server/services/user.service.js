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

// ==================== KYC FUNCTIONS ====================

/**
 * Submit KYC for verification
 */
export const submitKYC = async (userId, kycData) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (user.kyc_status === 'verified') {
        return { success: false, error: 'ALREADY_VERIFIED' };
    }
    
    if (user.kyc_status === 'pending') {
        return { success: false, error: 'PENDING_REVIEW' };
    }
    
    const requiredFields = ['identity_verified_name', 'identity_card_last4'];
    const missingFields = requiredFields.filter(field => !kycData[field]);
    
    if (missingFields.length > 0) {
        return { 
            success: false, 
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields',
            missingFields 
        };
    }
    
    user.kyc_status = 'pending';
    user.kyc_submitted_at = new Date();
    user.kyc_documents = kycData.kyc_documents || {};
    user.identity_verified_name = kycData.identity_verified_name;
    user.identity_card_last4 = kycData.identity_card_last4;
    user.tax_code = kycData.tax_code;
    user.address = kycData.address || {};
    user.bank_account = kycData.bank_account || {};
    
    await user.save();
    
    await invalidateUserCaches(userId);
    await redisClient.del('kyc:pending');
    
    return { success: true, user };
};

/**
 * Get KYC status for current user
 */
export const getKYCStatus = async (userId) => {
    const user = await User.findById(userId).select('kyc_status kyc_submitted_at kyc_verified_at kyc_rejection_reason');
    
    return {
        kyc_status: user.kyc_status,
        kyc_submitted_at: user.kyc_submitted_at,
        kyc_verified_at: user.kyc_verified_at,
        kyc_rejection_reason: user.kyc_rejection_reason
    };
};

/**
 * Get all pending KYC submissions (Admin only)
 */
export const getPendingKYCs = async () => {
    const kycKey = 'kyc:pending';
    
    const cached = await redisClient.get(kycKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const users = await User.find({ kyc_status: 'pending' })
        .select('username email fullname identity_verified_name identity_card_last4 kyc_submitted_at kyc_documents address')
        .sort({ kyc_submitted_at: -1 });
    
    await redisClient.setEx(kycKey, 300, JSON.stringify(users));
    
    return users;
};

/**
 * Get KYC details for specific user (Admin only)
 */
export const getKYCDetails = async (userId) => {
    const user = await User.findById(userId)
        .select('-password -followers -following');
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (user.kyc_status === 'unverified') {
        return { success: false, error: 'NO_KYC_DATA' };
    }
    
    return { 
        success: true, 
        data: {
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullname: user.fullname,
                kyc_status: user.kyc_status
            },
            kyc_info: {
                identity_verified_name: user.identity_verified_name,
                identity_card_last4: user.identity_card_last4,
                tax_code: user.tax_code,
                address: user.address,
                bank_account: user.bank_account,
                kyc_documents: user.kyc_documents,
                kyc_submitted_at: user.kyc_submitted_at,
                kyc_verified_at: user.kyc_verified_at,
                kyc_verified_by: user.kyc_verified_by,
                kyc_rejection_reason: user.kyc_rejection_reason
            }
        }
    };
};

/**
 * Approve KYC (Admin only)
 */
export const approveKYC = async (userId, adminId) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (user.kyc_status !== 'pending') {
        return { 
            success: false, 
            error: 'INVALID_STATUS',
            message: `Cannot approve KYC with status: ${user.kyc_status}. Only pending KYCs can be approved.`
        };
    }
    
    user.kyc_status = 'verified';
    user.kyc_verified_at = new Date();
    user.kyc_verified_by = adminId;
    user.kyc_rejection_reason = null;
    
    await user.save();
    
    await Promise.all([
        invalidateUserCaches(userId),
        redisClient.del('kyc:pending')
    ]);
    
    return { success: true, user };
};

/**
 * Reject KYC (Admin only)
 */
export const rejectKYC = async (userId, reason) => {
    const user = await User.findById(userId);
    
    if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
    }
    
    if (user.kyc_status !== 'pending') {
        return { 
            success: false, 
            error: 'INVALID_STATUS',
            message: `Cannot reject KYC with status: ${user.kyc_status}. Only pending KYCs can be rejected.`
        };
    }
    
    user.kyc_status = 'rejected';
    user.kyc_rejection_reason = reason;
    
    await user.save();
    
    await Promise.all([
        invalidateUserCaches(userId),
        redisClient.del('kyc:pending')
    ]);
    
    return { success: true, user };
};

