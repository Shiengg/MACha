import * as campaignService from "../services/campaign.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaigns();
        res.status(HTTP_STATUS.OK).json({ campaigns });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignById = async (req, res) => {
    try {
        const campaignId = req.params.id;
        const campaign = await campaignService.getCampaignById(campaignId);

        if (!campaign) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" })
        }

        res.status(HTTP_STATUS.OK).json({ campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const createCampaign = async (req, res) => {
    try {
        const campaign = await campaignService.createCampaign({ ...req.body, creator: req.user._id });

        // Publish event và push job (không block response nếu fail)
        try {
            await trackingService.publishEvent("tracking:campaign:created", { 
                campaignId: campaign._id, 
                userId: req.user._id,
                title: campaign.title,
                goal_amount: campaign.goal_amount,
                current_amount: campaign.current_amount,
                start_date: campaign.start_date,
                end_date: campaign.end_date,
                status: campaign.status,
                proof_documents_url: campaign.proof_documents_url,
            });
            await queueService.pushJob({ 
                type: "CAMPAIGN_CREATED", 
                campaignId: campaign._id, 
                userId: req.user._id 
            });
        } catch (eventError) {
            console.error('Error publishing event or pushing job:', eventError);
        }

        return res.status(HTTP_STATUS.CREATED).json({ campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const updateCampaign = async (req, res) => {
    try {
        const result = await campaignService.updateCampaign(
            req.params.id, 
            req.user._id, 
            req.body
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "Campaign not found" 
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ 
                    message: HTTP_STATUS_TEXT.FORBIDDEN 
                });
            }
            if (result.error === 'CANNOT_UPDATE_AFTER_DONATION') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message,
                    restrictedFields: result.restrictedFields
                });
            }
            if (result.error === 'INVALID_STATUS_CHANGE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message 
                });
            }
        }

        // Publish tracking event
        try {
            await trackingService.publishEvent("tracking:campaign:updated", { 
                campaignId: result.campaign._id, 
                userId: req.user._id,
                title: result.campaign.title,
                goal_amount: result.campaign.goal_amount,
                current_amount: result.campaign.current_amount,
                status: result.campaign.status,
            });
        } catch (error) {
            console.error('Error publishing event:', error);
        }

        return res.status(HTTP_STATUS.OK).json({ campaign: result.campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        const result = await campaignService.deleteCampaign(req.params.id, req.user._id);

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "Campaign not found" 
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ 
                    message: HTTP_STATUS_TEXT.FORBIDDEN 
                });
            }
            if (result.error === 'CANNOT_DELETE_AFTER_DONATION') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message,
                    currentAmount: result.currentAmount
                });
            }
        }

        // Publish tracking event
        try {
            await trackingService.publishEvent("tracking:campaign:deleted", { 
                campaignId: req.params.id, 
                userId: req.user._id,
            });
        } catch (error) {
            console.error('Error publishing event:', error);
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Campaign deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const cancelCampaign = async (req, res) => {
    try {
        const { reason } = req.body;
        
        const result = await campaignService.cancelCampaign(
            req.params.id, 
            req.user._id, 
            reason
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "Campaign not found" 
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ 
                    message: HTTP_STATUS_TEXT.FORBIDDEN 
                });
            }
            if (result.error === 'ALREADY_CANCELLED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message 
                });
            }
        }

        // Publish tracking event
        try {
            await trackingService.publishEvent("tracking:campaign:cancelled", { 
                campaignId: result.campaign._id, 
                userId: req.user._id,
                reason: reason || 'No reason provided'
            });
        } catch (error) {
            console.error('Error publishing event:', error);
        }

        return res.status(HTTP_STATUS.OK).json({ 
            message: "Campaign cancelled successfully",
            campaign: result.campaign 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
