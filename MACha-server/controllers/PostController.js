import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as postService from "../services/post.service.js";

export const createPost = async (req, res) => {
    try {
        const { content_text, media_url } = req.body;
        
        if (!content_text) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Content is required" });
        }

        const post = await postService.createPost(req.user._id, { content_text, media_url });

        return res.status(HTTP_STATUS.CREATED).json({ populatedPost: post });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPosts = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : null;
        const posts = await postService.getPosts(userId);

        return res.status(HTTP_STATUS.OK).json(posts);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPostById = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : null;
        const post = await postService.getPostById(req.params.id, userId);

        if (!post) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json(post);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const deletePost = async (req, res) => {
    try {
        const result = await postService.deletePost(req.params.id, req.user._id);

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Post deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPostsByHashtag = async (req, res) => {
    try {
        const { name } = req.params;
        const userId = req.user ? req.user._id : null;
        
        const result = await postService.getPostsByHashtag(name, userId);

        if (!result.success) {
            if (result.error === 'HASHTAG_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Hashtag not found" });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ 
            count: result.posts.length, 
            posts: result.posts 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const searchPostsByHashtag = async (req, res) => {
    try {
        const { hashtag, query } = req.query;
        const searchTerm = hashtag || query;
        const userId = req.user ? req.user._id : null;

        const result = await postService.searchPostsByHashtag(searchTerm, userId);

        if (!result.success) {
            if (result.error === 'EMPTY_SEARCH_TERM') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Search keyword is required" });
            }
        }

        if (result.posts.length === 0) {
            return res.status(HTTP_STATUS.OK).json({ message: "No matching hashtags found", posts: [] });
        }

        return res.status(HTTP_STATUS.OK).json({ 
            count: result.posts.length, 
            posts: result.posts 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}