import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";

export const getCampaigns = async () => {
    const campaignKey = 'campaigns';
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const campaigns = await Campaign.find().populate("creator", "username avatar");
    await redisClient.setEx(campaignKey, 3600, JSON.stringify(campaigns));

    return campaigns;
}

export const getCampaignById = async (campaignId) => {
    const campaignKey = `campaign:${campaignId}`;
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const campaign = await Campaign.findById(campaignId).populate("creator", "username");
    if (!campaign) {
        return null;
    }

    await redisClient.setEx(campaignKey, 3600, JSON.stringify(campaign));
    return campaign;
}

export const createCampaign = async (payload) => {
    const campaign = new Campaign(payload);
    await campaign.save();
    return campaign;
}

export const updateCampaign = async (campaignId, payload) => {
    const campaign = await Campaign.findByIdAndUpdate(campaignId, payload, { new: true });
    if (!campaign) {
        return null;
    }

    await redisClient.del(`campaign:${campaignId}`);
    return campaign;
}

export const deleteCampaign = async (campaignId) => {
    const campaign = await Campaign.findByIdAndDelete(campaignId);
    if (!campaign) {
        return null;
    }

    await redisClient.del(`campaign:${campaignId}`);
    return campaign;
}