import User from "../models/user.js";
import { redisClient } from "../config/redis.js";

/**
 * Kiểm tra xem user đã tồn tại chưa (theo username hoặc email)
 */
export const checkUserExists = async (username, email) => {
    const existingUser = await User.findOne({
        $or: [{ username: username.trim() }, { email: email.trim() }],
    });
    return existingUser !== null;
};

/**
 * Tạo user mới trong database
 * Không set cache (Cache-Aside: lazy loading)
 */
export const createUser = async (payload) => {
    const user = new User(payload);
    await user.save();

    return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        avatar: user.avatar,
        bio: user.bio,
        date_of_birth: user.date_of_birth,
        followers: user.followers,
        following: user.following,
        followers_count: user.followers_count,
        following_count: user.following_count,
    };
};

/**
 * Tìm user theo email (cho login)
 * Không cache password vì lý do bảo mật
 */
export const findUserByEmail = async (email) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    return user;
};

/**
 * Lấy user theo ID với Cache-Aside pattern
 * Không bao gồm password
 */
export const getUserById = async (userId) => {
    const cacheKey = `user:${userId.toString()}`;
    
    // 1. Kiểm tra cache trước
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // 2. Cache miss → Query DB
    const user = await User.findById(userId).select("-password");
    if (!user) return null;
    
    // 3. Set cache cho lần sau (TTL 1 giờ)
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(user));
    
    return user;
};

/**
 * Validate các fields được phép update
 */
export const validateUpdateFields = (requestBody, allowedFields) => {
    const requestFields = Object.keys(requestBody);
    const invalidFields = requestFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        return {
            isValid: false,
            invalidFields,
            allowedFields
        };
    }
    
    // Lọc chỉ lấy các fields được phép
    const updates = {};
    for (const field of allowedFields) {
        if (requestBody[field] !== undefined) {
            updates[field] = requestBody[field];
        }
    }
    
    return {
        isValid: true,
        updates
    };
};

/**
 * Update user và invalidate cache
 * Cache-Aside pattern: XÓA cache khi update
 */
export const updateUserById = async (userId, updates) => {
    // 1. Update user trong DB
    const updatedUser = await User.findByIdAndUpdate(
        userId, 
        updates, 
        { new: true }
    ).select("-password");
    
    if (!updatedUser) return null;
    
    // 2. Invalidate cache (xóa cache cũ)
    const cacheKey = `user:${userId.toString()}`;
    await redisClient.del(cacheKey);
    
    return updatedUser;
};

/**
 * Kiểm tra xem email có bị khóa tạm thời không
 */
export const isAccountLocked = async (email) => {
    const lockKey = `login_lock:${email}`;
    const isLocked = await redisClient.get(lockKey);
    return isLocked !== null;
};

/**
 * Lấy số lần đăng nhập sai
 */
export const getFailedLoginAttempts = async (email) => {
    const attemptsKey = `login_attempts:${email}`;
    const attempts = await redisClient.get(attemptsKey);
    return attempts ? parseInt(attempts) : 0;
};

/**
 * Tăng số lần đăng nhập sai
 * Trả về số lần thất bại hiện tại
 */
export const incrementFailedLoginAttempts = async (email) => {
    const attemptsKey = `login_attempts:${email}`;
    
    // Tăng counter lên 1
    const attempts = await redisClient.incr(attemptsKey);
    
    // Nếu là lần đầu tiên thất bại, set TTL 2 phút (120 giây)
    // Sau 2 phút sẽ tự động reset counter
    if (attempts === 1) {
        await redisClient.expire(attemptsKey, 120);
    }
    
    // Nếu đạt 5 lần thất bại, khóa tài khoản
    if (attempts >= 5) {
        const lockKey = `login_lock:${email}`;
        // Khóa tài khoản trong 2 phút
        await redisClient.setEx(lockKey, 120, "locked");
    }
    
    return attempts;
};

/**
 * Reset số lần đăng nhập sai khi đăng nhập thành công
 */
export const resetFailedLoginAttempts = async (email) => {
    const attemptsKey = `login_attempts:${email}`;
    await redisClient.del(attemptsKey);
};