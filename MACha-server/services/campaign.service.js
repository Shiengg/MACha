import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";

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

export const getActiveCategories = async () => {
    const cacheKey = 'campaigns:active-categories';

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Get distinct categories from active campaigns
    const categories = await Campaign.distinct('category', { status: 'active' });

    // Get count for each category
    const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
            const count = await Campaign.countDocuments({
                category,
                status: 'active'
            });
            return { category, count };
        })
    );

    // Filter out categories with 0 campaigns and sort by count
    const result = categoriesWithCount
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

    // Save to cache (TTL: 10 minutes)
    await redisClient.setEx(cacheKey, 600, JSON.stringify(result));

    return result;
}

export const getCampaignsByCreator = async (creatorId) => {
    const campaignKey = `campaigns:creator:${creatorId}`;

    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const campaigns = await Campaign.find({
        creator: creatorId
    })
        .populate("creator", "username avatar fullname")
        .sort({ createdAt: -1 });

    await redisClient.setEx(campaignKey, 300, JSON.stringify(campaigns));
    return campaigns;

}

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
            'gallery_images',  // Changed from media_url
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

        const restrictedFields = ['goal_amount', 'end_date', 'title', 'banner_image'];
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
