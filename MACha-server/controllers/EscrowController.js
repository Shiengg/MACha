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

