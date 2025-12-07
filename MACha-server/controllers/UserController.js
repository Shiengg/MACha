import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as userService from "../services/user.service.js";

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

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.query;

        const result = await userService.searchUsers(query);

        if (!result.success) {
            if (result.error === 'EMPTY_QUERY') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "Search keyword is missing." 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ results: result.users });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}