import Campaign from "../models/campaign.js";
import Hashtag from "../models/Hashtag.js";
import { redisClient } from "../config/redis.js";
import { geocodeLocation } from "./geocoding.service.js";
import { 
    calculateSimilarityScore, 
    normalizeSearchTerm, 
    splitSearchWords 
} from "../utils/similarity.js";
import { 
    CAMPAIGN_STATUS, 
    FILTER_STATUS_ALL, 
    DEFAULT_DISCOVER_STATUS,
    CAMPAIGN_STATUS_VALUES 
} from "../constants/campaign.js";

export const invalidateCampaignCache = async (campaignId = null, category = null, requestId = null, creatorId = null) => {
    const logContext = {
        requestId: requestId || `cache-inv-${Date.now()}`,
        campaignId,
        category,
        creatorId,
        timestamp: new Date().toISOString()
    };

    console.log(`[Cache Invalidation] Starting cache invalidation`, logContext);

    try {
        const keySet = 'campaigns:all:keys';
        const keys = await redisClient.sMembers(keySet);
        
        const invalidatedKeys = [];
        
        // Clear all campaign-related cache keys
        const cachesToInvalidate = [
            redisClient.del('campaigns:pending'), // Clear pending campaigns cache
            redisClient.del('campaigns:all:total'), // Clear total count cache
            redisClient.del('campaigns:map'), // Invalidate map cache
            redisClient.del('campaigns:map:statistics'), // Invalidate map statistics cache
        ];
        
        invalidatedKeys.push(
            'campaigns:pending',
            'campaigns:all:total',
            'campaigns:map',
            'campaigns:map:statistics'
        );
        
        // Clear individual campaign cache if campaignId provided
        if (campaignId) {
            const campaignKey = `campaign:${campaignId}`;
            cachesToInvalidate.push(redisClient.del(campaignKey));
            invalidatedKeys.push(campaignKey);
        }
        
        // Clear all paginated campaign cache keys from key set
        if (keys.length > 0) {
            cachesToInvalidate.push(redisClient.del(...keys));
            invalidatedKeys.push(...keys);
        }
        
        // Also clear common cache keys that might be used by admin (with large limits)
        // This ensures admin sees new/updated campaigns immediately
        // Clear both status-filtered and non-filtered cache keys
        const commonLimits = [20, 50, 100, 500, 1000, 5000, 10000, 50000];
        const commonStatuses = [CAMPAIGN_STATUS.ACTIVE, CAMPAIGN_STATUS.PENDING, CAMPAIGN_STATUS.COMPLETED, FILTER_STATUS_ALL];
        
        for (const limit of commonLimits) {
            // Clear non-filtered keys
            const pageKey = `campaigns:all:page:0:limit:${limit}`;
            cachesToInvalidate.push(redisClient.del(pageKey));
            invalidatedKeys.push(pageKey);
            
            // Clear status-filtered keys
            for (const status of commonStatuses) {
                const statusKey = status === FILTER_STATUS_ALL ? ':status:all' : `:status:${status}`;
                const statusPageKey = `campaigns:all:page:0:limit:${limit}${statusKey}`;
                const statusTotalKey = `campaigns:all:total${statusKey}`;
                cachesToInvalidate.push(redisClient.del(statusPageKey, statusTotalKey));
                invalidatedKeys.push(statusPageKey, statusTotalKey);
            }
        }
        
        // Clear category caches if category provided
        if (category) {
            const categoryKey = `campaigns:category:${category}`;
            cachesToInvalidate.push(redisClient.del(categoryKey));
            invalidatedKeys.push(categoryKey);
        }
        
        // Clear creator-based cache keys if creatorId provided
        // This is important when campaign status changes (pending -> active, rejected, etc.)
        // because creator cache filters by status and profile pages need to show updated statuses
        if (creatorId) {
            // Clear basic creator cache
            const creatorKey = `campaigns:creator:${creatorId}`;
            cachesToInvalidate.push(redisClient.del(creatorKey));
            invalidatedKeys.push(creatorKey);
            
            // Note: Creator pagination caches have viewer-specific keys
            // Pattern: campaigns:creator:${creatorId}:viewer:${viewerId || 'public'}:page:${page}:limit:${limit}
            // These caches have 5-minute TTL, so they'll expire and repopulate with correct data
            // For immediate invalidation, we'd need SCAN which is async and complex
            // The 5-minute TTL is acceptable for profile page updates
        }
        
        // Clear the key set itself
        cachesToInvalidate.push(redisClient.del(keySet));
        invalidatedKeys.push(keySet);
        
        // Execute all deletions in parallel
        const results = await Promise.all(cachesToInvalidate);
        const totalDeleted = results.reduce((sum, count) => sum + count, 0);
        
        console.log(`[Cache Invalidation] Cache invalidated successfully`, {
            ...logContext,
            totalKeysInvalidated: invalidatedKeys.length,
            totalDeleted,
            sampleKeys: invalidatedKeys.slice(0, 10) // Log first 10 keys as sample
        });
        
        return {
            success: true,
            keysInvalidated: invalidatedKeys.length,
            totalDeleted
        };
    } catch (error) {
        console.error(`[Cache Invalidation] Error during cache invalidation`, {
            ...logContext,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

export const getTotalCampaignsCount = async () => {
    const totalKey = `campaigns:all:total`;
    
    // Check cache first
    const cachedTotal = await redisClient.get(totalKey);
    if (cachedTotal) {
        return parseInt(cachedTotal);
    }
    
    // Cache miss - Query database
    const total = await Campaign.countDocuments();
    
    // Cache for 5 minutes
    await redisClient.setEx(totalKey, 300, total.toString());
    
    return total;
}

export const getCampaigns = async (page = 0, limit = 20, userId = null, status = null) => {
    // Normalize status: default to ACTIVE if not provided, handle 'ALL' specially
    let filterStatus = status;
    if (!filterStatus || filterStatus === '') {
        filterStatus = DEFAULT_DISCOVER_STATUS;
    }
    
    // Handle 'ALL' filter - don't filter by status
    const shouldFilterByStatus = filterStatus && filterStatus !== FILTER_STATUS_ALL;
    
    // Validate status if filtering by status
    if (shouldFilterByStatus && !CAMPAIGN_STATUS_VALUES.includes(filterStatus)) {
        throw new Error(`Invalid campaign status: ${filterStatus}. Valid values: ${CAMPAIGN_STATUS_VALUES.join(', ')}, or 'ALL'`);
    }
    
    // Build cache key with status
    const statusKey = shouldFilterByStatus ? `:status:${filterStatus}` : ':status:all';
    const campaignKey = `campaigns:all:page:${page}:limit:${limit}${statusKey}`;
    const totalKey = `campaigns:all:total${statusKey}`;

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
    // Build query with optional status filter
    const query = shouldFilterByStatus ? { status: filterStatus } : {};
    
    // Optimized: Use select() to reduce payload size and use index efficiently
    const [campaigns, total] = await Promise.all([
        Campaign.find(query)
            .select('-contact_info -expected_timeline -milestones') // Exclude heavy fields for list view
            .populate("creator", "username fullname avatar")
            .populate("hashtag", "name")
            .sort({ createdAt: -1 }) // Uses index: { status: 1, createdAt: -1 }
            .skip(page * limit)
            .limit(limit)
            .lean(), // Use lean() for better performance
        Campaign.countDocuments(query)
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
        .populate("creator", "username fullname avatar role")
        .populate("hashtag", "name");
    if (!campaign) {
        return null;
    }

    // 3. Cache for 1 hour
    await redisClient.setEx(campaignKey, 3600, JSON.stringify(campaign));
    return campaign;
}


export const createCampaign = async (payload) => {
    // Extract hashtag and location_name from payload if provided
    const { hashtag: hashtagName, location_name, ...campaignData } = payload;
    
    // Geocode location if location_name is provided
    if (location_name && typeof location_name === 'string' && location_name.trim().length > 0) {
        try {
            const geocodeResult = await geocodeLocation(location_name);
            if (geocodeResult) {
                campaignData.location = {
                    location_name: location_name.trim(),
                    latitude: geocodeResult.latitude,
                    longitude: geocodeResult.longitude
                };
            } else {
                // If geocoding fails, still create campaign but without location
                console.warn(`Geocoding failed for location: ${location_name}. Creating campaign without location.`);
            }
        } catch (error) {
            // Log error but don't fail campaign creation
            console.error(`Error geocoding location "${location_name}":`, error);
            // Continue without location data
        }
    }
    
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
    await invalidateCampaignCache(campaign._id, campaign.category);

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

    // Exclude campaigns with status: pending, rejected, and cancelled
    const campaigns = await Campaign.find({
        creator: creatorId,
        status: { $nin: ['pending', 'rejected', 'cancelled'] }
    })
        .populate("creator", "username avatar fullname")
        .populate("hashtag", "name")
        .sort({ createdAt: -1 });

    await redisClient.setEx(campaignKey, 300, JSON.stringify(campaigns));
    return campaigns;

}

/**
 * Get campaigns by creator with pagination and permission-based filtering
 * 
 * @param {string} creatorId - User ID of campaign creator
 * @param {string|null} viewerId - Current user ID (null if not logged in)
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} { campaigns, total, totalPages, currentPage, limit }
 */
export const getCampaignsByCreatorWithPagination = async (creatorId, viewerId = null, page = 1, limit = 10) => {
    // Validate inputs
    if (!creatorId) {
        throw new Error('creatorId is required');
    }
    
    // Ensure page and limit are positive integers
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.max(1, Math.min(50, parseInt(limit) || 10)); // Max 50 per page
    
    const skip = (page - 1) * limit;
    
    // Determine if viewer is the owner
    const isOwner = viewerId && viewerId.toString() === creatorId.toString();
    
    // Build query based on permission
    let query = { creator: creatorId };
    
    if (!isOwner) {
        // Public view: Show all campaigns that were once public
        // Include: pending, active, completed, rejected (to show trust/transparency)
        // Exclude: cancelled (user action, not public status), draft (doesn't exist in system)
        query.status = { $in: ['pending', 'active', 'completed', 'rejected', 'approved', 'voting'] };
    }
    // Owner can see all campaigns including pending/rejected/cancelled
    
    // Cache key includes viewerId to differentiate owner vs public view
    const cacheKey = `campaigns:creator:${creatorId}:viewer:${viewerId || 'public'}:page:${page}:limit:${limit}`;
    const totalCacheKey = `campaigns:creator:${creatorId}:viewer:${viewerId || 'public'}:total`;
    
    // Check cache
    const cached = await redisClient.get(cacheKey);
    const cachedTotal = await redisClient.get(totalCacheKey);
    
    if (cached && cachedTotal) {
        return {
            campaigns: JSON.parse(cached),
            total: parseInt(cachedTotal),
            totalPages: Math.ceil(parseInt(cachedTotal) / limit),
            currentPage: page,
            limit
        };
    }
    
    // Query database with pagination
    const [campaigns, total] = await Promise.all([
        Campaign.find(query)
            .select('-contact_info -expected_timeline -milestones -proof_documents_url') // Exclude sensitive/heavy fields
            .populate("creator", "username fullname avatar")
            .populate("hashtag", "name")
            .sort({ createdAt: -1 }) // Newest first (uses index: { creator: 1, status: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Campaign.countDocuments(query)
    ]);
    
    // Cache for 5 minutes (300 seconds)
    await redisClient.setEx(cacheKey, 300, JSON.stringify(campaigns));
    await redisClient.setEx(totalCacheKey, 300, total.toString());
    
    // Invalidate old cache when new campaign is created/updated
    // This is handled in createCampaign/updateCampaign functions
    
    return {
        campaigns,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
    };
}

export const updateCampaign = async (campaignId, userId, payload, requestId = null) => {
    const logRequestId = requestId || `update-${campaignId}-${Date.now()}`;
    
    console.log(`[Campaign Update] Starting update process`, {
        requestId: logRequestId,
        campaignId,
        userId,
        payloadFields: Object.keys(payload),
        timestamp: new Date().toISOString()
    });

    // Step 1: Find campaign with optimistic locking check
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
        console.log(`[Campaign Update] Campaign not found`, {
            requestId: logRequestId,
            campaignId
        });
        return { success: false, error: 'NOT_FOUND' };
    }

    // Step 2: Check permission - only creator can update
    if (campaign.creator.toString() !== userId.toString()) {
        console.log(`[Campaign Update] Forbidden - not creator`, {
            requestId: logRequestId,
            campaignId,
            userId,
            creatorId: campaign.creator.toString()
        });
        return { success: false, error: 'FORBIDDEN' };
    }

    const oldCategory = campaign.category;
    const oldStatus = campaign.status;
    const oldUpdatedAt = campaign.updatedAt;

    console.log(`[Campaign Update] Campaign found`, {
        requestId: logRequestId,
        campaignId,
        currentStatus: oldStatus,
        currentAmount: campaign.current_amount,
        category: oldCategory
    });

    // Step 3: Handle PENDING status - Creator can edit but cannot change status
    if (oldStatus === 'pending') {
        // Creator cannot change status when pending (only admin can approve/reject)
        if (payload.status !== undefined && payload.status !== 'pending') {
            console.log(`[Campaign Update] Invalid status change attempt when pending`, {
                requestId: logRequestId,
                campaignId,
                currentStatus: oldStatus,
                attemptedStatus: payload.status
            });
            return {
                success: false,
                error: 'CANNOT_CHANGE_STATUS_WHEN_PENDING',
                message: 'Cannot change campaign status when pending. Only admin can approve or reject the campaign.'
            };
        }

        // Remove status from payload if it's set to pending (redundant)
        const { status, ...payloadWithoutStatus } = payload;
        const finalPayload = status === 'pending' ? payloadWithoutStatus : payload;

        // Use atomic update with status check to prevent race condition
        // This ensures campaign is still pending when we update
        const updateResult = await Campaign.findOneAndUpdate(
            {
                _id: campaignId,
                status: 'pending', // Atomic check - only update if still pending
                creator: userId   // Double check creator
            },
            finalPayload,
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!updateResult) {
            // Campaign status changed or not found - possible race condition
            const currentCampaign = await Campaign.findById(campaignId);
            if (!currentCampaign) {
                console.log(`[Campaign Update] Campaign not found after atomic check`, {
                    requestId: logRequestId,
                    campaignId
                });
                return { success: false, error: 'NOT_FOUND' };
            }
            
            if (currentCampaign.status !== 'pending') {
                console.log(`[Campaign Update] Race condition detected - status changed during update`, {
                    requestId: logRequestId,
                    campaignId,
                    oldStatus: 'pending',
                    currentStatus: currentCampaign.status
                });
                return {
                    success: false,
                    error: 'STATUS_CHANGED_DURING_UPDATE',
                    message: `Campaign status changed from pending to ${currentCampaign.status} during update. Please refresh and try again.`,
                    currentStatus: currentCampaign.status
                };
            }
            
            // Should not reach here, but handle just in case
            return { success: false, error: 'UPDATE_FAILED' };
        }

        console.log(`[Campaign Update] Database updated successfully (PENDING)`, {
            requestId: logRequestId,
            campaignId,
            updatedFields: Object.keys(finalPayload),
            oldStatus,
            newStatus: updateResult.status
        });

        // Step 4: Invalidate cache AFTER DB is committed
        try {
            await invalidateCampaignCache(
                campaignId,
                updateResult.category || oldCategory,
                logRequestId,
                userId.toString()
            );
            console.log(`[Campaign Update] Cache invalidated successfully (PENDING)`, {
                requestId: logRequestId,
                campaignId,
                category: updateResult.category || oldCategory
            });
        } catch (cacheError) {
            // Log but don't fail - cache will be stale but DB is correct
            console.error(`[Campaign Update] Cache invalidation failed (non-critical)`, {
                requestId: logRequestId,
                campaignId,
                error: cacheError.message
            });
        }

        return { 
            success: true, 
            campaign: updateResult,
            requestId: logRequestId
        };
    }

    // Step 4: Handle campaigns with donations (current_amount > 0)
    if (campaign.current_amount > 0) {
        const allowedFields = [
            'description',
            'gallery_images',
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

        // Use atomic update with optimistic locking
        const updatedCampaign = await Campaign.findOneAndUpdate(
            {
                _id: campaignId,
                updatedAt: oldUpdatedAt // Optimistic lock - ensure no concurrent updates
            },
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedCampaign) {
            // Optimistic lock failed - concurrent update detected
            const currentCampaign = await Campaign.findById(campaignId);
            console.log(`[Campaign Update] Optimistic lock failed - concurrent update detected`, {
                requestId: logRequestId,
                campaignId,
                oldUpdatedAt,
                currentUpdatedAt: currentCampaign?.updatedAt
            });
            return {
                success: false,
                error: 'CONCURRENT_UPDATE',
                message: 'Campaign was updated by another process. Please refresh and try again.'
            };
        }

        console.log(`[Campaign Update] Database updated successfully (with donations)`, {
            requestId: logRequestId,
            campaignId,
            updatedFields: Object.keys(updates),
            oldStatus,
            newStatus: updatedCampaign.status
        });

        // Invalidate cache AFTER DB commit
        try {
            await invalidateCampaignCache(
                campaignId,
                updatedCampaign.category || oldCategory,
                logRequestId,
                userId.toString()
            );
        } catch (cacheError) {
            console.error(`[Campaign Update] Cache invalidation failed (non-critical)`, {
                requestId: logRequestId,
                campaignId,
                error: cacheError.message
            });
        }

        return { 
            success: true, 
            campaign: updatedCampaign,
            requestId: logRequestId
        };
    }

    // Step 5: Handle campaigns without donations (current_amount = 0) and not pending
    // Use atomic update with optimistic locking
    const updatedCampaign = await Campaign.findOneAndUpdate(
        {
            _id: campaignId,
            updatedAt: oldUpdatedAt // Optimistic lock
        },
        payload,
        { new: true, runValidators: true }
    );

    if (!updatedCampaign) {
        // Optimistic lock failed
        const currentCampaign = await Campaign.findById(campaignId);
        console.log(`[Campaign Update] Optimistic lock failed - concurrent update detected`, {
            requestId: logRequestId,
            campaignId,
            oldUpdatedAt,
            currentUpdatedAt: currentCampaign?.updatedAt
        });
        return {
            success: false,
            error: 'CONCURRENT_UPDATE',
            message: 'Campaign was updated by another process. Please refresh and try again.'
        };
    }

    console.log(`[Campaign Update] Database updated successfully (no donations)`, {
        requestId: logRequestId,
        campaignId,
        updatedFields: Object.keys(payload),
        oldStatus,
        newStatus: updatedCampaign.status
    });

    // Invalidate cache AFTER DB commit
    try {
        await invalidateCampaignCache(
            campaignId,
            updatedCampaign.category || oldCategory,
            logRequestId,
            userId.toString()
        );
    } catch (cacheError) {
        console.error(`[Campaign Update] Cache invalidation failed (non-critical)`, {
            requestId: logRequestId,
            campaignId,
            error: cacheError.message
        });
    }

    return { 
        success: true, 
        campaign: updatedCampaign,
        requestId: logRequestId
    };
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
    cachesToInvalidate.push(redisClient.del('campaigns:map')); // Invalidate map cache

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
        cachesToInvalidate.push(redisClient.del('campaigns:map')); // Invalidate map cache
        cachesToInvalidate.push(redisClient.del('campaigns:map:statistics')); // Invalidate map statistics cache
        
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
    const requestId = `approve-${campaignId}-${Date.now()}`;
    
    console.log(`[Campaign Approval] Starting approval process`, {
        requestId,
        campaignId,
        adminId,
        timestamp: new Date().toISOString()
    });

    // Step 1: Check current state (idempotency check)
    const existingCampaign = await Campaign.findById(campaignId);
    if (!existingCampaign) {
        console.log(`[Campaign Approval] Campaign not found`, {
            requestId,
            campaignId
        });
        return { success: false, error: 'NOT_FOUND' };
    }

    // Idempotency: If already approved, return success
    if (existingCampaign.status === 'active' && existingCampaign.approved_by) {
        console.log(`[Campaign Approval] Campaign already approved (idempotency)`, {
            requestId,
            campaignId,
            currentStatus: existingCampaign.status,
            approvedBy: existingCampaign.approved_by,
            approvedAt: existingCampaign.approved_at
        });
        return { 
            success: true, 
            campaign: existingCampaign,
            wasAlreadyApproved: true
        };
    }

    if (existingCampaign.status !== 'pending') {
        console.log(`[Campaign Approval] Invalid status for approval`, {
            requestId,
            campaignId,
            currentStatus: existingCampaign.status
        });
        return {
            success: false,
            error: 'INVALID_STATUS',
            message: `Cannot approve campaign with status: ${existingCampaign.status}. Only pending campaigns can be approved.`
        };
    }

    // Step 2: Update database (using save() to ensure transaction)
    const oldStatus = existingCampaign.status;
    const oldCategory = existingCampaign.category;
    
    existingCampaign.status = 'active';
    existingCampaign.approved_at = new Date();
    existingCampaign.approved_by = adminId;
    
    // Save to ensure transaction is committed
    const campaign = await existingCampaign.save();
    
    console.log(`[Campaign Approval] Database updated successfully`, {
        requestId,
        campaignId,
        oldStatus,
        newStatus: campaign.status,
        category: campaign.category,
        approvedAt: campaign.approved_at
    });

    // Step 3: Invalidate cache AFTER DB is committed
    try {
        await invalidateCampaignCache(
            campaignId, 
            campaign.category, 
            requestId,
            campaign.creator?.toString() || campaign.creator // Handle both populated and ObjectId
        );
        console.log(`[Campaign Approval] Cache invalidated successfully`, {
            requestId,
            campaignId,
            category: campaign.category,
            creatorId: campaign.creator?.toString() || campaign.creator
        });
    } catch (cacheError) {
        // Log but don't fail - cache will be stale but DB is correct
        console.error(`[Campaign Approval] Cache invalidation failed (non-critical)`, {
            requestId,
            campaignId,
            error: cacheError.message
        });
    }

    return { 
        success: true, 
        campaign,
        requestId // Return for logging in controller
    };
}

export const rejectCampaign = async (campaignId, adminId, reason) => {
    if (!reason || reason.trim().length === 0) {
        return {
            success: false,
            error: 'MISSING_REASON',
            message: 'Rejection reason is required'
        };
    }

    // ✅ FIX: Sử dụng findOneAndUpdate với condition để đảm bảo atomic update, tránh race condition
    // Chỉ update nếu status là 'pending' (atomic check)
    const campaign = await Campaign.findOneAndUpdate(
        { 
            _id: campaignId,
            status: 'pending' // Atomic check - chỉ reject nếu đang pending
        },
        { 
            status: 'rejected',
            rejection_reason: reason,
            rejected_at: new Date(),
            rejected_by: adminId
        },
        { new: true }
    );

    if (!campaign) {
        // Campaign không tồn tại hoặc không ở trạng thái pending
        const existingCampaign = await Campaign.findById(campaignId);
        if (!existingCampaign) {
            return { success: false, error: 'NOT_FOUND' };
        }
        return {
            success: false,
            error: 'INVALID_STATUS',
            message: `Cannot reject campaign with status: ${existingCampaign.status}. Only pending campaigns can be rejected.`
        };
    }

    // Invalidate all campaign cache keys
    await invalidateCampaignCache(campaignId, campaign.category);

    return { success: true, campaign };
}

export const searchCampaignsByHashtag = async (hashtagName) => {
    const normalizedName = hashtagName.toLowerCase().trim();
    
    // Find hashtag
    const hashtag = await Hashtag.findOne({ name: normalizedName });
    if (!hashtag) {
        return [];
    }

    // Find campaigns with this hashtag, excluding pending, rejected, and cancelled campaigns
    const campaigns = await Campaign.find({ 
        hashtag: hashtag._id,
        status: { $nin: ['pending', 'rejected', 'cancelled'] }
    })
        .populate("creator", "username fullname avatar")
        .populate("hashtag", "name")
        .sort({ createdAt: -1 });

    return campaigns;
}

// Legacy function kept for backward compatibility
// Now uses the generic similarity utility
const calculateRelevanceScore = (title, searchTerm, searchWords, isActive) => {
    const bonus = isActive ? 50 : 0;
    return calculateSimilarityScore(title, searchTerm, searchWords, bonus);
};

export const searchCampaignsByTitle = async (searchTerm, limit = 50) => {
    if (!searchTerm || searchTerm.trim() === "") {
        return [];
    }

    const normalizedSearch = normalizeSearchTerm(searchTerm);
    const searchWords = splitSearchWords(normalizedSearch);
    
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    // Find all campaigns that match the search term, excluding pending, rejected, and cancelled campaigns
    const allCampaigns = await Campaign.find({
        title: searchRegex,
        status: { $nin: ['pending', 'rejected', 'cancelled'] }
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
    const populatedCampaigns = await Campaign.find({ 
        _id: { $in: campaignIds },
        status: { $nin: ['pending', 'rejected', 'cancelled'] }
    })
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

/**
 * Get campaigns with location data for map display
 * Only returns active campaigns that have location information
 */
export const getCampaignsForMap = async () => {
    const cacheKey = 'campaigns:map';

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query campaigns with location data and active status
    // Optimized: Use index and select only needed fields
    const campaigns = await Campaign.find({
        status: 'active',
        'location.latitude': { $exists: true, $ne: null },
        'location.longitude': { $exists: true, $ne: null }
    })
        .select('title location category current_amount goal_amount banner_image creator hashtag status')
        .populate("creator", "username fullname avatar")
        .populate("hashtag", "name")
        .lean(); // Already using lean()

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(campaigns));

    return campaigns;
}

/**
 * Get campaign statistics for map page
 * Returns counts of campaigns with location by status
 */
export const getCampaignMapStatistics = async () => {
    const cacheKey = 'campaigns:map:statistics';

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query all campaigns with location (not just active)
    const campaignsWithLocation = await Campaign.find({
        'location.latitude': { $exists: true, $ne: null },
        'location.longitude': { $exists: true, $ne: null }
    })
        .select('status current_amount goal_amount')
        .lean();

    // Calculate statistics
    const activeCount = campaignsWithLocation.filter(c => c.status === 'active').length;
    const completedCount = campaignsWithLocation.filter(c => c.current_amount >= c.goal_amount).length;
    const finishedCount = campaignsWithLocation.filter(c => 
        c.status === 'completed' || c.status === 'cancelled'
    ).length;

    const statistics = {
        active: activeCount,
        completed: completedCount,
        finished: finishedCount,
        total: campaignsWithLocation.length
    };

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(statistics));

    return statistics;
}
