import { Router } from "express";
import * as EscrowController from "../controllers/EscrowController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { checkOwner } from "../middlewares/checkOwner.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const escrowRoutes = Router();
const adminEscrowRoutes = Router();

escrowRoutes.post('/:escrowId/vote', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.submitVote);
escrowRoutes.get('/:escrowId/votes', RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.getVotesByEscrow);
escrowRoutes.get('/:escrowId', RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.getWithdrawalRequestById);
escrowRoutes.post('/:escrowId/release', authMiddleware, checkOwner, RateLimitMiddleware.rateLimitByIP(50, 60), EscrowController.releaseEscrow);

adminEscrowRoutes.get('/withdrawal-requests', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.getWithdrawalRequestsForReview);
adminEscrowRoutes.post('/withdrawal-requests/:escrowId/approve', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.approveWithdrawalRequest);
adminEscrowRoutes.post('/withdrawal-requests/:escrowId/reject', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), EscrowController.rejectWithdrawalRequest);
adminEscrowRoutes.post('/withdrawal-requests/:escrowId/extend-vote', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(50, 60), EscrowController.extendVotingPeriod);
adminEscrowRoutes.post('/withdrawal-requests/:escrowId/cancel-campaign', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(20, 60), EscrowController.cancelCampaignByCommunityRejection);

export { escrowRoutes, adminEscrowRoutes };
export default escrowRoutes;

