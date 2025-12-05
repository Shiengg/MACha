import Comment from "../models/comment.js";
import { redisClient } from "../config/redis.js";

export const addComment = async (payload) => {
    const comment = new Comment(payload);
    await comment.save();
    
    // Populate user information
    await comment.populate("user", "username avatar");
    
    // Invalidate related caches
    await Promise.all([
        redisClient.del(`comments:${payload.post}`),
        redisClient.del(`post:counts:${payload.post}`),
    ]);
    
    return comment;
}

export const getComments = async (postId) => {
    const commentKey = `comments:${postId}`;
    const cached = await redisClient.get(commentKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const comments = await Comment.find({ post: postId })
                .populate("user", "username avatar")    
                .sort({ createdAt: -1 });

    await redisClient.setEx(commentKey, 3600, JSON.stringify(comments));
    return comments;
}

export const deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    // Check ownership in service
    if (comment.user.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    await comment.deleteOne();
    
    // Invalidate related caches
    await Promise.all([
        redisClient.del(`comments:${comment.post}`),
        redisClient.del(`post:counts:${comment.post}`),
    ]);
    
    return { success: true };
}
