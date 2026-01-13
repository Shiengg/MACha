import { redisClient } from "../config/redis.js";
import { HTTP_STATUS } from "../utils/status.js";
import dotenv from 'dotenv';
dotenv.config();

export const rateLimit = (options = {}) => {
    // Cho phép tắt toàn bộ rate limit khi testing (ví dụ với k6)
    // Đặt RATE_LIMIT_ENABLED=false trong .env hoặc env runtime
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
        return (req, res, next) => next();
    }

    const {
        maxRequests = 5,
        windowSeconds = 60,
        keyPrefix = 'rate_limit',
        keyGenerator = (req) => req.ip || req.connection.remoteAddress,
        message = null
    } = options;

    return async (req, res, next) => {
        try {
            // Tạo unique key cho user/IP này
            const identifier = keyGenerator(req);
            const rateKey = `${keyPrefix}:${identifier}`;

            // Tăng counter
            const currentCount = await redisClient.incr(rateKey);

            // Nếu là request đầu tiên, set TTL
            if (currentCount === 1) {
                await redisClient.expire(rateKey, windowSeconds);
            }

            // Lấy TTL còn lại
            const ttl = await redisClient.ttl(rateKey);

            // Set headers để client biết rate limit status
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
            res.setHeader('X-RateLimit-Reset', Date.now() + (ttl * 1000));

            // Kiểm tra có vượt quá limit không
            if (currentCount > maxRequests) {
                const defaultMessage = `Quá nhiều requests. Vui lòng thử lại sau ${ttl} giây.`;
                return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                    message: message || defaultMessage,
                    retryAfter: ttl
                });
            }

            // Cho phép request tiếp tục
            next();
        } catch (error) {
            console.error('Rate limit error:', error);
            // Nếu Redis lỗi, vẫn cho request đi qua (fail-open)
            next();
        }
    };
};

/**
 * Rate limit theo email (cho login/signup)
 */
export const rateLimitByEmail = (maxRequests = 5, windowSeconds = 60) => {
    return rateLimit({
        maxRequests,
        windowSeconds,
        keyPrefix: 'rate_limit:email',
        keyGenerator: (req) => req.body.email || req.ip,
        message: `Quá nhiều lần thử với email này. Vui lòng thử lại sau ${windowSeconds} giây.`
    });
};

/**
 * Rate limit theo userId (cho authenticated routes)
 */
export const rateLimitByUserId = (maxRequests = 10, windowSeconds = 60) => {
    return rateLimit({
        maxRequests,
        windowSeconds,
        keyPrefix: 'rate_limit:user',
        keyGenerator: (req) => req.user?._id?.toString() || req.ip,
        message: `Quá nhiều requests. Vui lòng thử lại sau ${windowSeconds} giây.`
    });
};

/**
 * Rate limit theo IP (general purpose)
 */
export const rateLimitByIP = (maxRequests = 100, windowSeconds = 60) => {
    return rateLimit({
        maxRequests,
        windowSeconds,
        keyPrefix: 'rate_limit:ip',
        keyGenerator: (req) => req.ip || req.connection.remoteAddress
    });
};

