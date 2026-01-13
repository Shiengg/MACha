import { HTTP_STATUS } from "../utils/status.js";
import * as campaignCompanionService from "../services/campaignCompanion.service.js";

export const join = async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "Only individual users can join as companion"
            });
        }

        const { campaignId } = req.params;
        const userId = req.user._id;

        const companion = await campaignCompanionService.joinCampaign(userId, campaignId);

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            companion: {
                _id: companion._id,
                user: companion.user,
                campaign: companion.campaign,
                joined_at: companion.joined_at
            },
            message: "Đã đồng hành chiến dịch thành công"
        });
    } catch (error) {
        if (error.message === "Campaign not found") {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: error.message
            });
        }
        if (error.message === "User already joined this campaign as companion") {
            return res.status(HTTP_STATUS.CONFLICT).json({
                message: error.message
            });
        }
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const leave = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user._id;

        await campaignCompanionService.leaveCampaign(userId, campaignId);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Đã rời khỏi chiến dịch đồng hành"
        });
    } catch (error) {
        if (error.message === "Companion not found or already left") {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: error.message
            });
        }
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const getCampaignCompanions = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const result = await campaignCompanionService.getCampaignCompanions(campaignId, page, limit);

        return res.status(HTTP_STATUS.OK).json({
            companions: result.companions.map(c => ({
                _id: c._id,
                user: c.user,
                joined_at: c.joined_at
            })),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

export const getUserCompanionCampaigns = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const result = await campaignCompanionService.getUserCompanionCampaigns(userId, page, limit);

        return res.status(HTTP_STATUS.OK).json({
            campaigns: result.campaigns,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message
        });
    }
};

