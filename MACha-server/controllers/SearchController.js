import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as searchService from "../services/search.service.js";

export const saveSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { query } = req.body;

        if (!query) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Search query is required"
            });
        }

        const result = await searchService.saveSearchHistory(userId, query);

        if (!result.success) {
            if (result.error === 'EMPTY_QUERY') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Search query cannot be empty"
                });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to save search history"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Search history saved successfully"
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const getSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await searchService.getSearchHistory(userId);

        if (!result.success) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to fetch search history"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            history: result.history
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const getAllSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await searchService.getAllSearchHistory(userId);

        if (!result.success) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to fetch all search history"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            history: result.history
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const deleteSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { historyIds } = req.body;

        if (!historyIds || !Array.isArray(historyIds) || historyIds.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "History IDs array is required"
            });
        }

        const result = await searchService.deleteSearchHistory(userId, historyIds);

        if (!result.success) {
            if (result.error === 'INVALID_IDS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Invalid history IDs"
                });
            }
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to delete search history"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Search history deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const deleteAllSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await searchService.deleteAllSearchHistory(userId);

        if (!result.success) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to delete all search history"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "All search history deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

