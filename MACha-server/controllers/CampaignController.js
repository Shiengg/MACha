import * as campaignService from "../services/campaign.service.js";
import * as escrowService from "../services/escrow.service.js";
import * as trackingService from "../services/tracking.service.js";
import * as queueService from "../services/queue.service.js";
import * as userService from "../services/user.service.js";
import * as recommendationService from "../services/recommendation.service.js";
import * as searchService from "../services/search.service.js";
import { createJob, JOB_TYPES, JOB_SOURCE } from "../schemas/job.schema.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import User from "../models/user.js";

export const getAllCampaigns = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;
        const userId = req.user?._id;
        const userRole = req.user?.role;
        
        // Admin và các role khác cần thấy tất cả campaigns (bao gồm pending)
        // nên skip recommendation service
        const isAdmin = userRole === 'admin';
        
        if (page === 0 && userId && !isAdmin) {
            try {
                const recommendationResult = await recommendationService.getRecommendedCampaigns(
                    userId.toString(),
                    limit
                );
                
                const total = await campaignService.getTotalCampaignsCount();
                
                return res.status(HTTP_STATUS.OK).json({ 
                    campaigns: recommendationResult.campaigns,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    isRecommended: true,
                    strategy: recommendationResult.strategy
                });
            } catch (recError) {
                console.error('Recommendation service failed, fallback to normal:', recError);
            }
        }
        
        // Admin, các trang sau, hoặc user chưa login: get bình thường (tất cả campaigns)
        const result = await campaignService.getCampaigns(page, limit, userId);
        res.status(HTTP_STATUS.OK).json({ 
            campaigns: result.campaigns,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
            isRecommended: false
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignById = async (req, res) => {
    try {
        const campaignId = req.params.id;
        const campaign = await campaignService.getCampaignById(campaignId);

        if (!campaign) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" })
        }

        // Track recently viewed campaign if user is authenticated
        if (req.user && req.user._id) {
            try {
                await userService.trackRecentlyViewedCampaign(req.user._id, campaignId);
            } catch (trackingError) {
                // Don't fail the request if tracking fails
                console.error('Error tracking recently viewed campaign:', trackingError);
            }
        }

        res.status(HTTP_STATUS.OK).json({ campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignsByCategory = async (req, res) => {
    try {
        const { category } = req.query;

        // Validate category
        if (!category) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Category parameter is required"
            });
        }

        const validCategories = [
            'children', 'elderly', 'poverty', 'disaster', 'medical',
            'education', 'disability', 'animal', 'environment', 'community', 'other'
        ];

        if (!validCategories.includes(category)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Invalid category",
                validCategories
            });
        }

        const campaigns = await campaignService.getCampaignsByCategory(category);

        res.status(HTTP_STATUS.OK).json({
            category,
            count: campaigns.length,
            campaigns
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getActiveCategories = async (req, res) => {
    try {
        const categories = await campaignService.getActiveCategories();
        res.status(HTTP_STATUS.OK).json({ categories });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignsByCreator = async (req, res) => {
    try {
        const creatorId = req.query.creatorId || req.user?._id;
        if (!creatorId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "creatorId is required" });
        }

        const campaigns = await campaignService.getCampaignsByCreator(creatorId);
        res.status(HTTP_STATUS.OK).json({
            count: campaigns.length,
            campaigns
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

/**
 * Get campaigns by creator with pagination
 * Supports permission-based filtering (owner sees all, public sees only active/completed/approved/voting)
 * 
 * Query params:
 * - creatorId (required): User ID of campaign creator
 * - page (optional, default: 1): Page number
 * - limit (optional, default: 10): Items per page (max: 50)
 */
export const getCampaignsByCreatorPagination = async (req, res) => {
    try {
        const creatorId = req.query.creatorId || req.params.userId;
        const viewerId = req.user?._id || null; // Current logged-in user (null if anonymous)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Validate creatorId
        if (!creatorId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: "creatorId is required" 
            });
        }
        
        // Validate pagination params
        if (page < 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: "page must be >= 1" 
            });
        }
        
        if (limit < 1 || limit > 50) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: "limit must be between 1 and 50" 
            });
        }
        
        const result = await campaignService.getCampaignsByCreatorWithPagination(
            creatorId,
            viewerId,
            page,
            limit
        );
        
        res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        console.error('[Campaign Controller] Error getting campaigns by creator:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message || 'Internal server error' 
        });
    }
}

export const searchCampaignsByHashtag = async (req, res) => {
    try {
        const { hashtag } = req.query;

        if (!hashtag) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Hashtag parameter is required"
            });
        }

        const campaigns = await campaignService.searchCampaignsByHashtag(hashtag);
        res.status(HTTP_STATUS.OK).json({
            hashtag,
            count: campaigns.length,
            campaigns
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const searchCampaignsByTitle = async (req, res) => {
    try {
        const { q, query, title, limit } = req.query;
        
        // Support multiple parameter names: q, query, title
        const searchTerm = q || query || title;

        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Search term is required"
            });
        }

        const limitNum = limit ? parseInt(limit) : 50;
        const campaigns = await campaignService.searchCampaignsByTitle(searchTerm, limitNum);
        
        // Save search history with type "keyword" (async, don't wait for it)
        // This tracks campaign searches separately from user searches (USER_SEARCH type)
        const userId = req.user?._id;
        if (userId) {
            searchService.saveSearchHistory(userId, searchTerm, "keyword")
                .catch(err => {
                    console.error('Error saving campaign search history:', err);
                    // Don't fail the request if history save fails
                });
        }
        
        res.status(HTTP_STATUS.OK).json({
            query: searchTerm,
            count: campaigns.length,
            campaigns
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignsForMap = async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaignsForMap();
        return res.status(HTTP_STATUS.OK).json({ campaigns });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const getCampaignMapStatistics = async (req, res) => {
    try {
        const statistics = await campaignService.getCampaignMapStatistics();
        return res.status(HTTP_STATUS.OK).json(statistics);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const createCampaign = async (req, res) => {
    try {
        if (req.user.role === 'user' && req.user.kyc_status !== 'verified') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "You need to complete KYC verification before creating a campaign",
                kyc_status: req.user.kyc_status,
                kyc_rejection_reason: req.user.kyc_rejection_reason
            });
        }

        if (req.user.role === 'organization' && req.user.kyc_status !== 'verified') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "Organization needs to complete KYC verification before creating a campaign",
                kyc_status: req.user.kyc_status,
                kyc_rejection_reason: req.user.kyc_rejection_reason
            });
        }

        const campaign = await campaignService.createCampaign({ ...req.body, creator: req.user._id });

        // Publish event và push job (không block response nếu fail)
        try {
            await trackingService.publishEvent("tracking:campaign:created", {
                campaignId: campaign._id,
                userId: req.user._id,
                title: campaign.title,
                goal_amount: campaign.goal_amount,
                current_amount: campaign.current_amount,
                start_date: campaign.start_date,
                end_date: campaign.end_date,
                status: campaign.status,
                proof_documents_url: campaign.proof_documents_url,
                category: campaign.category,
            });
            const job = createJob(
                JOB_TYPES.CAMPAIGN_CREATED,
                {
                    campaignId: campaign._id.toString(),
                    userId: req.user._id.toString()
                },
                {
                    userId: req.user._id.toString(),
                    source: JOB_SOURCE.API
                }
            );
            await queueService.pushJob(job);
        } catch (eventError) {
            console.error('Error publishing event or pushing job:', eventError);
        }

        return res.status(HTTP_STATUS.CREATED).json({ campaign });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
    }
}

export const updateCampaign = async (req, res) => {
    const requestId = `update-ctrl-${req.params.id}-${Date.now()}`;
    const campaignId = req.params.id;
    const userId = req.user._id;

    try {
        console.log(`[Campaign Update Controller] Starting update`, {
            requestId,
            campaignId,
            userId,
            payloadFields: Object.keys(req.body)
        });

        const result = await campaignService.updateCampaign(
            campaignId,
            userId,
            req.body,
            requestId
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Campaign not found"
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    message: HTTP_STATUS_TEXT.FORBIDDEN
                });
            }
            if (result.error === 'CANNOT_UPDATE_AFTER_DONATION') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message,
                    restrictedFields: result.restrictedFields
                });
            }
            if (result.error === 'INVALID_STATUS_CHANGE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
            if (result.error === 'CANNOT_CHANGE_STATUS_WHEN_PENDING') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
            if (result.error === 'STATUS_CHANGED_DURING_UPDATE' || result.error === 'CONCURRENT_UPDATE') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    message: result.message,
                    currentStatus: result.currentStatus
                });
            }
            if (result.error === 'UPDATE_FAILED') {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                    message: "Failed to update campaign. Please try again."
                });
            }

            // Fallback for unknown errors
            console.error(`[Campaign Update Controller] Unknown error`, {
                requestId,
                campaignId,
                error: result.error
            });
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: result.message || "Failed to update campaign"
            });
        }

        // Publish tracking event AFTER DB is committed and cache is invalidated
        try {
            const eventPayload = {
                campaignId: result.campaign._id,
                userId: userId,
                title: result.campaign.title,
                goal_amount: result.campaign.goal_amount,
                current_amount: result.campaign.current_amount,
                status: result.campaign.status,
                category: result.campaign.category,
                requestId: result.requestId || requestId,
                timestamp: new Date().toISOString(),
                // Add flag to indicate if this was a PENDING campaign update
                wasPending: result.campaign.status === 'pending' || req.body.status === 'pending'
            };

            // Publish specific event for PENDING updates
            if (result.campaign.status === 'pending') {
                await trackingService.publishEvent("tracking:campaign:updated:when:pending", {
                    ...eventPayload,
                    updatedFields: Object.keys(req.body)
                });
            }

            // Also publish general update event
            await trackingService.publishEvent("tracking:campaign:updated", eventPayload);

            console.log(`[Campaign Update Controller] Event published successfully`, {
                requestId,
                campaignId,
                status: result.campaign.status
            });
        } catch (error) {
            // Log but don't fail - event publishing is non-critical
            console.error(`[Campaign Update Controller] Error publishing event (non-critical)`, {
                requestId,
                campaignId,
                error: error.message
            });
        }

        console.log(`[Campaign Update Controller] Update completed successfully`, {
            requestId,
            campaignId,
            status: result.campaign.status
        });

        return res.status(HTTP_STATUS.OK).json({ 
            campaign: result.campaign 
        });
    } catch (error) {
        console.error(`[Campaign Update Controller] Unexpected error`, {
            requestId,
            campaignId,
            error: error.message,
            stack: error.stack
        });
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message 
        });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        const result = await campaignService.deleteCampaign(req.params.id, req.user._id);

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Campaign not found"
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    message: HTTP_STATUS_TEXT.FORBIDDEN
                });
            }
            if (result.error === 'CANNOT_DELETE_AFTER_DONATION') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message,
                    currentAmount: result.currentAmount
                });
            }
        }

        // Publish tracking event
        try {
            await trackingService.publishEvent("tracking:campaign:deleted", {
                campaignId: req.params.id,
                userId: req.user._id,
                category: result.campaign.category,
            });
        } catch (error) {
            console.error('Error publishing event:', error);
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Campaign deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const cancelCampaign = async (req, res) => {
    try {
        const { reason } = req.body;

        const result = await campaignService.cancelCampaign(
            req.params.id,
            req.user._id,
            reason
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Campaign not found"
                });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    message: HTTP_STATUS_TEXT.FORBIDDEN
                });
            }
            if (result.error === 'ALREADY_CANCELLED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
        }

        try {
            await trackingService.publishEvent("tracking:campaign:cancelled", {
                campaignId: result.campaign._id,
                userId: req.user._id,
                reason: reason || 'No reason provided',
                category: result.campaign.category,
            });
        } catch (error) {
            console.error('Error publishing event:', error);
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Campaign cancelled successfully",
            campaign: result.campaign
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getPendingCampaigns = async (req, res) => {
    try {
        const campaigns = await campaignService.getPendingCampaigns();
        res.status(HTTP_STATUS.OK).json({
            count: campaigns.length,
            campaigns
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const approveCampaign = async (req, res) => {
    const requestId = `approve-ctrl-${req.params.id}-${Date.now()}`;
    const adminId = req.user._id;
    const campaignId = req.params.id;

    try {
        console.log(`[Campaign Approval Controller] Starting approval`, {
            requestId,
            campaignId,
            adminId
        });

        // Step 1: Approve campaign (DB update + cache invalidation)
        const result = await campaignService.approveCampaign(
            campaignId,
            adminId
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Campaign not found"
                });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
        }

        // Step 2: Publish event AFTER DB is committed and cache is invalidated
        // This ensures event consumers see the correct state
        try {
            const eventPayload = {
                campaignId: result.campaign._id,
                adminId: adminId,
                creatorId: result.campaign.creator,
                title: result.campaign.title,
                category: result.campaign.category,
                approved_at: result.campaign.approved_at,
                oldStatus: 'pending',
                newStatus: 'active',
                requestId: result.requestId || requestId,
                timestamp: new Date().toISOString()
            };

            console.log(`[Campaign Approval Controller] Publishing event`, {
                requestId,
                campaignId,
                eventPayload
            });

            await trackingService.publishEvent("tracking:campaign:approved", eventPayload);

            console.log(`[Campaign Approval Controller] Event published successfully`, {
                requestId,
                campaignId
            });

            // Step 3: Push email job to queue
            const creator = await User.findById(result.campaign.creator).select('email username');
            const job = createJob(
                JOB_TYPES.CAMPAIGN_APPROVED,
                {
                    email: creator?.email || '',
                    username: creator?.username || '',
                    campaignTitle: result.campaign.title,
                    campaignId: result.campaign._id.toString(),
                    creatorId: result.campaign.creator.toString(),
                    adminId: adminId.toString()
                },
                {
                    userId: adminId.toString(),
                    source: JOB_SOURCE.ADMIN,
                    requestId
                }
            );
            await queueService.pushJob(job);

            console.log(`[Campaign Approval Controller] Job pushed to queue`, {
                requestId,
                campaignId,
                jobType: JOB_TYPES.CAMPAIGN_APPROVED
            });
        } catch (eventError) {
            // Log error but don't fail the request - DB is already updated
            console.error(`[Campaign Approval Controller] Error publishing event or pushing job (non-critical)`, {
                requestId,
                campaignId,
                error: eventError.message,
                stack: eventError.stack
            });
        }

        console.log(`[Campaign Approval Controller] Approval completed successfully`, {
            requestId,
            campaignId,
            wasAlreadyApproved: result.wasAlreadyApproved || false
        });

        return res.status(HTTP_STATUS.OK).json({
            message: "Campaign approved successfully",
            campaign: result.campaign
        });
    } catch (error) {
        console.error(`[Campaign Approval Controller] Unexpected error`, {
            requestId,
            campaignId,
            error: error.message,
            stack: error.stack
        });
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message 
        });
    }
};

export const rejectCampaign = async (req, res) => {
    try {
        const { reason } = req.body;

        const result = await campaignService.rejectCampaign(
            req.params.id,
            req.user._id,
            reason
        );

        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Campaign not found"
                });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
            if (result.error === 'MISSING_REASON') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: result.message
                });
            }
        }

        try {
            await trackingService.publishEvent("tracking:campaign:rejected", {
                campaignId: result.campaign._id,
                adminId: req.user._id,
                creatorId: result.campaign.creator,
                title: result.campaign.title,
                category: result.campaign.category,
                rejection_reason: reason,
                rejected_at: result.campaign.rejected_at
            });

            // Fetch creator data for email
            const creator = await User.findById(result.campaign.creator).select('email username');
            const job = createJob(
                JOB_TYPES.CAMPAIGN_REJECTED,
                {
                    email: creator?.email || '',
                    username: creator?.username || '',
                    campaignTitle: result.campaign.title,
                    campaignId: result.campaign._id.toString(),
                    creatorId: result.campaign.creator.toString(),
                    adminId: req.user._id.toString(),
                    reason: reason
                },
                {
                    userId: req.user._id.toString(),
                    source: JOB_SOURCE.ADMIN
                }
            );
            await queueService.pushJob(job);
        } catch (eventError) {
            console.error('Error publishing event or pushing job:', eventError);
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Campaign rejected successfully",
            campaign: result.campaign
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const createWithdrawalRequest = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user._id;

        const result = await escrowService.createWithdrawalRequest(
            campaignId,
            userId,
            req.body
        );

        if (!result.success) {
            // Map các error codes thành HTTP status codes
            const errorStatusMap = {
                "INVALID_AMOUNT": HTTP_STATUS.BAD_REQUEST,
                "MISSING_REASON": HTTP_STATUS.BAD_REQUEST,
                "CAMPAIGN_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "UNAUTHORIZED": HTTP_STATUS.FORBIDDEN,
                "CAMPAIGN_NOT_ACTIVE": HTTP_STATUS.BAD_REQUEST,
                "INSUFFICIENT_FUNDS": HTTP_STATUS.BAD_REQUEST,
                "PENDING_REQUEST_EXISTS": HTTP_STATUS.CONFLICT
            };

            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;

            return res.status(statusCode).json({
                message: result.message,
                error: result.error,
                ...(result.availableAmount !== undefined && { availableAmount: result.availableAmount }),
                ...(result.pendingRequestId !== undefined && { pendingRequestId: result.pendingRequestId })
            });
        }

        return res.status(HTTP_STATUS.CREATED).json({
            message: "Withdrawal request created successfully",
            escrow: result.escrow
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message || "Internal server error" 
        });
    }
};
