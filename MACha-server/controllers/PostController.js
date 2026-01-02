import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as postService from "../services/post.service.js";

export const createPost = async (req, res) => {
    try {
        const { content_text, media_url, campaign_id } = req.body;
        
        if (!content_text) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Content is required" });
        }

        const result = await postService.createPost(req.user._id, { content_text, media_url, campaign_id });

        if (result.success === false) {
            if (result.error === 'CAMPAIGN_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" });
            }
            if (result.error === 'CAMPAIGN_NOT_ACTIVE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Campaign is not active" });
            }
        }

        return res.status(HTTP_STATUS.CREATED).json({ populatedPost: result });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPosts = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : null;
        const userRole = req.user ? req.user.role : null;
        const posts = await postService.getPosts(userId, userRole);

        return res.status(HTTP_STATUS.OK).json(posts);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPostById = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : null;
        const userRole = req.user ? req.user.role : null;
        const post = await postService.getPostById(req.params.id, userId, userRole);

        if (!post) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json(post);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const updatePost = async (req, res) => {
    try {
        const { content_text, media_url, campaign_id } = req.body;
        
        if (!content_text) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Content is required" });
        }

        const result = await postService.updatePost(req.params.id, req.user._id, { content_text, media_url, campaign_id });

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
            if (result.error === 'CAMPAIGN_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" });
            }
            if (result.error === 'CAMPAIGN_NOT_ACTIVE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Campaign is not active" });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ populatedPost: result.post });
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
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user ? req.user._id : null;
        const userRole = req.user ? req.user.role : null;
        
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        
        const result = await postService.getPostsByHashtag(name, userId, userRole, pageNum, limitNum);

        if (!result.success) {
            if (result.error === 'HASHTAG_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Hashtag not found" });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ 
            count: result.posts.length, 
            posts: result.posts,
            pagination: result.pagination
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
        const userRole = req.user ? req.user.role : null;

        const result = await postService.searchPostsByHashtag(searchTerm, userId, userRole);

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

export const searchPostsByTitle = async (req, res) => {
    try {
        const { q, query, title, limit } = req.query;
        
        const searchTerm = q || query || title;
        const userId = req.user ? req.user._id : null;
        const userRole = req.user ? req.user.role : null;

        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Search term is required"
            });
        }

        const limitNum = limit ? parseInt(limit) : 50;
        const result = await postService.searchPostsByTitle(searchTerm, userId, userRole, limitNum);

        if (!result.success) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
                message: "Error searching posts" 
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            query: searchTerm,
            count: result.posts.length,
            posts: result.posts
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}