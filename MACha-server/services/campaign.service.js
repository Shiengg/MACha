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
    const campaigns = await Campaign.find().populate("creator", "username fullname avatar");

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
    const campaign = await Campaign.findById(campaignId).populate("creator", "username fullname avatar");
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
        .populate("creator", "username fullname avatar")
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
    campaign.approved_by = adminId;
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
    campaign.rejected_by = adminId;
    await campaign.save();

    await Promise.all([
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:all'),
        redisClient.del('campaigns:pending'),
        redisClient.del(`campaigns:category:${campaign.category}`),
    ]);

    return { success: true, campaign };
}

export const processExpiredCampaigns = async () => {
    const now = new Date();
    
    // Tìm các campaign đã hết hạn và vẫn đang active
    const expiredCampaigns = await Campaign.find({
        status: 'active',
        end_date: { $lte: now },
        current_amount: { $gt: 0 } // Chỉ xử lý campaign có tiền
    }).populate('creator', 'username');
    
    const results = [];
    
    for (const campaign of expiredCampaigns) {
        try {
            // Kiểm tra xem đã có withdrawal request cho mốc 100% chưa
            // Kiểm tra cả các request đang active (không bao gồm cancelled và admin_rejected)
            // Vì nếu đã có request đang active thì không cần tạo lại
            const Escrow = (await import('../models/escrow.js')).default;
            const existing100PercentRequest = await Escrow.findOne({
                campaign: campaign._id,
                milestone_percentage: 100,
                auto_created: true,
                request_status: {
                    $in: [
                        "pending_voting",
                        "voting_in_progress",
                        "voting_completed",
                        "admin_approved",
                        "released"
                    ]
                }
            });
            
            if (existing100PercentRequest) {
                console.log(`[Expired Campaign] Campaign ${campaign._id} đã có withdrawal request cho mốc 100% (status: ${existing100PercentRequest.request_status}), bỏ qua`);
                continue;
            }
            
            // Kiểm tra thêm: nếu đã có request cho mốc 100% dù ở bất kỳ trạng thái nào (trừ cancelled)
            // để tránh tạo duplicate nếu request đã bị reject nhưng vẫn còn trong DB
            const any100PercentRequest = await Escrow.findOne({
                campaign: campaign._id,
                milestone_percentage: 100,
                auto_created: true,
                request_status: { $ne: "cancelled" } // Không tính cancelled
            });
            
            if (any100PercentRequest && any100PercentRequest.request_status !== "admin_rejected") {
                // Nếu có request đang active hoặc đã released, không tạo lại
                console.log(`[Expired Campaign] Campaign ${campaign._id} đã có withdrawal request cho mốc 100% (status: ${any100PercentRequest.request_status}), bỏ qua`);
                continue;
            }
            
            // Tạo withdrawal request cho mốc 100% nếu campaign có milestones
            if (campaign.milestones && campaign.milestones.length > 0) {
                const milestone100 = campaign.milestones.find(m => m.percentage === 100);
                
                if (milestone100) {
                    const { calculateAvailableAmount } = await import('./escrow.service.js');
                    const availableAmount = await calculateAvailableAmount(campaign._id, campaign.current_amount);
                    
                    if (availableAmount > 0) {
                        // Hủy các request của các mốc thấp hơn
                        await Escrow.updateMany(
                            {
                                campaign: campaign._id,
                                milestone_percentage: { $lt: 100 },
                                auto_created: true,
                                request_status: {
                                    $in: [
                                        "pending_voting",
                                        "voting_in_progress",
                                        "voting_completed",
                                        "admin_approved"
                                    ]
                                }
                            },
                            {
                                request_status: "cancelled"
                            }
                        );
                        
                        // Tạo request cho mốc 100%
                        const requestReason = milestone100.commitment_description 
                            ? `Tạo yêu cầu rút tiền khi campaign hết hạn. Cam kết: ${milestone100.commitment_description}`
                            : `Tạo yêu cầu rút tiền khi campaign hết hạn`;
                        
                        const withdrawalRequest = await Escrow.create({
                            campaign: campaign._id,
                            requested_by: campaign.creator._id || campaign.creator,
                            withdrawal_request_amount: availableAmount,
                            request_reason: requestReason,
                            request_status: "pending_voting",
                            total_amount: campaign.current_amount,
                            remaining_amount: availableAmount,
                            auto_created: true,
                            milestone_percentage: 100
                        });
                        
                        const votingEndDate = new Date(now);
                        votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
                        withdrawalRequest.request_status = "voting_in_progress";
                        withdrawalRequest.voting_start_date = now;
                        withdrawalRequest.voting_end_date = votingEndDate;
                        await withdrawalRequest.save();
                        
                        console.log(`[Expired Campaign] Tạo withdrawal request tự động cho campaign ${campaign._id} khi hết hạn (mốc 100%)`);
                        
                        results.push({
                            campaignId: campaign._id.toString(),
                            success: true,
                            withdrawalRequestId: withdrawalRequest._id.toString()
                        });
                    } else {
                        console.log(`[Expired Campaign] Campaign ${campaign._id} đã hết hạn nhưng không có tiền available`);
                        results.push({
                            campaignId: campaign._id.toString(),
                            success: false,
                            error: 'NO_AVAILABLE_AMOUNT'
                        });
                    }
                } else {
                    console.log(`[Expired Campaign] Campaign ${campaign._id} đã hết hạn nhưng không có mốc 100%`);
                    results.push({
                        campaignId: campaign._id.toString(),
                        success: false,
                        error: 'NO_100_PERCENT_MILESTONE'
                    });
                }
            } else {
                console.log(`[Expired Campaign] Campaign ${campaign._id} đã hết hạn nhưng không có milestones`);
                results.push({
                    campaignId: campaign._id.toString(),
                    success: false,
                    error: 'NO_MILESTONES'
                });
            }
        } catch (error) {
            console.error(`[Expired Campaign] Error processing campaign ${campaign._id}:`, error);
            results.push({
                campaignId: campaign._id.toString(),
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}
