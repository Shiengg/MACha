import CampaignUpdate from "../models/campaignUpdate.js";
import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";
import * as trackingService from "./tracking.service.js";

export const createCampaignUpdate = async (campaignId, userId, updateData) => {
    // Check if campaign exists and user is the creator
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }

    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }

    // Validate that at least one of content or image_url is provided
    const { content, image_url } = updateData;
    if (!content && !image_url) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Either content or image_url must be provided' };
    }

    // Create update
    const update = await CampaignUpdate.create({
        campaign: campaignId,
        creator: userId,
        content: content || null,
        image_url: image_url || null
    });

    // Populate creator info
    await update.populate("creator", "username avatar_url fullname");

    // Invalidate cache
    await redisClient.del(`campaign:${campaignId}:updates`);

    // Publish event (non-blocking)
    try {
        // Convert to plain object for serialization
        const updateObject = update.toObject ? update.toObject() : JSON.parse(JSON.stringify(update));
        const eventData = {
            updateId: update._id.toString(),
            campaignId: campaignId.toString(),
            creatorId: userId.toString(),
            update: updateObject
        };
        await trackingService.publishEvent("tracking:campaign:update:created", eventData);
    } catch (eventError) {
        console.error('Error publishing campaign update created event:', eventError);
    }

    return { success: true, update };
};

export const getCampaignUpdates = async (campaignId) => {
    const cacheKey = `campaign:${campaignId}:updates`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query database
    const updates = await CampaignUpdate.find({ campaign: campaignId })
        .populate("creator", "username avatar_url fullname")
        .sort({ createdAt: -1 });

    // Save to cache (TTL: 5 minutes)
    await redisClient.setEx(cacheKey, 300, JSON.stringify(updates));

    return updates;
};

export const deleteCampaignUpdate = async (updateId, userId) => {
    const update = await CampaignUpdate.findById(updateId);
    if (!update) {
        return { success: false, error: 'NOT_FOUND' };
    }

    // Check if user is the creator
    if (update.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }

    const campaignId = update.campaign.toString();
    await CampaignUpdate.findByIdAndDelete(updateId);

    // Invalidate cache
    await redisClient.del(`campaign:${campaignId}:updates`);

    // Publish event (non-blocking)
    try {
        const eventData = {
            updateId: updateId.toString(),
            campaignId: campaignId,
            creatorId: userId.toString()
        };
        await trackingService.publishEvent("tracking:campaign:update:deleted", eventData);
    } catch (eventError) {
        console.error('Error publishing campaign update deleted event:', eventError);
    }

    return { success: true };
};

