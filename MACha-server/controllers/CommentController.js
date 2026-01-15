import Comment from "../models/comment.js";
import Post from "../models/post.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as commentService from "../services/comment.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";

export const addComment = async (req, res) => {
    try {
        const { content_text } = req.body;

        if (!content_text) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Comment text required" })
        }

        const comment = await commentService.addComment({
            post: req.params.postId,
            user: req.user._id,
            content_text
        });

        try {
            await trackingService.publishEvent("tracking:comment:added", {
                postId: req.params.postId,
                userId: req.user._id,
                commentId: comment._id,
                content_text: content_text,
                username: req.user.username,
                fullname: req.user.fullname,
                avatar: req.user.avatar
            });

            // Fetch post to get postOwnerId for notification
            const post = await Post.findById(req.params.postId).select('user').lean();
            const postOwnerId = post?.user?.toString();

            const job = createJob(
                JOB_TYPES.COMMENT_ADDED,
                {
                    postId: req.params.postId,
                    userId: req.user._id.toString(),
                    commentId: comment._id.toString(),
                    content_text: content_text,
                    postOwnerId: postOwnerId // Include postOwnerId to avoid DB query in worker
                },
                {
                    userId: req.user._id.toString(),
                    source: JOB_SOURCE.API
                }
            );
            await queueService.pushJob(job);
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }

        return res.status(HTTP_STATUS.CREATED).json(comment);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getComments = async (req, res) => {
    try {
        const comments = await commentService.getComments(req.params.postId);
        return res.status(HTTP_STATUS.OK).json(comments);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteComment = async (req, res) => {
    try {
        // Lấy comment trước khi xóa để có postId
        const comment = await Comment.findById(req.params.commentId);
        
        if (!comment) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Comment not found" });
        }

        const result = await commentService.deleteComment(req.params.commentId, req.user._id);

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Comment not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
        }

        try {
            await trackingService.publishEvent("tracking:comment:deleted", {
                commentId: req.params.commentId,
                userId: req.user._id,
                postId: comment.post.toString(),
                username: req.user.username,
                avatar: req.user.avatar
            });
            
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Comment deleted" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}