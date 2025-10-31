import Campaign from "../models/campaign.js";
import { HTTP_STATUS } from "../utils/status.js";

export const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find().populate("creator", "username avatar");
        res.status(HTTP_STATUS.OK).json({ campaigns });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).populate("creator", "username");

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
        const campaign = await Campaign.create({ ...req.body, creator: req.user._id });
        res.status(HTTP_STATUS.CREATED).json({ campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(HTTP_STATUS.OK).json(campaign);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);

        if (!campaign) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" })
        }
        res.status(HTTP_STATUS.OK).json({ message: "Campaign deleted" });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};