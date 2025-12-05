import Like from "../models/like.js";
import { redisClient } from "../config/redis.js";

export const likePost = async (postId, userId) => {
    const like = await Like.findOne({ post: postId, user: userId });
    if (like) {
        return null;
    }

    const newLike = new Like({ post: postId, user: userId });
    await newLike.save();
    await newLike.populate("user", "username avatar");

    // Invalidate related caches
    await Promise.all([
        redisClient.del(`like:${postId}`),
        redisClient.del(`post:counts:${postId}`),
        redisClient.del(`post:liked:${postId}:${userId}`),
    ]);
    
    return newLike;
}

export const unlikePost = async (postId, userId) => {
    const like = await Like.findOneAndDelete({ post: postId, user: userId });
    if (!like) {
        return null;
    }

    // Invalidate related caches
    await Promise.all([
        redisClient.del(`like:${postId}`),
        redisClient.del(`post:counts:${postId}`),
        redisClient.del(`post:liked:${postId}:${userId}`),
    ]);
    
    return like;
}

export const getPostLikes = async (postId) => {
    const likeKey = `like:${postId}`;
    const cached = await redisClient.get(likeKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const likes = await Like.find({ post: postId }).populate("user", "username avatar");
    await redisClient.setEx(likeKey, 3600, JSON.stringify(likes));
    return likes;
}