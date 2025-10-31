import User from "../models/user.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const followUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id;

        if (targetUserId === currentUserId.toString()) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "You can't follow your own account.." })
        }

        const targetUser = await User.findById(targetUserId)
        const currentUser = await User.findById(currentUserId);

        if (!targetUser) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "We couldn't find the user you want to follow." })
        }

        if (currentUser.following.includes(targetUserId)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "You're already following this person." })
        }

        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);

        currentUser.following_count++;
        targetUser.followers_count++;

        await currentUser.save();
        await targetUser.save();

        return res.status(HTTP_STATUS.OK).json({ message: "Followed successfully.", following: targetUserId })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const unfollowUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id;

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        if (!targetUser) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "We couldn't find the user you want to unfollow." })
        }

        if (!currentUser.following.includes(targetUserId)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "You're not following this person." })
        }

        currentUser.following.pull(targetUserId);
        targetUser.followers.pull(currentUserId);

        currentUser.following_count = currentUser.following_count > 0 ? currentUser.following_count - 1 : 0;
        targetUser.followers_count = targetUser.followers_count > 0 ? targetUser.followers_count - 1 : 0;

        await currentUser.save();
        await targetUser.save();

        return res.status(HTTP_STATUS.OK).json({ message: "Successfully unfollowed." })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getFollowers = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("followers", "username full_name avatar").select("followers followers_count");

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND })
        }

        return res.status(HTTP_STATUS.OK).json({
            count: user.followers_count,
            followers: user.followers,
        })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getFollowing = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("following", "username full_name avatar").select("following following_count");

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND })
        }

        return res.status(HTTP_STATUS.OK).json({
            count: user.following_count,
            following: user.following,
        })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.query;

        if (!query) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Search keyword is missing." })
        }

        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ],
        }).select("username full_name avatar bio");

        return res.status(HTTP_STATUS.OK).json({ results: users });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}