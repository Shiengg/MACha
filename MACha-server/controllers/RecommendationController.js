import * as recommendationService from "../services/recommendation.service.js";
import { HTTP_STATUS } from "../utils/status.js";

/**
 * Get recommended campaigns for the authenticated user
 * @route GET /api/recommendations
 * @access Private (requires authentication)
 */
export const getRecommendedCampaigns = async (req, res) => {
    try {
        const userId = req.user?._id;
        const limit = parseInt(req.query.limit) || 10;

        // Validate limit
        if (limit < 1 || limit > 50) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Limit must be between 1 and 50"
            });
        }

        if (!userId) {
            // For anonymous users, return popular campaigns
            const result = await recommendationService.getAnonymousRecommendations(limit);
            return res.status(HTTP_STATUS.OK).json(result);
        }

        // Get personalized recommendations for authenticated user
        const result = await recommendationService.getRecommendedCampaigns(
            userId.toString(),
            limit
        );

        return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
        console.error("Error in getRecommendedCampaigns controller:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Failed to get recommended campaigns"
        });
    }
};

/**
 * Get recommended campaigns for anonymous users
 * @route GET /api/recommendations/anonymous
 * @access Public
 */
export const getAnonymousRecommendations = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Validate limit
        if (limit < 1 || limit > 50) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Limit must be between 1 and 50"
            });
        }

        const result = await recommendationService.getAnonymousRecommendations(limit);

        return res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
        console.error("Error in getAnonymousRecommendations controller:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Failed to get recommended campaigns"
        });
    }
};

