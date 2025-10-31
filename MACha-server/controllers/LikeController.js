import Like from "../models/like.js";
import { HTTP_STATUS } from "../utils/status.js";

export const likePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const exist = await Like.findOne({ post: postId, user: req.user._id });

        if (exist) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Already liked" });

        await Like.create({ post: postId, user: req.user._id });
        return res.status(HTTP_STATUS.CREATED).json({ message: "Post liked" });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const unlikePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const like = await Like.findOneAndDelete({ post: postId, user: req.user._id });

        if (!like) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Like not found" });

        return res.status(HTTP_STATUS.OK).json({ message: "Post unliked" });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getPostLikes = async (req, res) => {
    try {
        const postId = req.params.postId;
        const likes = await Like.find({ post: postId }).populate("user", "username avatar_url");

        return res.status(HTTP_STATUS.OK).json({
            totalLikes: likes.length,
            users: likes.map((l) => l.user),
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
