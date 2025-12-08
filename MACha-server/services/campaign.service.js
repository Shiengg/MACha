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

    await Promise.all([
        redisClient.del('campaigns:all'),
        redisClient.del('campaigns:pending'),
    ]);
    
    return campaign;
}

export const getCampaignsByCategory = async (category) => {
    const campaignKey = `campaigns:category:${category}`;

    // Check cache
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query database with filters
    const campaigns = await Campaign.find({ 
        category,
        status: 'active' // Only return active campaigns
    })
    .populate("creator", "username avatar")
    .sort({ createdAt: -1 }); // Newest first

    // Save to cache (TTL: 5 minutes)
    await redisClient.setEx(campaignKey, 300, JSON.stringify(campaigns));

    return campaigns;
}

/**
 * Update campaign with restrictions after donations
 */
export const updateCampaign = async (campaignId, userId, payload) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    const oldCategory = campaign.category;
    const oldStatus = campaign.status;
    
    if (campaign.current_amount > 0) {
        const allowedFields = [
            'description',
            'media_url', 
            'proof_documents_url',
            'status'
        ];
        
        const updates = {};
        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                updates[field] = payload[field];
            }
        }
        
        if (payload.status && !['completed', 'cancelled'].includes(payload.status)) {
            return { 
                success: false, 
                error: 'INVALID_STATUS_CHANGE',
                message: 'Can only change status to completed or cancelled after receiving donations'
            };
        }
        
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
        
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            campaignId, 
            updates, 
            { new: true, runValidators: true }
        );
        
        const cachesToInvalidate = [
            redisClient.del(`campaign:${campaignId}`),
            redisClient.del('campaigns:all'),
            redisClient.del(`campaigns:category:${oldCategory}`)
        ];
        
        if (oldStatus === 'pending') {
            cachesToInvalidate.push(redisClient.del('campaigns:pending'));
        }
        
        await Promise.all(cachesToInvalidate);
        
        return { success: true, campaign: updatedCampaign };
    }
    
    const updatedCampaign = await Campaign.findByIdAndUpdate(
        campaignId, 
        payload, 
        { new: true, runValidators: true }
    );
    
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
        redisClient.del(`campaigns:category:${oldCategory}`)
    ];
    
    if (payload.category && payload.category !== oldCategory) {
        cachesToInvalidate.push(redisClient.del(`campaigns:category:${payload.category}`));
    }
    
    if (oldStatus === 'pending' || payload.status === 'pending') {
        cachesToInvalidate.push(redisClient.del('campaigns:pending'));
    }
    
    await Promise.all(cachesToInvalidate);
    
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
    
    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    if (campaign.current_amount > 0) {
        return { 
            success: false, 
            error: 'CANNOT_DELETE_AFTER_DONATION',
            message: 'Cannot delete campaign after receiving donations. Please cancel it instead.',
            currentAmount: campaign.current_amount
        };
    }
    
    const category = campaign.category;
    const status = campaign.status;
    
    await Campaign.findByIdAndDelete(campaignId);
    
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
        redisClient.del(`campaigns:category:${category}`)
    ];
    
    if (status === 'pending') {
        cachesToInvalidate.push(redisClient.del('campaigns:pending'));
    }
    
    await Promise.all(cachesToInvalidate);
    
    return { success: true, campaign };
}

/**
 * Cancel campaign (alternative to delete)
 */
export const cancelCampaign = async (campaignId, userId, reason) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (campaign.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    if (campaign.status === 'cancelled') {
        return { 
            success: false, 
            error: 'ALREADY_CANCELLED',
            message: 'Campaign is already cancelled'
        };
    }
    
    campaign.status = 'cancelled';
    campaign.cancellation_reason = reason || 'No reason provided';
    campaign.cancelled_at = new Date();
    await campaign.save();
    
    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
        redisClient.del(`campaigns:category:${campaign.category}`),
    ]);
    
    return { success: true, campaign };
}

export const getPendingCampaigns = async () => {
    const campaignKey = 'campaigns:pending';
    
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const campaigns = await Campaign.find({ status: 'pending' })
        .populate("creator", "username email avatar")
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(campaignKey, 300, JSON.stringify(campaigns));
    return campaigns;
}

export const approveCampaign = async (campaignId, adminId) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (campaign.status !== 'pending') {
        return { 
            success: false, 
            error: 'INVALID_STATUS',
            message: `Cannot approve campaign with status: ${campaign.status}. Only pending campaigns can be approved.`
        };
    }
    
    campaign.status = 'active';
    campaign.approved_at = new Date();
    await campaign.save();
    
    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
        redisClient.del('campaigns:pending'),
        redisClient.del(`campaigns:category:${campaign.category}`),
    ]);
    
    return { success: true, campaign };
}

export const rejectCampaign = async (campaignId, adminId, reason) => {
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (campaign.status !== 'pending') {
        return { 
            success: false, 
            error: 'INVALID_STATUS',
            message: `Cannot reject campaign with status: ${campaign.status}. Only pending campaigns can be rejected.`
        };
    }
    
    if (!reason || reason.trim().length === 0) {
        return {
            success: false,
            error: 'MISSING_REASON',
            message: 'Rejection reason is required'
        };
    }
    
    campaign.status = 'rejected';
    campaign.rejection_reason = reason;
    campaign.rejected_at = new Date();
    await campaign.save();
    
    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
        redisClient.del('campaigns:pending'),
        redisClient.del(`campaigns:category:${campaign.category}`),
    ]);
    
    return { success: true, campaign };
}
