import * as escrowService from "../services/escrow.service.js";
import { HTTP_STATUS } from "../utils/status.js";

/**
 * Submit vote cho withdrawal request
 * POST /api/escrow/:escrowId/vote
 */
export const submitVote = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const userId = req.user._id;
        const { value } = req.body;

        if (!value) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Vote value (approve/reject) là bắt buộc"
            });
        }

        const result = await escrowService.submitVote(escrowId, userId, value);

        if (!result.success) {
            const errorStatusMap = {
                "INVALID_VOTE_VALUE": HTTP_STATUS.BAD_REQUEST,
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "VOTING_NOT_IN_PROGRESS": HTTP_STATUS.BAD_REQUEST,
                "VOTING_PERIOD_EXPIRED": HTTP_STATUS.BAD_REQUEST,
                "NOT_ELIGIBLE_TO_VOTE": HTTP_STATUS.FORBIDDEN
            };

            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;

            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: result.message || "Vote thành công",
            vote: result.vote
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};


export const getWithdrawalRequestsForReview = async (req, res) => {
    try {
        const { status } = req.query;
        const filterStatus = status || "voting_completed";
        
        const escrows = await escrowService.getWithdrawalRequestsForReview(filterStatus);
        
        return res.status(HTTP_STATUS.OK).json({
            escrows,
            count: escrows.length
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const approveWithdrawalRequest = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const adminId = req.user._id;
        
        const result = await escrowService.approveWithdrawalRequest(escrowId, adminId);
        
        if (!result.success) {
            const errorStatusMap = {
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "INVALID_STATUS": HTTP_STATUS.BAD_REQUEST,
                "PAYMENT_FAILED": HTTP_STATUS.INTERNAL_SERVER_ERROR
            };
            
            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;
            
            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: result.message,
            escrow: result.escrow
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const rejectWithdrawalRequest = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const adminId = req.user._id;
        const { rejection_reason } = req.body;
        
        if (!rejection_reason) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "rejection_reason là bắt buộc"
            });
        }
        
        const result = await escrowService.rejectWithdrawalRequest(escrowId, adminId, rejection_reason);
        
        if (!result.success) {
            const errorStatusMap = {
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "INVALID_STATUS": HTTP_STATUS.BAD_REQUEST,
                "MISSING_REJECTION_REASON": HTTP_STATUS.BAD_REQUEST
            };
            
            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;
            
            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: result.message,
            escrow: result.escrow
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const getWithdrawalRequestsByCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { status } = req.query;
        
        const escrows = await escrowService.getWithdrawalRequestsByCampaign(campaignId, status || null);
        
        return res.status(HTTP_STATUS.OK).json({
            escrows,
            count: escrows.length
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Lấy chi tiết một withdrawal request theo ID
 * GET /api/escrow/:escrowId
 */
export const getWithdrawalRequestById = async (req, res) => {
    try {
        const { escrowId } = req.params;
        
        const escrow = await escrowService.getWithdrawalRequestById(escrowId);
        
        if (!escrow) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Withdrawal request not found"
            });
        }
        
        return res.status(HTTP_STATUS.OK).json({
            escrow
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const getVotesByEscrow = async (req, res) => {
    try {
        const { escrowId } = req.params;
        
        const votes = await escrowService.getVotesByEscrow(escrowId);
        
        return res.status(HTTP_STATUS.OK).json({
            votes,
            count: votes.length
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Admin gia hạn thời gian vote cho escrow
 * POST /api/escrow/:escrowId/extend-vote
 */
export const extendVotingPeriod = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const adminId = req.user._id;
        const { extension_days } = req.body;
        
        if (!extension_days) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "extension_days (3 hoặc 5) là bắt buộc"
            });
        }
        
        const result = await escrowService.extendVotingPeriod(escrowId, adminId, extension_days);
        
        if (!result.success) {
            const errorStatusMap = {
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "INVALID_STATUS": HTTP_STATUS.BAD_REQUEST,
                "INVALID_EXTENSION_DAYS": HTTP_STATUS.BAD_REQUEST
            };
            
            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;
            
            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: `Thời gian vote đã được gia hạn thêm ${extension_days} ngày`,
            escrow: result.escrow,
            newEndDate: result.newEndDate,
            extensionDays: result.extensionDays,
            extendedCount: result.extendedCount
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Owner release escrow với bill giải ngân bắt buộc
 * POST /api/escrow/:escrowId/release
 */
export const releaseEscrow = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const ownerId = req.user._id;
        const { disbursement_proof_images, disbursement_note } = req.body;
        
        // Validate required fields
        if (!disbursement_proof_images || !Array.isArray(disbursement_proof_images) || disbursement_proof_images.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Bill giải ngân là bắt buộc. Vui lòng upload ít nhất 1 ảnh bill.",
                error: "MISSING_PROOF_IMAGES"
            });
        }
        
        const result = await escrowService.releaseEscrow(escrowId, ownerId, {
            disbursement_proof_images,
            disbursement_note
        });
        
        if (!result.success) {
            const errorStatusMap = {
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "INVALID_STATUS": HTTP_STATUS.BAD_REQUEST,
                "UNAUTHORIZED": HTTP_STATUS.FORBIDDEN,
                "MISSING_PROOF_IMAGES": HTTP_STATUS.BAD_REQUEST,
                "INVALID_IMAGE_URL": HTTP_STATUS.BAD_REQUEST,
                "TOO_MANY_IMAGES": HTTP_STATUS.BAD_REQUEST,
                "NOTE_TOO_LONG": HTTP_STATUS.BAD_REQUEST,
                "ALREADY_RELEASED": HTTP_STATUS.BAD_REQUEST,
                "PROOF_ALREADY_EXISTS": HTTP_STATUS.BAD_REQUEST,
                "CAMPAIGN_NOT_FOUND": HTTP_STATUS.NOT_FOUND
            };
            
            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;
            
            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: result.message,
            escrow: result.escrow
        });
    } catch (error) {
        console.error('[Release Escrow] Error:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

/**
 * Admin huỷ campaign do bị từ chối bởi cộng đồng và khởi tạo refund
 * POST /api/escrow/:escrowId/cancel-campaign
 */
export const cancelCampaignByCommunityRejection = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const adminId = req.user._id;
        
        const result = await escrowService.cancelCampaignByCommunityRejection(escrowId, adminId);
        
        if (!result.success) {
            const errorStatusMap = {
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "INVALID_STATUS": HTTP_STATUS.BAD_REQUEST
            };
            
            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;
            
            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: "Campaign đã bị huỷ và refund đã được khởi tạo",
            campaign: result.campaign,
            refund: result.refund,
            wasAlreadyCancelled: result.wasAlreadyCancelled || false,
            warning: result.warning || null
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

