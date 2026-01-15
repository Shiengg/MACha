import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as userService from "../services/user.service.js";
import * as searchService from "../services/search.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";

export const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();

        return res.status(HTTP_STATUS.OK).json({
            count: users.length,
            users
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await userService.getUserById(userId);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "User not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json({ user });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const followUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id;

        const result = await userService.followUser(currentUserId, targetUserId);

        if (!result.success) {
            if (result.error === 'SELF_FOLLOW') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "You can't follow your own account."
                });
            }
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "We couldn't find the user you want to follow."
                });
            }
            if (result.error === 'ALREADY_FOLLOWING') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "You're already following this person."
                });
            }
        }

        try {
            await trackingService.publishEvent("tracking:user:followed", {
                followerId: currentUserId,
                targetUserId: targetUserId
            });
            const job = createJob(
                JOB_TYPES.USER_FOLLOWED,
                {
                    followerId: currentUserId.toString(),
                    targetUserId: targetUserId
                },
                {
                    userId: currentUserId.toString(),
                    source: JOB_SOURCE.API
                }
            );
            await queueService.pushJob(job);
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Followed successfully.",
            following: result.targetUserId
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const unfollowUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id;

        const result = await userService.unfollowUser(currentUserId, targetUserId);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "We couldn't find the user you want to unfollow."
                });
            }
            if (result.error === 'NOT_FOLLOWING') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "You're not following this person."
                });
            }
        }

        try {
            await trackingService.publishEvent("tracking:user:unfollowed", {
                followerId: currentUserId,
                targetUserId: targetUserId
            });
        } catch (error) {
            console.error('Error publishing unfollow event:', error);
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Successfully unfollowed." });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getFollowers = async (req, res) => {
    try {
        const result = await userService.getFollowers(req.params.id);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getFollowing = async (req, res) => {
    try {
        const result = await userService.getFollowing(req.params.id);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPublicAdmins = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await userService.getPublicAdmins(page, limit);
        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { q, query, limit } = req.query;
        
        // Support multiple parameter names: q, query (consistent with campaign search)
        const searchTerm = q || query;

        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Search term is required"
            });
        }

        // Validate minimum search length
        if (searchTerm.trim().length < 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Search term is too short"
            });
        }

        const limitNum = limit ? parseInt(limit) : 50;
        const result = await userService.searchUsers(searchTerm, limitNum);

        if (!result.success) {
            if (result.error === 'EMPTY_QUERY') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Search keyword is missing."
                });
            }
            if (result.error === 'QUERY_TOO_SHORT') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Search term is too short"
                });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Search failed"
            });
        }

        // Save search history with USER_SEARCH type (async, don't wait for it)
        // This is only called when explicitly searching users via /api/users/search endpoint
        // General search page that also searches users should NOT save USER_SEARCH history
        const userId = req.user?._id;
        if (userId) {
            searchService.saveSearchHistory(userId, searchTerm, "USER_SEARCH")
                .catch(err => {
                    console.error('Error saving user search history:', err);
                    // Don't fail the request if history save fails
                });
        }

        return res.status(HTTP_STATUS.OK).json({
            query: searchTerm,
            count: result.users.length,
            users: result.users
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}