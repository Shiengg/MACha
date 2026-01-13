import CampaignCompanion from "../models/campaignCompanion.js";
import Campaign from "../models/campaign.js";
import User from "../models/user.js";
import { redisClient } from "../config/redis.js";

export const joinCampaign = async (userId, campaignId) => {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        throw new Error("Campaign not found");
    }

    const existingCompanion = await CampaignCompanion.findOne({
        user: userId,
        campaign: campaignId
    });

    if (existingCompanion) {
        if (existingCompanion.is_active) {
            throw new Error("User already joined this campaign as companion");
        } else {
            existingCompanion.is_active = true;
            existingCompanion.joined_at = new Date();
            await existingCompanion.save();
            await existingCompanion.populate("user", "username fullname avatar");
            await existingCompanion.populate("campaign", "title");
            await invalidateCampaignCompanionCaches(userId, campaignId);
            return existingCompanion;
        }
    }

    const companion = await CampaignCompanion.create({
        user: userId,
        campaign: campaignId,
        joined_at: new Date(),
        is_active: true
    });

    await companion.populate("user", "username fullname avatar");
    await companion.populate("campaign", "title");

    await invalidateCampaignCompanionCaches(userId, campaignId);

    return companion;
};

export const leaveCampaign = async (userId, campaignId) => {
    const companion = await CampaignCompanion.findOne({
        user: userId,
        campaign: campaignId,
        is_active: true
    });

    if (!companion) {
        throw new Error("Companion not found or already left");
    }

    companion.is_active = false;
    await companion.save();

    await invalidateCampaignCompanionCaches(userId, campaignId);

    return companion;
};

export const getCampaignCompanions = async (campaignId, page = 0, limit = 20) => {
    const cacheKey = `campaigns:companions:${campaignId}:page:${page}:limit:${limit}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const skip = page * limit;
    const companions = await CampaignCompanion.find({
        campaign: campaignId,
        is_active: true
    })
        .populate("user", "username fullname avatar")
        .sort({ joined_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await CampaignCompanion.countDocuments({
        campaign: campaignId,
        is_active: true
    });

    const result = {
        companions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

    return result;
};

export const getUserCompanionCampaigns = async (userId, page = 0, limit = 20) => {
    const cacheKey = `users:companions:${userId}:page:${page}:limit:${limit}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const skip = page * limit;
    const companions = await CampaignCompanion.find({
        user: userId,
        is_active: true
    })
        .populate({
            path: "campaign",
            select: "title banner_image current_amount goal_amount status creator",
            populate: {
                path: "creator",
                select: "username fullname"
            }
        })
        .sort({ joined_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await CampaignCompanion.countDocuments({
        user: userId,
        is_active: true
    });

    const campaigns = companions
        .filter(c => c.campaign && c.campaign.status === "active")
        .map(c => ({
            ...c.campaign,
            joined_at: c.joined_at
        }));

    const result = {
        campaigns,
        total: campaigns.length,
        page,
        limit,
        totalPages: Math.ceil(campaigns.length / limit)
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

    return result;
};

export const checkIsCompanion = async (userId, campaignId) => {
    const companion = await CampaignCompanion.findOne({
        user: userId,
        campaign: campaignId,
        is_active: true
    });

    return companion !== null;
};

export const getCompanionById = async (companionId) => {
    const companion = await CampaignCompanion.findById(companionId)
        .populate("user", "username fullname avatar")
        .populate("campaign", "title");

    return companion;
};

export const validateCompanionForDonation = async (companionId, userId, campaignId) => {
    const companion = await CampaignCompanion.findById(companionId);

    if (!companion) {
        throw new Error("Companion not found");
    }

    if (companion.user.toString() !== userId.toString()) {
        throw new Error("User is not the owner of this companion");
    }

    if (companion.campaign.toString() !== campaignId.toString()) {
        throw new Error("Companion does not belong to this campaign");
    }

    if (!companion.is_active) {
        throw new Error("Companion is not active");
    }

    return companion;
};

const invalidateCampaignCompanionCaches = async (userId, campaignId) => {
    const keysToDelete = [
        `campaign:${campaignId}`,
    ];

    try {
        const pattern1 = `campaigns:companions:${campaignId}:*`;
        const pattern2 = `users:companions:${userId}:*`;
        
        const keys1 = await redisClient.keys(pattern1);
        const keys2 = await redisClient.keys(pattern2);
        
        keysToDelete.push(...keys1, ...keys2);

        if (keysToDelete.length > 0) {
            await Promise.all(keysToDelete.map(key => redisClient.del(key)));
        }
    } catch (error) {
        console.error('Error invalidating companion caches:', error);
    }
};

