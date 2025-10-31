import Post from "../models/post.js";
import Like from "../models/like.js";
import Comment from "../models/comment.js";
import Hashtag from "../models/Hashtag.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const createPost = async (req, res) => {
    try {
        const { content_text, media_url } = req.body;
        if (!content_text) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Content is required" })
        }

        const hashtagsInText = content_text.match(/#\w+/g) || [];
        const hashtagNames = hashtagsInText.map((tag) =>
            tag.substring(1).toLowerCase()
        );

        const hashtags = await Promise.all(
            hashtagNames.map(async (name) => {
                let existing = await Hashtag.findOne({ name });
                if (!existing) {
                    existing = await Hashtag.create({ name });
                }
                return existing;
            })
        );

        const post = await Post.create({
            user: req.user._id,
            content_text,
            media_url,
            hashtags: hashtags.map((h) => h._id),
        });

        const populatedPost = await post.populate([
            { path: "user", select: "username avatar_url" },
            { path: "hashtags", select: "name" },
        ]);

        return res.status(HTTP_STATUS.CREATED).json({ populatedPost })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find().populate("user", "username avatar").sort({ createdAt: -1 });
        return res.status(HTTP_STATUS.OK).json(posts);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate("user", "username avatar");

        if (!post) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND })
        }

        return res.status(HTTP_STATUS.OK).json(post);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND })
        }

        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN })
        }

        await post.deleteOne();
        await Like.deleteMany({ post: req.params.id });
        await Comment.deleteMany({ post: req.params.id });

        return res.status(HTTP_STATUS.OK).json({ message: "Post deleted successfully" })
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getPostsByHashtag = async (req, res) => {
    try {
        const { name } = req.params;

        const hashtag = await Hashtag.findOne({ name: name.toLowerCase() });
        if (!hashtag) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Hashtag not found" });
        }

        const posts = await Post.find({ hashtags: hashtag._id })
            .populate("user", "username avatar")
            .populate("hashtags", "name")
            .sort({ created_at: -1 });

        return res.status(HTTP_STATUS.OK).json({ count: posts.length, posts });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const searchPostsByHashtag = async (req, res) => {
    try {
        const { hashtag, query } = req.query;
        const searchTerm = hashtag || query;

        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Search keyword is required" });
        }

        const matchingHashtags = await Hashtag.find({
            name: { $regex: searchTerm, $options: "i" },
        });

        if (matchingHashtags.length === 0) {
            return res.status(HTTP_STATUS.OK).json({ message: "No matching hashtags found", posts: [] });
        }

        const hashtagIds = matchingHashtags.map((h) => h._id);

        const posts = await Post.find({ hashtags: { $in: hashtagIds } })
            .populate("user", "username avatar_url")
            .populate("hashtags", "name")
            .sort({ created_at: -1 });

        return res.status(HTTP_STATUS.OK).json({ count: posts.length, posts });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}