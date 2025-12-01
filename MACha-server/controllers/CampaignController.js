import * as campaignService from "../services/campaign.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import { HTTP_STATUS } from "../utils/status.js";
import Campaign from "../models/campaign.js";

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
            // Log error nhưng vẫn trả về success response
            console.error('Error publishing event or pushing job:', eventError);
        }

        // Response sau khi hoàn thành tất cả
        return res.status(HTTP_STATUS.CREATED).json({ campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const updateCampaign = async (req, res) => {
    try {
        const campaign = await campaignService.updateCampaign(req.params.id, req.body);

        try {
            await trackingService.publishEvent("tracking:campaign:updated", { 
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
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }
        return res.status(HTTP_STATUS.OK).json(campaign);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        const campaign = await campaignService.deleteCampaign(req.params.id);

        if (!campaign) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" })
        }
        try {
            await trackingService.publishEvent("tracking:campaign:deleted", { 
                campaignId: campaign._id, 
                userId: req.user._id,
            });
        } catch (error) {
            console.error('Error publishing event or pushing job:', error);
        }
        return res.status(HTTP_STATUS.OK).json({ message: "Campaign deleted" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};