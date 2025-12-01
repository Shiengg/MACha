import Comment from "../models/comment.js";
import { redisClient } from "../config/redis.js";

export const addComment = async (payload) => {
    const comment = new Comment(payload);
    await comment.save();
    
    // Populate user information
    await comment.populate("user", "username avatar");
    
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

export const deleteComment = async (commentId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        return null;
    }

    await comment.deleteOne();
    console.log(`Deleted comment ${commentId}`);
    await redisClient.del(`comments:${comment.post}`);
    console.log(`Deleted comments cache for post ${comment.post}`);
    return comment;
}
