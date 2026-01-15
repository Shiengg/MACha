import { HTTP_STATUS } from "../utils/status.js";
import * as likeService from "../services/like.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";
import Post from "../models/post.js";

export const likePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const newLike = await likeService.likePost(postId, req.user._id);

        if (!newLike) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Already liked" });
        try {
            await trackingService.publishEvent("tracking:post:liked", {
                postId: postId,
                userId: req.user._id,
            });
            
            // Fetch post to get postOwnerId for notification
            const post = await Post.findById(postId).select('user').lean();
            const postOwnerId = post?.user?.toString();
            
            const job = createJob(
                JOB_TYPES.POST_LIKED,
                {
                    postId: postId,
                    userId: req.user._id.toString(),
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

        return res.status(HTTP_STATUS.CREATED).json(newLike);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const unlikePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const unliked = await likeService.unlikePost(postId, req.user._id);

        if (!unliked) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Like not found" });
        try {
            await trackingService.publishEvent("tracking:post:unliked", {
                postId: postId,
                userId: req.user._id,
            });
            // Note: POST_UNLIKED job type doesn't exist - unlike doesn't need notification
        } catch (error) {
            console.error('Error publishing event:', error);
        }

        return res.status(HTTP_STATUS.OK).json(unliked);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getPostLikes = async (req, res) => {
    try {
        const postId = req.params.postId;
        const likes = await likeService.getPostLikes(postId);

        return res.status(HTTP_STATUS.OK).json(likes);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
