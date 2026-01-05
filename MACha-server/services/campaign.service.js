import Campaign from "../models/campaign.js";
import Hashtag from "../models/Hashtag.js";
import { redisClient } from "../config/redis.js";

export const getCampaigns = async (page = 0, limit = 20) => {
    const campaignKey = `campaigns:all:page:${page}:limit:${limit}`;
    const totalKey = `campaigns:all:total`;

    // 1. Check cache first
    const cached = await redisClient.get(campaignKey);
    const cachedTotal = await redisClient.get(totalKey);
    
    if (cached && cachedTotal) {
        return {
            campaigns: JSON.parse(cached),
            total: parseInt(cachedTotal)
        };
    }

    // 2. Cache miss - Query database
    const [campaigns, total] = await Promise.all([
        Campaign.find()
            .populate("creator", "username fullname avatar")
            .populate("hashtag", "name")
            .sort({ createdAt: -1 })
            .skip(page * limit)
            .limit(limit),
        Campaign.countDocuments()
    ]);

    // 3. Cache for 5 minutes (300 seconds) - same as message
    await redisClient.setEx(campaignKey, 300, JSON.stringify(campaigns));
    await redisClient.setEx(totalKey, 300, total.toString());

    // 4. Add key to set for cache invalidation
    await redisClient.sAdd('campaigns:all:keys', campaignKey);

    return {
        campaigns,
        total
    };
}

export const getCampaignById = async (campaignId) => {
    const campaignKey = `campaign:${campaignId}`;

    // 1. Check cache first
    const cached = await redisClient.get(campaignKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // 2. Cache miss - Query database
    const campaign = await Campaign.findById(campaignId)
        .populate("creator", "username fullname avatar")
        .populate("hashtag", "name");
    if (!campaign) {
        return null;
    }

    // 3. Cache for 1 hour
    await redisClient.setEx(campaignKey, 3600, JSON.stringify(campaign));
    return campaign;
}


export const createCampaign = async (payload) => {
    // Extract hashtag from payload if provided
    const { hashtag: hashtagName, ...campaignData } = payload;
    
    // Create campaign first (without hashtag)
    const campaign = new Campaign(campaignData);
    await campaign.save();

    // Process hashtag if provided
    if (hashtagName && typeof hashtagName === 'string') {
        const normalizedName = hashtagName.trim().toLowerCase();
        
        if (normalizedName.length > 0) {
            try {
                // Try to create hashtag (will fail if duplicate due to unique index)
                const hashtag = await Hashtag.create({
                    name: normalizedName,
                    campaign: campaign._id
                });
                
                // Update campaign with hashtag
                campaign.hashtag = hashtag._id;
                await campaign.save();
            } catch (error) {
                // If duplicate (MongoDB duplicate key error), find existing one
                if (error.code === 11000) {
                    const existingHashtag = await Hashtag.findOne({
                        name: normalizedName,
                        campaign: campaign._id
                    });
                    if (existingHashtag) {
                        campaign.hashtag = existingHashtag._id;
                        await campaign.save();
                    }
                } else {
                    // Other errors, log but don't fail campaign creation
                    console.error(`Error creating hashtag ${normalizedName}:`, error);
                }
            }
        }
    }

    // Invalidate all campaign cache keys
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    if (keys.length > 0) {
        await redisClient.del(...keys);
    }
    await redisClient.del(keySet);
    await redisClient.del('campaigns:all:total');
    
    await redisClient.del('campaigns:pending');

    // Populate hashtag before returning
    await campaign.populate('hashtag', 'name');

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
        .populate("hashtag", "name")
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
        .populate("hashtag", "name")
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

        // Invalidate all campaign cache keys
        const keySet = 'campaigns:all:keys';
        const keys = await redisClient.sMembers(keySet);
        const cachesToInvalidate = [
            redisClient.del(`campaign:${campaignId}`),
            redisClient.del(`campaigns:category:${oldCategory}`)
        ];
        if (keys.length > 0) {
            cachesToInvalidate.push(redisClient.del(...keys));
        }
        cachesToInvalidate.push(redisClient.del(keySet));
        cachesToInvalidate.push(redisClient.del('campaigns:all:total'));

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

    // Invalidate all campaign cache keys
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del(`campaigns:category:${oldCategory}`)
    ];
    if (keys.length > 0) {
        cachesToInvalidate.push(redisClient.del(...keys));
    }
    cachesToInvalidate.push(redisClient.del(keySet));

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
    const hashtagId = campaign.hashtag;

    // Delete associated hashtag
    if (hashtagId) {
        await Hashtag.findByIdAndDelete(hashtagId);
    }

    await Campaign.findByIdAndDelete(campaignId);

    // Invalidate all campaign cache keys
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del(`campaigns:category:${category}`)
    ];
    if (keys.length > 0) {
        cachesToInvalidate.push(redisClient.del(...keys));
    }
    cachesToInvalidate.push(redisClient.del(keySet));

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

    // Invalidate all campaign cache keys
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del(`campaigns:category:${campaign.category}`)
    ];
    if (keys.length > 0) {
        cachesToInvalidate.push(redisClient.del(...keys));
    }
        cachesToInvalidate.push(redisClient.del(keySet));
        cachesToInvalidate.push(redisClient.del('campaigns:all:total'));
        
        await Promise.all(cachesToInvalidate);

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
        .populate("hashtag", "name")
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

    // Invalidate all campaign cache keys
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:pending'),
        redisClient.del(`campaigns:category:${campaign.category}`)
    ];
    if (keys.length > 0) {
        cachesToInvalidate.push(redisClient.del(...keys));
    }
        cachesToInvalidate.push(redisClient.del(keySet));
        cachesToInvalidate.push(redisClient.del('campaigns:all:total'));
        
        await Promise.all(cachesToInvalidate);

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

    // Invalidate all campaign cache keys
    const keySet = 'campaigns:all:keys';
    const keys = await redisClient.sMembers(keySet);
    const cachesToInvalidate = [
        redisClient.del(`campaign:${campaignId}`),
        redisClient.del('campaigns:pending'),
        redisClient.del(`campaigns:category:${campaign.category}`)
    ];
    if (keys.length > 0) {
        cachesToInvalidate.push(redisClient.del(...keys));
    }
        cachesToInvalidate.push(redisClient.del(keySet));
        cachesToInvalidate.push(redisClient.del('campaigns:all:total'));
        
        await Promise.all(cachesToInvalidate);

    return { success: true, campaign };
}

export const searchCampaignsByHashtag = async (hashtagName) => {
    const normalizedName = hashtagName.toLowerCase().trim();
    
    // Find hashtag
    const hashtag = await Hashtag.findOne({ name: normalizedName });
    if (!hashtag) {
        return [];
    }

    // Find campaigns with this hashtag
    const campaigns = await Campaign.find({ hashtag: hashtag._id })
        .populate("creator", "username fullname avatar")
        .populate("hashtag", "name")
        .sort({ createdAt: -1 });

    return campaigns;
}

const calculateRelevanceScore = (title, searchTerm, searchWords, isActive) => {
    const titleLower = title.toLowerCase();
    let score = 0;

    if (titleLower.startsWith(searchTerm)) {
        score += 1000;
    }

    if (titleLower.includes(searchTerm) && !titleLower.startsWith(searchTerm)) {
        score += 500;
    }

    const titleWords = titleLower.split(/\s+/);
    const matchedWords = new Set();
    searchWords.forEach(word => {
        if (titleWords.includes(word)) {
            matchedWords.add(word);
        }
    });
    score += matchedWords.size * 100;

    searchWords.forEach(word => {
        if (!matchedWords.has(word)) {
            titleWords.forEach(titleWord => {
                if (titleWord.includes(word) || word.includes(titleWord)) {
                    score += 10;
                }
            });
        }
    });

    if (isActive) {
        score += 50;
    }

    return score;
};

export const searchCampaignsByTitle = async (searchTerm, limit = 50) => {
    if (!searchTerm || searchTerm.trim() === "") {
        return [];
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
    
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    // Find all campaigns that match the search term
    const allCampaigns = await Campaign.find({
        title: searchRegex
    })
        .populate("creator", "username fullname avatar")
        .populate("hashtag", "name")
        .lean();

    // Calculate relevance score for each campaign
    const campaignsWithScore = allCampaigns.map(campaign => ({
        ...campaign,
        relevanceScore: calculateRelevanceScore(
            campaign.title,
            normalizedSearch,
            searchWords,
            campaign.status === 'active'
        )
    }));

    // Sort by relevance score (descending), then by creation date (descending)
    campaignsWithScore.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Limit results and remove score field
    const results = campaignsWithScore
        .slice(0, limit)
        .map(({ relevanceScore, ...campaign }) => campaign);

    // Convert back to Mongoose documents
    const campaignIds = results.map(c => c._id);
    const populatedCampaigns = await Campaign.find({ _id: { $in: campaignIds } })
        .populate("creator", "username fullname avatar")
        .populate("hashtag", "name");

    // Maintain the relevance order
    const orderedCampaigns = campaignIds.map(id => 
        populatedCampaigns.find(c => c._id.toString() === id.toString())
    ).filter(Boolean);

    return orderedCampaigns;
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
            
            const { calculateAvailableAmount } = await import('./escrow.service.js');
            const availableAmount = await calculateAvailableAmount(campaign._id, campaign.current_amount);
            
            if (availableAmount <= 0) {
                console.log(`[Expired Campaign] Campaign ${campaign._id} đã hết hạn nhưng không có tiền available`);
                results.push({
                    campaignId: campaign._id.toString(),
                    success: false,
                    error: 'NO_AVAILABLE_AMOUNT'
                });
                continue;
            }
            
            // Kiểm tra xem đã có withdrawal request nào đang active chưa (không tính cancelled và admin_rejected)
            const existingActiveRequest = await Escrow.findOne({
                campaign: campaign._id,
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
            
            if (existingActiveRequest) {
                console.log(`[Expired Campaign] Campaign ${campaign._id} đã có withdrawal request đang active (status: ${existingActiveRequest.request_status}), bỏ qua`);
                continue;
            }
            
            // Tạo withdrawal request cho mốc 100% nếu campaign có milestones và có milestone 100%
            if (campaign.milestones && campaign.milestones.length > 0) {
                const milestone100 = campaign.milestones.find(m => m.percentage === 100);
                
                if (milestone100) {
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
                    // Không có milestone 100%, tạo request cho số tiền còn lại
                    await Escrow.updateMany(
                        {
                            campaign: campaign._id,
                            milestone_percentage: { $ne: null },
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
                    
                    const withdrawalRequest = await Escrow.create({
                        campaign: campaign._id,
                        requested_by: campaign.creator._id || campaign.creator,
                        withdrawal_request_amount: availableAmount,
                        request_reason: `Tạo yêu cầu rút tiền cho số tiền còn lại khi campaign hết hạn (${campaign.current_amount.toLocaleString('vi-VN')} VND / ${campaign.goal_amount.toLocaleString('vi-VN')} VND)`,
                        request_status: "pending_voting",
                        total_amount: campaign.current_amount,
                        remaining_amount: availableAmount,
                        auto_created: true,
                        milestone_percentage: null
                    });
                    
                    const votingEndDate = new Date(now);
                    votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
                    withdrawalRequest.request_status = "voting_in_progress";
                    withdrawalRequest.voting_start_date = now;
                    withdrawalRequest.voting_end_date = votingEndDate;
                    await withdrawalRequest.save();
                    
                    console.log(`[Expired Campaign] Tạo withdrawal request tự động cho campaign ${campaign._id} khi hết hạn (số tiền còn lại, không có milestone 100%)`);
                    
                    results.push({
                        campaignId: campaign._id.toString(),
                        success: true,
                        withdrawalRequestId: withdrawalRequest._id.toString()
                    });
                }
            } else {
                // Không có milestones, tạo request cho số tiền còn lại
                const withdrawalRequest = await Escrow.create({
                    campaign: campaign._id,
                    requested_by: campaign.creator._id || campaign.creator,
                    withdrawal_request_amount: availableAmount,
                    request_reason: `Tạo yêu cầu rút tiền cho số tiền còn lại khi campaign hết hạn (${campaign.current_amount.toLocaleString('vi-VN')} VND / ${campaign.goal_amount.toLocaleString('vi-VN')} VND)`,
                    request_status: "pending_voting",
                    total_amount: campaign.current_amount,
                    remaining_amount: availableAmount,
                    auto_created: true,
                    milestone_percentage: null
                });
                
                const votingEndDate = new Date(now);
                votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 ngày
                withdrawalRequest.request_status = "voting_in_progress";
                withdrawalRequest.voting_start_date = now;
                withdrawalRequest.voting_end_date = votingEndDate;
                await withdrawalRequest.save();
                
                console.log(`[Expired Campaign] Tạo withdrawal request tự động cho campaign ${campaign._id} khi hết hạn (số tiền còn lại, không có milestones)`);
                
                results.push({
                    campaignId: campaign._id.toString(),
                    success: true,
                    withdrawalRequestId: withdrawalRequest._id.toString()
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
