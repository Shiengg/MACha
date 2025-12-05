import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";

/**
 * Get all campaigns with Cache-Aside Pattern
 */
export const getCampaigns = async () => {
    const campaignKey = 'campaigns:all';
    
    // 1. Check cache first
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // 2. Cache miss - Query database
    const campaigns = await Campaign.find().populate("creator", "username avatar");
    
    // 3. Cache for 1 hour
    await redisClient.setEx(campaignKey, 3600, JSON.stringify(campaigns));

    return campaigns;
}

/**
 * Get campaign by ID with Cache-Aside Pattern
 */
export const getCampaignById = async (campaignId) => {
    const campaignKey = `campaign:${campaignId}`;
    
    // 1. Check cache first
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // 2. Cache miss - Query database
    const campaign = await Campaign.findById(campaignId).populate("creator", "username");
    if (!campaign) {
        return null;
    }

    // 3. Cache for 1 hour
    await redisClient.setEx(campaignKey, 3600, JSON.stringify(campaign));
    return campaign;
}

/**
 * Create new campaign
 */
export const createCampaign = async (payload) => {
    const campaign = new Campaign(payload);
    await campaign.save();

    // Invalidate campaigns list cache
    await redisClient.del('campaigns:all');
    
    return campaign;
}

/**
 * Update campaign with restrictions after donations
 */
export const updateCampaign = async (campaignId, userId, payload) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    // 1. Check ownership
    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    // 2. Check if campaign has donations
    if (campaign.current_amount > 0) {
        // Only allow updating certain fields after donations
        const allowedFields = [
            'description',
            'media_url', 
            'proof_documents_url',
            'status' // Only allow changing to 'completed' or 'cancelled'
        ];
        
        const updates = {};
        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                updates[field] = payload[field];
            }
        }
        
        // Validate status change
        if (payload.status && !['completed', 'cancelled'].includes(payload.status)) {
            return { 
                success: false, 
                error: 'INVALID_STATUS_CHANGE',
                message: 'Can only change status to completed or cancelled after receiving donations'
            };
        }
        
        // PREVENT changing critical fields
        const restrictedFields = ['goal_amount', 'end_date', 'title'];
        const attemptedRestrictedFields = restrictedFields.filter(field => payload[field] !== undefined);
        
        if (attemptedRestrictedFields.length > 0) {
            return { 
                success: false, 
                error: 'CANNOT_UPDATE_AFTER_DONATION',
                message: `Cannot change ${attemptedRestrictedFields.join(', ')} after receiving donations`,
                restrictedFields: attemptedRestrictedFields
            };
        }
        
        // Update with allowed fields only
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            campaignId, 
            updates, 
            { new: true, runValidators: true }
        );
        
        // Invalidate caches
        await Promise.all([
            redisClient.del(`campaign:${campaignId}`),
            redisClient.del('campaigns:all'),
        ]);
        
        return { success: true, campaign: updatedCampaign };
    }
    
    // 3. If no donations yet, allow updating all fields
    const updatedCampaign = await Campaign.findByIdAndUpdate(
        campaignId, 
        payload, 
        { new: true, runValidators: true }
    );
    
    // Invalidate caches
    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
    ]);
    
    return { success: true, campaign: updatedCampaign };
}

/**
 * Delete campaign (only if no donations)
 */
export const deleteCampaign = async (campaignId, userId) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    // Check ownership
    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    // PREVENT deletion if has donations
    if (campaign.current_amount > 0) {
        return { 
            success: false, 
            error: 'CANNOT_DELETE_AFTER_DONATION',
            message: 'Cannot delete campaign after receiving donations. Please cancel it instead.',
            currentAmount: campaign.current_amount
        };
    }
    
    // Only allow delete if no donations
    await Campaign.findByIdAndDelete(campaignId);
    
    // Invalidate caches
    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
    ]);
    
    return { success: true };
}

/**
 * Cancel campaign (alternative to delete)
 */
export const cancelCampaign = async (campaignId, userId, reason) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    // Check ownership
    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    // Check if already cancelled
    if (campaign.status === 'cancelled') {
        return { 
            success: false, 
            error: 'ALREADY_CANCELLED',
            message: 'Campaign is already cancelled'
        };
    }
    
    // Update status to cancelled
    campaign.status = 'cancelled';
    campaign.cancellation_reason = reason || 'No reason provided';
    campaign.cancelled_at = new Date();
    await campaign.save();
    
    // Invalidate caches
    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
    ]);
    
    return { success: true, campaign };
}
