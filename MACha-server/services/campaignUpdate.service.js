import CampaignUpdate from "../models/campaignUpdate.js";
import Campaign from "../models/campaign.js";
import Escrow from "../models/escrow.js";
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

    // Check if this update fulfills any escrow post-release requirement
    // Logic: Một CampaignUpdate được coi là HOÀN THÀNH NGHĨA VỤ nếu:
    // - campaignUpdate.campaign == escrow.campaign
    // - campaignUpdate.creator == campaign.creator
    // - campaignUpdate.createdAt ∈ [released_at, update_required_by]
    try {
        const updateCreatedAt = update.createdAt;
        
        // Query escrows với điều kiện:
        // - request_status = "released"
        // - campaign = campaignId
        // - update_fulfilled_at == null (chưa được fulfill)
        // - update_required_by != null (có deadline)
        // - released_at != null (đã được release)
        const pendingEscrows = await Escrow.find({
            campaign: campaignId,
            request_status: "released",
            update_fulfilled_at: null,
            update_required_by: { $ne: null },
            released_at: { $ne: null }
        });

        for (const escrow of pendingEscrows) {
            // Check nếu update nằm trong khoảng [released_at, update_required_by]
            if (
                updateCreatedAt >= escrow.released_at &&
                updateCreatedAt <= escrow.update_required_by
            ) {
                // Update fulfills requirement → set update_fulfilled_at
                // Không rollback nếu đã set (idempotency)
                if (!escrow.update_fulfilled_at) {
                    escrow.update_fulfilled_at = updateCreatedAt;
                    await escrow.save();
                    
                    console.log(`[Campaign Update] Update ${update._id} fulfills escrow ${escrow._id} requirement (milestone ${escrow.milestone_percentage}%, deadline: ${escrow.update_required_by.toISOString()})`);
                }
            }
        }

        // ✅ YÊU CẦU 3: Chuyển campaign.status từ "voting" → "active" khi creator update hợp lệ
        // Kiểm tra xem có escrow nào khác đang pending update không
        // Nếu tất cả escrow đã fulfilled, chuyển campaign.status = "active"
        try {
            const allReleasedEscrows = await Escrow.find({
                campaign: campaignId,
                request_status: "released",
                update_required_by: { $ne: null },
                released_at: { $ne: null }
            });

            // Kiểm tra xem tất cả escrow đã fulfilled chưa
            const allFulfilled = allReleasedEscrows.every(escrow => escrow.update_fulfilled_at !== null);

            // Nếu campaign đang ở trạng thái "voting" và tất cả escrow đã fulfilled, chuyển sang "active"
            if (campaign.status === "voting" && allFulfilled && allReleasedEscrows.length > 0) {
                campaign.status = "active";
                await campaign.save();
                
                console.log(`[Campaign Update] Campaign ${campaignId} status changed from "voting" to "active" after all escrow requirements fulfilled`);
                
                // Invalidate cache
                await redisClient.del(`campaign:${campaignId}`);
                await redisClient.del('campaigns');
            }
        } catch (statusError) {
            // Log error nhưng không fail createCampaignUpdate
            console.error(`[Campaign Update] Error checking campaign status change for update ${update._id}:`, statusError);
        }
    } catch (error) {
        // Log error nhưng không fail createCampaignUpdate
        console.error(`[Campaign Update] Error checking escrow fulfillment for update ${update._id}:`, error);
    }

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

