import User from "../models/user.js";
import { redisClient } from "../config/redis.js";
import bcrypt from "bcryptjs";

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
        is_verified: user.is_verified,
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

export const createOtp = async (userId) => {
    const expiresIn = 600;
    const OTPKey = `otp:${userId}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    await redisClient.setEx(OTPKey, expiresIn, hashedOtp);
    return { otp: parseInt(otp), expiresIn };
};

export const verifyOtp = async (userId, otp) => {
    const OTPKey = `otp:${userId}`;
    const storedHashedOtp = await redisClient.get(OTPKey);

    if (!storedHashedOtp) {
        throw new Error("OTP không hợp lệ hoặc đã hết hạn");
    }

    const isValid = await bcrypt.compare(otp.toString(), storedHashedOtp);

    if (!isValid) {
        throw new Error("OTP không hợp lệ");
    }

    await redisClient.del(OTPKey);

    return true;
};

const getChangePasswordKey = (userId) => `change_pw_verified:${userId}`;
const getUserAccountKey = (userId) => `user_account_verified:${userId}`;

export const verifyOtpForChangePassword = async (userId, otp) => {
    await verifyOtp(userId, otp);

    const changePwKey = getChangePasswordKey(userId);
    const expiresIn = 600;
    await redisClient.setEx(changePwKey, expiresIn, "true");

    return true;
};

export const verifyOtpForUserAccount = async (userId, otp) => {
    await verifyOtp(userId, otp);

    const userAccountKey = getUserAccountKey(userId);
    const expiresIn = 600;
    await redisClient.setEx(userAccountKey, expiresIn, "true");
}

export const changePassword = async (userId, newPassword) => {
    const changePwKey = getChangePasswordKey(userId);
    const isVerified = await redisClient.get(changePwKey);

    if (!isVerified) {
        throw new Error("OTP chưa được xác thực hoặc đã hết hạn");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    if (await bcrypt.compare(newPassword, user.password)) {
        throw new Error("Mật khẩu mới không được trùng với mật khẩu cũ");
    }

    user.password = newPassword;
    await user.save();

    await redisClient.del(changePwKey);

    return { success: true, message: "Đổi mật khẩu thành công" };
}

export const forgotPassword = async (email) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    const newPassword = Math.random().toString(36).substring(2, 15);
    user.password = newPassword;
    await user.save();

    return newPassword;
}

export const cleanupUnverifiedUsers = async (days = 3) => {
    return User.deleteMany({
        is_verified: false,
        createdAt: {
            $lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
    });
}