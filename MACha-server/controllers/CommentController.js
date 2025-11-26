import Comment from "../models/comment.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const addComment = async (req, res) => {
    try {
        const { content_text } = req.body;

        if (!content_text) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Comment text required" })
        }

        const comment = await Comment.create({
            post: req.params.postId,
            user: req.user._id,
            content_text
        })

        const populatedComment = await comment.populate("user", "username avatar");

        return res.status(HTTP_STATUS.CREATED).json(populatedComment);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.postId })
            .populate("user", "username avatar")
            .sort({ createdAt: -1 });

        return res.status(HTTP_STATUS.OK).json(comments);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const deleteComments = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Comment not found" });
        }

        if (comment.user.toString() !== req.user._id.toString()) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
        }

        await comment.deleteOne();
        return res.status(HTTP_STATUS.OK).json({ message: "Comment deleted" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}